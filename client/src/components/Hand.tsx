import { memo, useCallback } from 'react';
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

  return (
    <div className="flex justify-center items-end relative" style={{ minHeight: '6.5rem' }}>
      <div className="flex items-end justify-center relative">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const angle = startAngle + i * fanAngle;
            const playable = canPlayCard(card);
            const overlap = Math.max(-28, -56 + cards.length * 2);

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
