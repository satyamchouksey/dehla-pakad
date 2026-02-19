import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Player } from '@shared/types';
import { PlayingCard } from './PlayingCard';
import { AVATARS } from '@/lib/cards';

interface PlayerSeatProps {
  player: Player | undefined;
  isCurrentTurn: boolean;
  isDealer: boolean;
  cardCount: number;
  position: 'top' | 'left' | 'right';
  isPartner: boolean;
}

function PlayerSeatInner({
  player,
  isCurrentTurn,
  isDealer,
  cardCount,
  position,
  isPartner,
}: PlayerSeatProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-40">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm sm:text-lg">
          ?
        </div>
        <span className="text-[0.6rem] sm:text-xs text-white/40">Empty</span>
      </div>
    );
  }

  const cardsToShow = Math.min(cardCount, 4);

  return (
    <div className={`flex flex-col items-center gap-1 sm:gap-2 ${!player.connected ? 'opacity-50' : ''}`}>
      {/* Player info */}
      <motion.div
        animate={isCurrentTurn ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={isCurrentTurn ? { repeat: Infinity, duration: 1.5 } : {}}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all
          ${isCurrentTurn ? 'bg-gold/20 border border-gold/50 shadow-glow' : 'glass'}
          ${isPartner ? 'ring-1 ring-green-400/30' : ''}
        `}
      >
        <span className="text-sm sm:text-lg">{AVATARS[player.avatar] || '🎭'}</span>
        <div className="flex flex-col">
          <span className="text-[0.6rem] sm:text-xs font-semibold text-white truncate max-w-[50px] sm:max-w-[80px]">
            {player.name}
          </span>
          <span className="text-[0.5rem] sm:text-[0.6rem] text-white/50">
            Team {player.team} {isDealer ? '• D' : ''}
          </span>
        </div>
        {!player.connected && (
          <span className="text-[0.5rem] sm:text-[0.6rem] text-red-400">⚡</span>
        )}
      </motion.div>

      {/* Face-down cards */}
      <div className="flex items-center justify-center">
        {Array.from({ length: cardsToShow }).map((_, i) => (
          <div
            key={i}
            style={{ marginLeft: i === 0 ? 0 : -16 }}
          >
            <PlayingCard faceDown small />
          </div>
        ))}
        {cardCount > 4 && (
          <span className="text-[0.6rem] sm:text-xs text-white/50 ml-1">+{cardCount - 4}</span>
        )}
      </div>
    </div>
  );
}

export const PlayerSeat = memo(PlayerSeatInner);
