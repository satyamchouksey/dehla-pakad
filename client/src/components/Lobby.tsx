import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { AVATARS } from '@/lib/cards';

interface LobbyProps {
  onCreateRoom: (name: string, avatar: number) => void;
  onJoinRoom: (code: string, name: string, avatar: number) => void;
  onStartGame: () => void;
}

export function Lobby({ onCreateRoom, onJoinRoom, onStartGame }: LobbyProps) {
  const { screen, roomCode, players, mySeatIndex } = useGameStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const isHost = mySeatIndex === 0;
  const canStart = players.length === 4;

  if (screen === 'lobby' && roomCode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-6 sm:p-8 max-w-md w-full mx-4 space-y-6"
      >
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-gold">Waiting Room</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-white/60 text-sm">Room Code:</span>
            <span className="font-mono text-xl font-bold text-white tracking-widest bg-white/10 px-3 py-1 rounded">
              {roomCode}
            </span>
          </div>
          <p className="text-white/40 text-xs">Share this code with your friends</p>
        </div>

        <div className="space-y-3">
          <div className="text-white/60 text-sm">
            Players ({players.length}/4)
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((seat) => {
              const player = players[seat];
              const isMe = seat === mySeatIndex;
              const team = seat % 2 === 0 ? 'A' : 'B';
              return (
                <motion.div
                  key={seat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: seat * 0.1 }}
                  className={`p-3 rounded-lg border transition-all ${
                    player
                      ? isMe
                        ? 'bg-gold/10 border-gold/30'
                        : 'bg-white/5 border-white/10'
                      : 'bg-white/5 border-white/5 border-dashed'
                  }`}
                >
                  {player ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{AVATARS[player.avatar] || '🎭'}</span>
                      <div>
                        <div className="text-sm font-medium text-white truncate max-w-[80px]">
                          {player.name} {isMe && '(You)'}
                        </div>
                        <div className="text-[0.6rem] text-white/40">
                          Team {team} • Seat {seat + 1}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/20">
                      <span className="text-xl">👤</span>
                      <div>
                        <div className="text-sm">Waiting...</div>
                        <div className="text-[0.6rem]">Team {team} • Seat {seat + 1}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-xs text-white/30 space-y-1">
          <div>Teams: Seat 1 & 3 (Team A) vs Seat 2 & 4 (Team B)</div>
          <div>Partners sit across from each other</div>
        </div>

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              canStart
                ? 'btn-primary'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {canStart ? 'Start Game' : `Waiting for ${4 - players.length} more player(s)...`}
          </button>
        )}

        {!isHost && (
          <div className="text-center text-white/40 text-sm animate-pulse">
            Waiting for host to start the game...
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 sm:p-8 max-w-md w-full mx-4 space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gold text-shadow-lg">
          Dehla Pakad
        </h1>
        <p className="text-white/50 text-sm">The Classic Indian Card Game</p>
        <div className="flex justify-center gap-2 text-2xl">
          <span>♠</span><span className="text-red-500">♥</span>
          <span>♣</span><span className="text-red-500">♦</span>
        </div>
      </div>

      {mode === 'menu' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <button onClick={() => setMode('create')} className="btn-primary w-full text-lg">
            Create Room
          </button>
          <button onClick={() => setMode('join')} className="btn-secondary w-full text-lg">
            Join Room
          </button>
        </motion.div>
      )}

      {(mode === 'create' || mode === 'join') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="text-white/60 text-sm block mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-field"
              maxLength={15}
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="text-white/60 text-sm block mb-1">Room Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-letter code"
                className="input-field font-mono tracking-widest text-center text-lg"
                maxLength={6}
              />
            </div>
          )}

          <div>
            <label className="text-white/60 text-sm block mb-2">Choose Avatar</label>
            <div className="flex gap-2 justify-center flex-wrap">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setAvatar(i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl
                    transition-all ${
                      avatar === i
                        ? 'bg-gold/30 border-2 border-gold scale-110'
                        : 'bg-white/10 border border-white/10 hover:bg-white/20'
                    }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode('menu')}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!name.trim()) return;
                if (mode === 'create') {
                  onCreateRoom(name.trim(), avatar);
                } else {
                  if (!code.trim()) return;
                  onJoinRoom(code.trim(), name.trim(), avatar);
                }
              }}
              disabled={!name.trim() || (mode === 'join' && !code.trim())}
              className="btn-primary flex-1"
            >
              {mode === 'create' ? 'Create' : 'Join'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
