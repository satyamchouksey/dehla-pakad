import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: GameSocket | null = null;

function getAuthToken(): string | null {
  return localStorage.getItem('dp_token');
}

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        token: getAuthToken(),
      },
    });
  }
  return socket;
}

export function connectSocket(): GameSocket {
  const s = getSocket();
  // Update auth token before connecting
  s.auth = { token: getAuthToken() };
  if (!s.connected) {
    console.log('[Socket] Connecting to', SERVER_URL);
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function resetSocket(): void {
  disconnectSocket();
}
