import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './socket/handlers';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
app.use(cors());
app.use(express.json());

// Serve client build in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: 0 });
});

// Register socket handlers
registerSocketHandlers(io, roomManager);

// SPA fallback — serve index.html for all non-API, non-socket routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Cleanup stale rooms every 30 minutes
setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 1800000);

httpServer.listen(PORT, () => {
  console.log(`🃏 Dehla Pakad server running on port ${PORT}`);
});
