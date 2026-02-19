import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  ClientGameState,
} from '../../../shared/types';
import { RoomManager } from '../rooms/RoomManager';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(
  io: TypedServer,
  roomManager: RoomManager
): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('room:create', ({ playerName, avatar }) => {
      const room = roomManager.createRoom(socket.id, playerName, avatar);
      socket.join(room.code);
      socket.emit('room:created', {
        roomCode: room.code,
        seatIndex: 0,
        players: room.players,
      });
      console.log(`[Room] Created ${room.code} by ${playerName}`);
    });

    socket.on('room:join', ({ roomCode, playerName, avatar }) => {
      const result = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, playerName, avatar);

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

    socket.on('room:reconnect', ({ roomCode, playerId }) => {
      const result = roomManager.handleReconnect(roomCode, playerId, socket.id);

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

    socket.on('disconnect', () => {
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
  _roomManager: RoomManager
): void {
  if (!room || !room.engine) return;

  for (const player of room.players) {
    const socketId = room.playerSocketMap.get(player.seatIndex);
    if (socketId) {
      const clientState = room.engine.getClientState(player.seatIndex);
      io.to(socketId).emit('game:stateUpdate', clientState);
    }
  }
}
