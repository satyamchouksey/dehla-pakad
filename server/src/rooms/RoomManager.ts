import { Player, Team, GameState } from '../../../shared/types';
import { GameEngine } from '../game/GameEngine';
import { RoomModel } from '../models/Room';
import { isDBConnected } from '../config/db';

export interface Room {
  code: string;
  players: Player[];
  engine: GameEngine | null;
  lockedPlayerIds: string[];
  playerSocketMap: Map<number, string>; // seatIndex -> socketId
  socketPlayerMap: Map<string, number>; // socketId -> seatIndex
  createdAt: number;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // socketId -> roomCode

  // Persist room to MongoDB (fire-and-forget)
  private async persistRoom(room: Room): Promise<void> {
    if (!isDBConnected()) return;
    try {
      const gameState = room.engine ? room.engine.getSerializableState() : null;
      const status = room.engine
        ? (room.engine.getPhase() === 'matchEnd' ? 'finished' : 'playing')
        : 'waiting';

      await RoomModel.findOneAndUpdate(
        { code: room.code },
        {
          code: room.code,
          status,
          players: room.players.map(p => ({
            googleId: p.googleId,
            name: p.name,
            seatIndex: p.seatIndex,
            avatar: p.avatar,
          })),
          lockedPlayerIds: room.lockedPlayerIds,
          gameState,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[RoomManager] Failed to persist room:', err);
    }
  }

  // Restore active rooms from MongoDB on server restart
  async restoreRooms(): Promise<void> {
    if (!isDBConnected()) return;
    try {
      const dbRooms = await RoomModel.find({ status: { $in: ['waiting', 'playing'] } });
      for (const dbRoom of dbRooms) {
        const players: Player[] = dbRoom.players.map(p => ({
          id: '',
          googleId: p.googleId,
          name: p.name,
          seatIndex: p.seatIndex,
          team: (p.seatIndex % 2 === 0 ? 'A' : 'B') as Team,
          connected: false,
          avatar: p.avatar,
        }));

        let engine: GameEngine | null = null;
        if (dbRoom.gameState && dbRoom.status === 'playing') {
          try {
            engine = GameEngine.fromState(dbRoom.gameState as unknown as GameState);
          } catch (err) {
            console.error(`[RoomManager] Failed to restore game engine for ${dbRoom.code}:`, err);
          }
        }

        const room: Room = {
          code: dbRoom.code,
          players,
          engine,
          lockedPlayerIds: dbRoom.lockedPlayerIds || [],
          playerSocketMap: new Map(),
          socketPlayerMap: new Map(),
          createdAt: dbRoom.createdAt.getTime(),
        };

        this.rooms.set(dbRoom.code, room);
      }
      console.log(`[RoomManager] Restored ${dbRooms.length} rooms from DB`);
    } catch (err) {
      console.error('[RoomManager] Failed to restore rooms:', err);
    }
  }

  createRoom(socketId: string, googleId: string, playerName: string, avatar: number): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const player: Player = {
      id: socketId,
      googleId,
      name: playerName,
      seatIndex: 0,
      team: 'A',
      connected: true,
      avatar,
    };

    const room: Room = {
      code,
      players: [player],
      engine: null,
      lockedPlayerIds: [],
      playerSocketMap: new Map([[0, socketId]]),
      socketPlayerMap: new Map([[socketId, 0]]),
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.playerRoomMap.set(socketId, code);
    this.persistRoom(room);

    return room;
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    googleId: string,
    playerName: string,
    avatar: number
  ): { room: Room; seatIndex: number } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }

    // If game is in progress, only locked players can rejoin
    if (room.engine && room.engine.getPhase() !== 'waiting') {
      return this.handleReconnect(roomCode, googleId, socketId);
    }

    // Check if this user is already in the room
    const existingPlayer = room.players.find(p => p.googleId === googleId);
    if (existingPlayer) {
      // Reconnect existing player
      existingPlayer.id = socketId;
      existingPlayer.connected = true;
      room.playerSocketMap.set(existingPlayer.seatIndex, socketId);
      room.socketPlayerMap.set(socketId, existingPlayer.seatIndex);
      this.playerRoomMap.set(socketId, roomCode);
      this.persistRoom(room);
      return { room, seatIndex: existingPlayer.seatIndex };
    }

    if (room.players.length >= 4) {
      return { error: 'Room is full' };
    }

    const seatIndex = room.players.length;
    const team: Team = seatIndex % 2 === 0 ? 'A' : 'B';

    const player: Player = {
      id: socketId,
      googleId,
      name: playerName,
      seatIndex,
      team,
      connected: true,
      avatar,
    };

    room.players.push(player);
    room.playerSocketMap.set(seatIndex, socketId);
    room.socketPlayerMap.set(socketId, seatIndex);
    this.playerRoomMap.set(socketId, roomCode);
    this.persistRoom(room);

    return { room, seatIndex };
  }

  startGame(roomCode: string): GameEngine | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }
    if (room.players.length !== 4) {
      return { error: 'Need exactly 4 players to start' };
    }

    const engine = new GameEngine(room.players);
    engine.startRound();
    room.engine = engine;

    // Lock room to current players
    room.lockedPlayerIds = room.players.map(p => p.googleId);

    this.persistRoom(room);
    return engine;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  getRoomCodeBySocket(socketId: string): string | undefined {
    return this.playerRoomMap.get(socketId);
  }

  getSeatBySocket(socketId: string): number | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room) return undefined;
    return room.socketPlayerMap.get(socketId);
  }

  // Get rooms a user has participated in (for history)
  async getRoomHistory(googleId: string): Promise<any[]> {
    if (!isDBConnected()) return [];
    try {
      const rooms = await RoomModel.find({
        'players.googleId': googleId,
        status: { $in: ['waiting', 'playing'] },
      })
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      return rooms.map(r => ({
        roomCode: r.code,
        status: r.status,
        players: r.players.map(p => ({ name: p.name, googleId: p.googleId, seatIndex: p.seatIndex })),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error('[RoomManager] Failed to get room history:', err);
      return [];
    }
  }

  handleDisconnect(socketId: string): { room: Room; seatIndex: number } | null {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const seatIndex = room.socketPlayerMap.get(socketId);
    if (seatIndex === undefined) return null;

    // Mark player as disconnected (don't remove them)
    room.players[seatIndex].connected = false;
    room.socketPlayerMap.delete(socketId);
    this.playerRoomMap.delete(socketId);

    if (room.engine) {
      room.engine.updatePlayerConnection(seatIndex, false);
    }

    // If no game is running and all players disconnected, clean up room
    if (!room.engine) {
      const connectedCount = room.players.filter(p => p.connected).length;
      if (connectedCount === 0) {
        this.rooms.delete(roomCode);
        this.markRoomFinished(roomCode);
      }
    }

    this.persistRoom(room);
    return { room, seatIndex };
  }

  handleReconnect(
    roomCode: string,
    googleId: string,
    newSocketId: string
  ): { room: Room; seatIndex: number } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }

    // Find player by googleId
    const playerIndex = room.players.findIndex(p => p.googleId === googleId);
    if (playerIndex === -1) {
      // If game is in progress, only locked players can rejoin
      if (room.lockedPlayerIds.length > 0 && !room.lockedPlayerIds.includes(googleId)) {
        return { error: 'Game in progress. Only original players can rejoin.' };
      }
      return { error: 'Player not found in room' };
    }

    const seatIndex = room.players[playerIndex].seatIndex;

    // Update socket mappings
    room.players[playerIndex].id = newSocketId;
    room.players[playerIndex].connected = true;
    room.playerSocketMap.set(seatIndex, newSocketId);
    room.socketPlayerMap.set(newSocketId, seatIndex);
    this.playerRoomMap.set(newSocketId, roomCode);

    if (room.engine) {
      room.engine.updatePlayerConnection(seatIndex, true);
    }

    this.persistRoom(room);
    return { room, seatIndex };
  }

  // Persist game state after each move
  persistGameState(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      this.persistRoom(room);
    }
  }

  private async markRoomFinished(roomCode: string): Promise<void> {
    if (!isDBConnected()) return;
    try {
      await RoomModel.findOneAndUpdate(
        { code: roomCode },
        { status: 'finished', updatedAt: new Date() }
      );
    } catch (err) {
      console.error('[RoomManager] Failed to mark room finished:', err);
    }
  }

  cleanupStaleRooms(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs) {
        // Clean up all socket mappings
        for (const socketId of room.socketPlayerMap.keys()) {
          this.playerRoomMap.delete(socketId);
        }
        this.rooms.delete(code);
        this.markRoomFinished(code);
      }
    }
  }
}
