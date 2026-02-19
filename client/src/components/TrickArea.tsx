import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TrickCard } from '@shared/types';
import { PlayingCard } from './PlayingCard';
import { getRelativeSeatPosition } from '@/lib/cards';

interface TrickAreaProps {
  trick: TrickCard[];
  mySeatIndex: number;
  animating: boolean;
}

const POSITION_STYLES: Record<string, { x: number; y: number }> = {
  bottom: { x: 0, y: 32 },
  left: { x: -50, y: 0 },
  top: { x: 0, y: -32 },
  right: { x: 50, y: 0 },
};

const ENTRY_FROM: Record<string, { x: number; y: number }> = {
  bottom: { x: 0, y: 120 },
  left: { x: -120, y: 0 },
  top: { x: 0, y: -120 },
  right: { x: 120, y: 0 },
};

function TrickAreaInner({ trick, mySeatIndex, animating }: TrickAreaProps) {
  return (
    <div className="relative w-40 h-36 sm:w-64 sm:h-48 flex items-center justify-center">
      <AnimatePresence>
        {trick.map((tc, i) => {
          const pos = getRelativeSeatPosition(mySeatIndex, tc.playerIndex);
          const target = POSITION_STYLES[pos];
          const from = ENTRY_FROM[pos];

          return (
            <motion.div
              key={`${tc.card.id}-${i}`}
              initial={{ ...from, opacity: 0, scale: 0.5 }}
              animate={
                animating
                  ? { x: 0, y: 0, opacity: 0, scale: 0.3, transition: { duration: 0.4 } }
                  : { ...target, opacity: 1, scale: 1 }
              }
              exit={{ opacity: 0, scale: 0.3, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute"
              style={{ zIndex: i }}
            >
              <PlayingCard card={tc.card} disabled medium />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {trick.length === 0 && (
        <div className="text-white/15 text-xs sm:text-sm font-medium select-none">
          Play a card
        </div>
      )}
    </div>
  );
}

export const TrickArea = memo(TrickAreaInner);
