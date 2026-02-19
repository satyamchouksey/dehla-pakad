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
  isTrump?: boolean;
}

const SUIT_CODES: Record<string, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
};

function PlayingCardInner({
  card,
  faceDown = false,
  onClick,
  disabled = false,
  highlighted = false,
  small = false,
  medium = false,
  isTrump = false,
}: PlayingCardProps) {
  const w = small
    ? 'w-10 h-14'
    : medium
      ? 'w-14 h-20 sm:w-16 sm:h-[5.5rem]'
      : 'w-16 h-[5.8rem] sm:w-[4.8rem] sm:h-[7rem]';
  const cornerText = small ? 'text-[0.55rem]' : medium ? 'text-[0.65rem] sm:text-sm' : 'text-sm sm:text-base';
  const cornerSuit = small ? 'text-[0.55rem]' : medium ? 'text-[0.65rem] sm:text-sm' : 'text-sm sm:text-base';
  const centerRank = small ? 'text-lg' : medium ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl';
  const centerSuit = small ? 'text-xs' : medium ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
  const radius = small ? 'rounded-md' : 'rounded-lg';
  const trumpGlow = isTrump && !small ? 'ring-2 ring-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : '';

  if (faceDown || !card) {
    return (
      <div
        className={`${w} ${radius} shadow-card select-none flex-shrink-0
          bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950
          border border-blue-600/40 relative overflow-hidden`}
      >
        <div className={`absolute inset-[3px] ${radius} border border-blue-500/20 flex items-center justify-center`}>
          <div className="text-blue-400/30 text-lg font-bold">🃏</div>
        </div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px
            )`,
          }}
        />
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const red = isRedSuit(card.suit);
  const isFace = ['J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';
  const isTen = card.rank === '10';

  // Face cards (J, Q, K) - use real card images
  if (isFace && !small) {
    const imageUrl = `https://deckofcardsapi.com/static/img/${card.rank}${SUIT_CODES[card.suit]}.png`;
    return (
      <motion.button
        whileHover={!disabled ? { y: -10, scale: 1.06 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`${w} ${radius} select-none flex-shrink-0 relative overflow-hidden
          bg-white border-2 transition-all duration-200 cursor-pointer shadow-card
          ${highlighted ? 'ring-2 ring-gold shadow-glow border-gold/70' : 'border-gray-300'}
          ${!disabled ? 'hover:shadow-card-hover active:shadow-card' : ''}
          ${!highlighted && trumpGlow}
        `}
      >
        <img
          src={imageUrl}
          alt={`${card.rank} of ${card.suit}`}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </motion.button>
    );
  }

  // Number cards (2-10) and Aces
  return (
    <motion.button
      whileHover={!disabled ? { y: -10, scale: 1.06 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`${w} ${radius} select-none flex-shrink-0 relative
        bg-white border-2 transition-all duration-200 cursor-pointer overflow-hidden shadow-card
        ${highlighted ? 'ring-2 ring-gold shadow-glow border-gold/70' : 'border-gray-300'}
        ${!disabled ? 'hover:shadow-card-hover active:shadow-card' : ''}
        ${isTen ? 'ring-1 ring-gold/40' : ''}
        ${!highlighted && trumpGlow}
      `}
    >
      {/* Top-left corner */}
      <div className="absolute top-[3px] left-[5px] flex flex-col items-center leading-none">
        <span className={`font-extrabold ${cornerText}`} style={{ color }}>
          {card.rank}
        </span>
        <span className={cornerSuit} style={{ color }}>
          {symbol}
        </span>
      </div>

      {/* Center display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
        {isAce ? (
          <span className={`${small ? 'text-2xl' : medium ? 'text-4xl' : 'text-5xl'}`}
            style={{ color: red ? '#dc2626' : '#1a1a2e' }}>
            {symbol}
          </span>
        ) : (
          <>
            <span className={`font-black leading-none ${centerRank}`}
              style={{ color: red ? '#dc2626' : '#1a1a2e' }}>
              {card.rank}
            </span>
            <span className={`leading-none ${centerSuit}`}
              style={{ color: red ? '#dc2626' : '#1a1a2e' }}>
              {symbol}
            </span>
          </>
        )}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-[3px] right-[5px] flex flex-col items-center leading-none rotate-180">
        <span className={`font-extrabold ${cornerText}`} style={{ color }}>
          {card.rank}
        </span>
        <span className={cornerSuit} style={{ color }}>
          {symbol}
        </span>
      </div>

      {/* Dehla (10) gold shimmer */}
      {isTen && (
        <div className={`absolute inset-0 ${radius} border-2 border-gold/30 pointer-events-none`}
          style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(212,168,68,0.08) 50%, transparent 60%)' }}
        />
      )}
    </motion.button>
  );
}

export const PlayingCard = memo(PlayingCardInner);
