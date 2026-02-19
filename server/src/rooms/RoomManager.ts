import { Player, Team } from '../../../shared/types';
import { GameEngine } from '../game/GameEngine';

export interface Room {
  code: string;
  players: Player[];
  engine: GameEngine | null;
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

  createRoom(socketId: string, playerName: string, avatar: number): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const player: Player = {
      id: socketId,
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
      playerSocketMap: new Map([[0, socketId]]),
      socketPlayerMap: new Map([[socketId, 0]]),
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.playerRoomMap.set(socketId, code);

    return room;
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
    avatar: number
  ): { room: Room; seatIndex: number } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }
    if (room.players.length >= 4) {
      return { error: 'Room is full' };
    }
    if (room.engine && room.engine.getPhase() !== 'waiting') {
      return { error: 'Game already in progress' };
    }

    const seatIndex = room.players.length;
    const team: Team = seatIndex % 2 === 0 ? 'A' : 'B';

    const player: Player = {
      id: socketId,
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
      }
    }

    return { room, seatIndex };
  }

  handleReconnect(
    roomCode: string,
    playerId: string,
    newSocketId: string
  ): { room: Room; seatIndex: number } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }

    // Find player by original ID
    const playerIndex = room.players.findIndex(p => p.id === playerId || p.name === playerId);
    if (playerIndex === -1) {
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

    return { room, seatIndex };
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
      }
    }
  }
}
