import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  ClientGameState,
} from '../../../shared/types';
import { RoomManager } from '../rooms/RoomManager';
import { verifyJWT } from '../auth/google';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function getGoogleId(socket: TypedSocket): string | null {
  const token = socket.handshake.auth?.token;
  if (!token) return null;
  const payload = verifyJWT(token);
  return payload?.googleId || null;
}

// Track voice chat participants per room: roomCode -> Set<socketId>
const voiceRooms = new Map<string, Set<string>>();

export function registerSocketHandlers(
  io: TypedServer,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: TypedSocket) => {
    const googleId = getGoogleId(socket);
    if (!googleId) {
      console.log(`[Socket] Unauthenticated connection rejected: ${socket.id}`);
      socket.emit('game:error', { message: 'Authentication required. Please sign in.' });
      socket.disconnect();
      return;
    }
    console.log(`[Socket] Connected: ${socket.id} (user: ${googleId})`);

    socket.on('room:create', ({ playerName, avatar }) => {
      const room = roomManager.createRoom(socket.id, googleId, playerName, avatar);
      socket.join(room.code);
      socket.emit('room:created', {
        roomCode: room.code,
        seatIndex: 0,
        players: room.players,
      });
      console.log(`[Room] Created ${room.code} by ${playerName}`);
    });

    socket.on('room:join', ({ roomCode, playerName, avatar }) => {
      const result = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, googleId, playerName, avatar);

      if ('error' in result) {
        socket.emit('game:error', { message: result.error });
        return;
      }

      const { room, seatIndex } = result;
      socket.join(room.code);

      // Tell the joining player about the room
      socket.emit('room:joined', {
        roomCode: room.code,
        seatIndex,
        players: room.players,
      });

      // Tell others about the new player
      socket.to(room.code).emit('room:playerJoined', {
        player: room.players[seatIndex],
        players: room.players,
      });

      console.log(`[Room] ${playerName} joined ${room.code} at seat ${seatIndex}`);
    });

    socket.on('game:start', () => {
      const roomCode = roomManager.getRoomCodeBySocket(socket.id);
      if (!roomCode) {
        socket.emit('game:error', { message: 'Not in a room' });
        return;
      }

      const result = roomManager.startGame(roomCode);
      if ('error' in result) {
        socket.emit('game:error', { message: result.error });
        return;
      }

      const engine = result;
      const room = roomManager.getRoom(roomCode)!;

      // Send each player their own view of the game state
      for (const player of room.players) {
        const socketId = room.playerSocketMap.get(player.seatIndex);
        if (socketId) {
          const clientState = engine.getClientState(player.seatIndex);
          io.to(socketId).emit('game:started', clientState);
        }
      }

      console.log(`[Game] Started in room ${roomCode}`);
    });

    socket.on('game:playCard', ({ cardId }) => {
      const roomCode = roomManager.getRoomCodeBySocket(socket.id);
      if (!roomCode) {
        socket.emit('game:error', { message: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.engine) {
        socket.emit('game:error', { message: 'No active game' });
        return;
      }

      const seatIndex = roomManager.getSeatBySocket(socket.id);
      if (seatIndex === undefined) {
        socket.emit('game:error', { message: 'Player not found' });
        return;
      }

      const result = room.engine.playCard(seatIndex, cardId);

      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Invalid move' });
        return;
      }

      // Broadcast the card played to all players
      const playedCard = room.engine.getState().currentTrick.slice(-1)[0]?.card;
      if (!result.trickComplete && playedCard) {
        io.to(roomCode).emit('game:cardPlayed', {
          playerIndex: seatIndex,
          card: playedCard,
        });
      }

      if (result.trickComplete && result.trickCards) {
        // Broadcast trick result
        const winnerName = room.players[result.trickWinner!]?.name || 'Unknown';

        // First send the last card played
        const lastCard = result.trickCards[result.trickCards.length - 1];
        io.to(roomCode).emit('game:cardPlayed', {
          playerIndex: lastCard.playerIndex,
          card: lastCard.card,
        });

        // Then send trick won after a delay (client handles animation timing)
        io.to(roomCode).emit('game:trickWon', {
          winnerIndex: result.trickWinner!,
          winnerName,
          cards: result.trickCards,
          capturedTens: room.engine.getState().capturedTens,
        });

        if (result.roundComplete) {
          const state = room.engine.getState();
          io.to(roomCode).emit('game:roundEnd', {
            capturedTens: state.capturedTens,
            tricksWon: state.tricksWon,
            matchScores: state.matchScores,
            roundWinner: result.roundWinner || null,
            isKot: result.isKot || false,
          });

          if (result.matchComplete && result.matchWinner) {
            io.to(roomCode).emit('game:matchEnd', {
              winner: result.matchWinner,
              matchScores: state.matchScores,
            });
          }
        }
      }

      // Send updated game state to each player
      broadcastGameState(io, room, roomManager);
    });

    socket.on('game:newRound', () => {
      const roomCode = roomManager.getRoomCodeBySocket(socket.id);
      if (!roomCode) return;

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.engine) return;

      const phase = room.engine.getPhase();
      if (phase !== 'roundEnd') return;

      room.engine.startRound();
      broadcastGameState(io, room, roomManager);
      console.log(`[Game] New round started in ${roomCode}`);
    });

    socket.on('room:reconnect', ({ roomCode }) => {
      const result = roomManager.handleReconnect(roomCode, googleId, socket.id);

      if ('error' in result) {
        socket.emit('game:error', { message: result.error });
        return;
      }

      const { room, seatIndex } = result;
      socket.join(room.code);

      let gameState: ClientGameState | null = null;
      if (room.engine) {
        gameState = room.engine.getClientState(seatIndex);
      }

      socket.emit('player:reconnected', { playerIndex: seatIndex, gameState });
      socket.to(room.code).emit('room:playerJoined', {
        player: room.players[seatIndex],
        players: room.players,
      });

      console.log(`[Socket] Player ${seatIndex} reconnected to ${room.code}`);
    });

    socket.on('room:history', async () => {
      const rooms = await roomManager.getRoomHistory(googleId);
      socket.emit('room:history', { rooms });
    });

    // ---- Voice Chat Signaling ----

    socket.on('voice:join', () => {
      const roomCode = roomManager.getRoomCodeBySocket(socket.id);
      if (!roomCode) return;

      const seatIndex = roomManager.getSeatBySocket(socket.id);
      if (seatIndex === undefined) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const playerName = room.players[seatIndex]?.name || 'Unknown';

      // Initialize voice room set if needed
      if (!voiceRooms.has(roomCode)) {
        voiceRooms.set(roomCode, new Set());
      }
      const voiceSet = voiceRooms.get(roomCode)!;

      // Send existing voice peers to the joining user
      const existingPeers: { peerId: string; seatIndex: number; name: string }[] = [];
      for (const peerId of voiceSet) {
        const peerSeat = roomManager.getSeatBySocket(peerId);
        if (peerSeat !== undefined) {
          const peerName = room.players[peerSeat]?.name || 'Unknown';
          existingPeers.push({ peerId, seatIndex: peerSeat, name: peerName });
        }
      }
      socket.emit('voice:peers', { peers: existingPeers });

      // Add to voice room
      voiceSet.add(socket.id);

      // Notify others in the room
      socket.to(roomCode).emit('voice:joined', {
        peerId: socket.id,
        seatIndex,
        name: playerName,
      });

      console.log(`[Voice] ${playerName} joined voice in ${roomCode}`);
    });

    socket.on('voice:leave', () => {
      const roomCode = roomManager.getRoomCodeBySocket(socket.id);
      if (!roomCode) return;

      const seatIndex = roomManager.getSeatBySocket(socket.id);
      const voiceSet = voiceRooms.get(roomCode);
      if (voiceSet) {
        voiceSet.delete(socket.id);
        if (voiceSet.size === 0) voiceRooms.delete(roomCode);
      }

      socket.to(roomCode).emit('voice:left', {
        peerId: socket.id,
        seatIndex: seatIndex ?? -1,
      });

      console.log(`[Voice] Seat ${seatIndex} left voice in ${roomCode}`);
    });

    socket.on('voice:signal', ({ to, signal, type }) => {
      // Relay WebRTC signaling data to the target peer
      io.to(to).emit('voice:signal', {
        from: socket.id,
        to,
        signal,
        type,
      });
    });

    // ---- Disconnect ----

    socket.on('disconnect', () => {
      // Clean up voice chat
      const roomCodeForVoice = roomManager.getRoomCodeBySocket(socket.id);
      if (roomCodeForVoice) {
        const voiceSet = voiceRooms.get(roomCodeForVoice);
        if (voiceSet && voiceSet.has(socket.id)) {
          voiceSet.delete(socket.id);
          if (voiceSet.size === 0) voiceRooms.delete(roomCodeForVoice);

          const seatIdx = roomManager.getSeatBySocket(socket.id);
          socket.to(roomCodeForVoice).emit('voice:left', {
            peerId: socket.id,
            seatIndex: seatIdx ?? -1,
          });
        }
      }

      const result = roomManager.handleDisconnect(socket.id);
      if (result) {
        const { room, seatIndex } = result;
        socket.to(room.code).emit('room:playerLeft', {
          playerIndex: seatIndex,
          players: room.players,
        });
        console.log(`[Socket] Player ${seatIndex} disconnected from ${room.code}`);
      }
    });
  });
}

function broadcastGameState(
  io: TypedServer,
  room: ReturnType<RoomManager['getRoom']>,
  roomManager: RoomManager
): void {
  if (!room || !room.engine) return;

  for (const player of room.players) {
    const socketId = room.playerSocketMap.get(player.seatIndex);
    if (socketId) {
      const clientState = room.engine.getClientState(player.seatIndex);
      io.to(socketId).emit('game:stateUpdate', clientState);
    }
  }

  // Persist game state to DB after each update
  roomManager.persistGameState(room.code);
}
