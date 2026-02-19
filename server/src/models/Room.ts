import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomPlayer {
  googleId: string;
  name: string;
  seatIndex: number;
  avatar: number;
}

export interface IRoom extends Document {
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  players: IRoomPlayer[];
  lockedPlayerIds: string[];
  gameState: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>({
  googleId: { type: String, required: true },
  name: { type: String, required: true },
  seatIndex: { type: Number, required: true },
  avatar: { type: Number, default: 0 },
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
  code: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  players: { type: [RoomPlayerSchema], default: [] },
  lockedPlayerIds: { type: [String], default: [] },
  gameState: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RoomSchema.index({ 'players.googleId': 1 });
RoomSchema.index({ status: 1, updatedAt: -1 });

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
