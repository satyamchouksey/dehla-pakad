import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './socket/handlers';
import { connectDB } from './config/db';
import { verifyGoogleToken, createJWT } from './auth/google';
import { UserModel } from './models/User';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

// Parse CLIENT_URL (supports comma-separated origins)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim().replace(/\/$/, ''))
  : null;

console.log('[CORS] CLIENT_URL:', process.env.CLIENT_URL);
console.log('[CORS] Allowed origins:', allowedOrigins || '* (all)');

// CORS origin handler - allows all if no CLIENT_URL set
const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
  // Allow requests with no origin (mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);
  // No CLIENT_URL set — allow everything
  if (!allowedOrigins) return callback(null, true);
  // Check if origin matches
  if (allowedOrigins.includes(origin)) return callback(null, true);
  console.warn(`[CORS] Blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
  return callback(null, true); // Allow anyway for now, log for debugging
};

app.use(cors({
  origin: corsOriginHandler,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Google Auth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'Missing idToken' });
      return;
    }

    const userInfo = await verifyGoogleToken(idToken);
    if (!userInfo) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    // Upsert user in DB
    const user = await UserModel.findOneAndUpdate(
      { googleId: userInfo.googleId },
      {
        googleId: userInfo.googleId,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        lastSeen: new Date(),
      },
      { upsert: true, new: true }
    );

    const token = createJWT(userInfo.googleId, userInfo.email, userInfo.name);

    res.json({
      token,
      user: {
        googleId: userInfo.googleId,
        name: userInfo.name,
        email: userInfo.email,
        avatar: user.avatar,
        picture: userInfo.picture,
      },
    });
  } catch (err) {
    console.error('[Auth] Error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Register socket handlers
registerSocketHandlers(io, roomManager);

// Cleanup stale rooms every 30 minutes
setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 1800000);

// Start server
async function start() {
  await connectDB();
  await roomManager.restoreRooms();

  httpServer.listen(PORT, () => {
    console.log(`🃏 Dehla Pakad server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
