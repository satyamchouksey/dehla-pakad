import { memo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, Suit } from '@shared/types';
import { PlayingCard } from './PlayingCard';

interface HandProps {
  cards: Card[];
  isMyTurn: boolean;
  leadSuit: Suit | null;
  onPlayCard: (cardId: string) => void;
}

function HandInner({ cards, isMyTurn, leadSuit, onPlayCard }: HandProps) {
  const [scale, setScale] = useState(1);

  const canPlayCard = useCallback(
    (card: Card): boolean => {
      if (!isMyTurn) return false;
      if (!leadSuit) return true;
      const hasLeadSuit = cards.some((c) => c.suit === leadSuit);
      if (hasLeadSuit) return card.suit === leadSuit;
      return true;
    },
    [isMyTurn, leadSuit, cards]
  );

  const fanAngle = Math.min(2.5, 30 / Math.max(cards.length, 1));
  const startAngle = -((cards.length - 1) * fanAngle) / 2;
  const overlap = Math.max(-28, -56 + cards.length * 2);

  // Dynamically scale the hand to fit within screen width
  useEffect(() => {
    const updateScale = () => {
      const cardWidth = window.innerWidth < 640 ? 64 : 76.8;
      const availableWidth = window.innerWidth - 24;
      if (cards.length <= 1) { setScale(1); return; }
      const effectiveStep = cardWidth + overlap;
      const naturalWidth = cardWidth + (cards.length - 1) * effectiveStep;
      setScale(naturalWidth > availableWidth ? availableWidth / naturalWidth : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [cards.length, overlap]);

  const containerHeight = Math.max(5, 6.5 * scale);

  return (
    <div className="relative w-full" style={{ height: `${containerHeight}rem` }}>
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center"
        style={{
          minHeight: '6.5rem',
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'bottom center',
        }}
      >
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const angle = startAngle + i * fanAngle;
            const playable = canPlayCard(card);

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 60, rotate: -15, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: angle,
                  scale: 1,
                }}
                exit={{ opacity: 0, y: -80, scale: 0.5, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.03 }}
                style={{
                  marginLeft: i === 0 ? 0 : overlap,
                  transformOrigin: 'bottom center',
                  zIndex: i,
                }}
                className="relative"
              >
                <PlayingCard
                  card={card}
                  onClick={() => playable && onPlayCard(card.id)}
                  disabled={!playable}
                  highlighted={isMyTurn && playable}
                  index={i}
                  total={cards.length}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const Hand = memo(HandInner);
