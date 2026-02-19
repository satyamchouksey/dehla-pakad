import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import type { Suit } from '@shared/types';

const SUIT_INFO: Record<Suit, { symbol: string; color: string; name: string }> = {
  hearts: { symbol: '♥', color: '#ef4444', name: 'Hearts' },
  diamonds: { symbol: '♦', color: '#ef4444', name: 'Diamonds' },
  clubs: { symbol: '♣', color: '#e5e7eb', name: 'Clubs' },
  spades: { symbol: '♠', color: '#e5e7eb', name: 'Spades' },
};

export function TrumpReveal() {
  const [reveal, setReveal] = useState<{ suit: Suit; visible: boolean } | null>(null);
  const prevTrumpRef = useRef<Suit | null>(null);

  useEffect(() => {
    const unsub = useGameStore.subscribe((curr, prev) => {
      // Detect first trump reveal: trumpSuit changes from null to a value
      if (curr.trumpSuit && !prev.trumpSuit && curr.trumpSuit !== prevTrumpRef.current) {
        prevTrumpRef.current = curr.trumpSuit;
        setReveal({ suit: curr.trumpSuit, visible: true });
        setTimeout(() => setReveal((r) => r ? { ...r, visible: false } : null), 4000);
      }
      // Reset on new round (trumpSuit goes back to null)
      if (!curr.trumpSuit && prev.trumpSuit) {
        prevTrumpRef.current = null;
      }
    });
    return unsub;
  }, []);

  if (!reveal) return null;

  const info = SUIT_INFO[reveal.suit];

  return (
    <AnimatePresence>
      {reveal.visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Suit-colored radial burst */}
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: [0, 4, 6], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              background: `radial-gradient(circle, ${info.color}40 0%, transparent 70%)`,
            }}
          />

          {/* Suit symbol particles in slow-mo */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const dist = 120 + Math.random() * 200;
            return (
              <motion.div
                key={`trump-particle-${i}`}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 2, 1.5, 0],
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 2.5, delay: i * 0.05, ease: 'easeOut' }}
                className="absolute text-2xl"
                style={{ color: info.color }}
              >
                {info.symbol}
              </motion.div>
            );
          })}

          {/* Central trump display */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: [0, 1.5, 1.2], rotate: [-90, 5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 0px ${info.color}00`,
                  `0 0 60px ${info.color}80`,
                  `0 0 30px ${info.color}40`,
                ],
              }}
              transition={{ duration: 1.5, repeat: 1 }}
              className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl bg-white/95 flex flex-col items-center justify-center border-4"
              style={{ borderColor: info.color }}
            >
              <span className="text-5xl sm:text-6xl" style={{ color: info.color }}>
                {info.symbol}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="px-5 py-2 rounded-full text-sm font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40"
            >
              Trump: {info.name} {info.symbol}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
