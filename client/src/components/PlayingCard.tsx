import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '@shared/types';
import { SUIT_SYMBOLS, SUIT_COLORS, isRedSuit } from '@/lib/cards';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  small?: boolean;
  medium?: boolean;
  index?: number;
  total?: number;
}

function PlayingCardInner({
  card,
  faceDown = false,
  onClick,
  disabled = false,
  highlighted = false,
  small = false,
  medium = false,
}: PlayingCardProps) {
  const w = small
    ? 'w-12 h-[4.5rem]'
    : medium
      ? 'w-16 h-[5.5rem] sm:w-[4.5rem] sm:h-[6.5rem]'
      : 'w-[4.5rem] h-[6.5rem] sm:w-20 sm:h-28';
  const textSize = small ? 'text-[0.6rem]' : medium ? 'text-[0.7rem] sm:text-xs' : 'text-xs sm:text-sm';
  const suitTextSize = small ? 'text-[0.55rem]' : medium ? 'text-[0.6rem] sm:text-[0.65rem]' : 'text-[0.65rem] sm:text-xs';
  const centerSize = small ? 'text-xl' : medium ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl';

  if (faceDown || !card) {
    return (
      <div
        className={`${w} rounded-lg shadow-card select-none flex-shrink-0
          bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950
          border border-blue-700/50 relative overflow-hidden`}
      >
        <div className="absolute inset-1 rounded border border-blue-600/30 flex items-center justify-center">
          <div className="text-blue-400/40 text-2xl font-bold">🃏</div>
        </div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px
            )`,
          }}
        />
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const red = isRedSuit(card.suit);

  return (
    <motion.button
      whileHover={!disabled ? { y: -8, scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${w} rounded-lg select-none flex-shrink-0 relative
        bg-white border transition-shadow duration-200 cursor-pointer
        ${highlighted ? 'ring-2 ring-gold shadow-glow border-gold' : 'border-gray-200'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-card-hover'}
        ${!disabled ? 'active:shadow-card' : ''}
      `}
      style={{ perspective: '1000px' }}
    >
      {/* Top-left rank + suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span
          className={`font-bold ${textSize}`}
          style={{ color }}
        >
          {card.rank}
        </span>
        <span className={suitTextSize} style={{ color }}>
          {symbol}
        </span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${centerSize} ${
            card.rank === '10' ? 'font-bold' : ''
          }`}
          style={{ color: red ? '#dc2626' : '#1a1a2e' }}
        >
          {symbol}
        </span>
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span
          className={`font-bold ${textSize}`}
          style={{ color }}
        >
          {card.rank}
        </span>
        <span className={suitTextSize} style={{ color }}>
          {symbol}
        </span>
      </div>

      {/* Dehla (10) highlight */}
      {card.rank === '10' && (
        <div className="absolute inset-0 rounded-lg border-2 border-gold/30 pointer-events-none" />
      )}
    </motion.button>
  );
}

export const PlayingCard = memo(PlayingCardInner);
