import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set — running without persistence');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
