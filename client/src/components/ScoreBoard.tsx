import { memo } from 'react';
import { motion } from 'framer-motion';
import type { TeamScore, TeamCards, Suit } from '@shared/types';
import { SUIT_SYMBOLS } from '@/lib/cards';

interface ScoreBoardProps {
  matchScores: TeamScore;
  tricksWon: TeamScore;
  capturedTens: TeamCards;
  trumpSuit: Suit | null;
  roundNumber: number;
  trickNumber: number;
  matchTarget: number;
  myTeam: 'A' | 'B';
  compact?: boolean;
}

function ProgressDots({ count, max, color }: { count: number; max: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-500"
          style={{
            background: i < count ? color : 'rgba(255,255,255,0.1)',
            boxShadow: i < count ? `0 0 6px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function ScoreBoardInner({
  matchScores,
  tricksWon,
  capturedTens,
  trumpSuit,
  roundNumber,
  trickNumber,
  matchTarget,
  myTeam,
  compact = false,
}: ScoreBoardProps) {
  const trumpColor = trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? '#ef4444' : '#e5e7eb';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-[0.65rem] sm:text-xs"
      >
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${myTeam === 'A' ? 'text-cyan-400' : 'text-white/60'}`}>A:{matchScores.A}</span>
          <span className="text-white/30">vs</span>
          <span className={`font-bold ${myTeam === 'B' ? 'text-orange-400' : 'text-white/60'}`}>B:{matchScores.B}</span>
        </div>
        <div className="w-px h-4 bg-white/15" />
        <span className="text-white/50">R{roundNumber} T{trickNumber}/13</span>
        {trumpSuit && (
          <>
            <div className="w-px h-4 bg-white/15" />
            <span style={{ color: trumpColor }} className="text-sm">{SUIT_SYMBOLS[trumpSuit]}</span>
          </>
        )}
        <div className="w-px h-4 bg-white/15" />
        <div className="flex gap-1">
          {capturedTens.A.map((c) => (
            <span key={c.id} className="text-[0.65rem]" style={{ color: c.suit === 'hearts' || c.suit === 'diamonds' ? '#ef4444' : '#a1a1aa' }}>
              10{SUIT_SYMBOLS[c.suit]}
            </span>
          ))}
          {capturedTens.B.map((c) => (
            <span key={c.id} className="text-[0.65rem]" style={{ color: c.suit === 'hearts' || c.suit === 'diamonds' ? '#ef4444' : '#a1a1aa' }}>
              10{SUIT_SYMBOLS[c.suit]}
            </span>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[200px] rounded-2xl overflow-hidden border border-white/10"
      style={{
        background: 'linear-gradient(145deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-gold/10 to-transparent">
        <div className="text-gold font-display font-bold text-center text-sm tracking-wider">SCOREBOARD</div>
      </div>

      <div className="p-3 space-y-3">
        {/* Match Score - Visual bars */}
        <div className="space-y-2">
          <div className="text-white/40 text-[0.6rem] uppercase tracking-widest">Match to {matchTarget}</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${myTeam === 'A' ? 'text-cyan-400' : 'text-white/70'}`}>
                Team A {myTeam === 'A' ? '(You)' : ''}
              </span>
              <span className="text-xs font-bold text-white">{matchScores.A}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${(matchScores.A / matchTarget) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-bold ${myTeam === 'B' ? 'text-orange-400' : 'text-white/70'}`}>
                Team B {myTeam === 'B' ? '(You)' : ''}
              </span>
              <span className="text-xs font-bold text-white">{matchScores.B}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${(matchScores.B / matchTarget) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Round + Trump */}
        <div className="flex items-center justify-between py-2 px-2 rounded-lg bg-white/5">
          <div className="text-center">
            <div className="text-[0.55rem] text-white/40 uppercase">Round</div>
            <div className="text-sm font-bold text-white">{roundNumber}</div>
          </div>
          <div className="text-center">
            <div className="text-[0.55rem] text-white/40 uppercase">Trick</div>
            <div className="text-sm font-bold text-white">{trickNumber}/13</div>
          </div>
          <div className="text-center">
            <div className="text-[0.55rem] text-white/40 uppercase">Trump</div>
            {trumpSuit ? (
              <div className="text-lg font-bold leading-tight" style={{ color: trumpColor }}>
                {SUIT_SYMBOLS[trumpSuit]}
              </div>
            ) : (
              <div className="text-[0.6rem] text-white/30 leading-tight">None</div>
            )}
          </div>
        </div>

        {/* Tricks Won */}
        <div className="space-y-1.5">
          <div className="text-white/40 text-[0.6rem] uppercase tracking-widest">Tricks Won</div>
          <div className="flex justify-between items-center">
            <div className="text-center">
              <span className="text-xs text-cyan-400 font-bold">{tricksWon.A}</span>
            </div>
            <ProgressDots count={tricksWon.A} max={7} color="#22d3ee" />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-center">
              <span className="text-xs text-orange-400 font-bold">{tricksWon.B}</span>
            </div>
            <ProgressDots count={tricksWon.B} max={7} color="#fb923c" />
          </div>
        </div>

        {/* Dehlas */}
        <div className="space-y-1.5">
          <div className="text-white/40 text-[0.6rem] uppercase tracking-widest">Dehlas Captured</div>
          <div className="flex justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[0.6rem] text-cyan-400">A:</span>
              <div className="flex gap-0.5">
                {capturedTens.A.length === 0 && <span className="text-white/20 text-xs">-</span>}
                {capturedTens.A.map((c) => (
                  <motion.span
                    key={c.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[0.6rem] font-bold"
                    style={{ color: c.suit === 'hearts' || c.suit === 'diamonds' ? '#ef4444' : '#d4d4d8' }}
                  >
                    {SUIT_SYMBOLS[c.suit]}
                  </motion.span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[0.6rem] text-orange-400">B:</span>
              <div className="flex gap-0.5">
                {capturedTens.B.length === 0 && <span className="text-white/20 text-xs">-</span>}
                {capturedTens.B.map((c) => (
                  <motion.span
                    key={c.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[0.6rem] font-bold"
                    style={{ color: c.suit === 'hearts' || c.suit === 'diamonds' ? '#ef4444' : '#d4d4d8' }}
                  >
                    {SUIT_SYMBOLS[c.suit]}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const ScoreBoard = memo(ScoreBoardInner);
