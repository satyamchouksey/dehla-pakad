import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Hand } from './Hand';
import { PlayerSeat } from './PlayerSeat';
import { TrickArea } from './TrickArea';
import { ScoreBoard } from './ScoreBoard';
import { DehlaCapture } from './DehlaCapture';

interface GameBoardProps {
  onPlayCard: (cardId: string) => void;
  onNewRound: () => void;
}

export function GameBoard({ onPlayCard, onNewRound }: GameBoardProps) {
  const {
    phase, players, mySeatIndex, myHand, currentPlayerIndex,
    currentTrick, trickNumber, leadSuit, trumpSuit,
    capturedTens, tricksWon, matchScores, dealerIndex,
    roundNumber, handSizes, matchTarget, animatingTrick,
  } = useGameStore();

  const isMyTurn = currentPlayerIndex === mySeatIndex;
  const myTeam = mySeatIndex % 2 === 0 ? 'A' as const : 'B' as const;

  const seatOrder = useMemo(() => {
    const order: number[] = [];
    for (let i = 0; i < 4; i++) {
      order.push((mySeatIndex + i) % 4);
    }
    return order;
  }, [mySeatIndex]);

  const topPlayer = seatOrder[2];
  const leftPlayer = seatOrder[1];
  const rightPlayer = seatOrder[3];

  return (
    <div className="felt-texture w-full h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Dehla capture celebration overlay */}
      <DehlaCapture />

      {/* Turn indicator */}
      <AnimatePresence>
        {phase === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold
              ${isMyTurn ? 'bg-gold/30 text-gold border border-gold/40' : 'glass text-white/70'}
            `}
          >
            {isMyTurn ? "Your Turn" : `${players[currentPlayerIndex]?.name}'s Turn`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score board - desktop: top right panel */}
      <div className="absolute top-2 right-2 z-20 hidden lg:block">
        <ScoreBoard
          matchScores={matchScores}
          tricksWon={tricksWon}
          capturedTens={capturedTens}
          trumpSuit={trumpSuit}
          roundNumber={roundNumber}
          trickNumber={trickNumber}
          matchTarget={matchTarget}
          myTeam={myTeam}
        />
      </div>

      {/* Mobile/tablet compact score bar */}
      <div className="lg:hidden absolute top-2 left-2 z-20">
        <ScoreBoard
          matchScores={matchScores}
          tricksWon={tricksWon}
          capturedTens={capturedTens}
          trumpSuit={trumpSuit}
          roundNumber={roundNumber}
          trickNumber={trickNumber}
          matchTarget={matchTarget}
          myTeam={myTeam}
          compact
        />
      </div>

      {/* Game layout */}
      <div className="flex-1 flex flex-col items-center justify-between py-12 sm:py-14 px-2 sm:px-4">
        {/* Top player */}
        <div className="flex justify-center">
          <PlayerSeat
            player={players[topPlayer]}
            isCurrentTurn={currentPlayerIndex === topPlayer}
            isDealer={dealerIndex === topPlayer}
            cardCount={handSizes[topPlayer] || 0}
            position="top"
            isPartner={topPlayer % 2 === mySeatIndex % 2}
          />
        </div>

        {/* Middle row: left player - trick area - right player */}
        <div className="flex items-center justify-between w-full max-w-3xl">
          <div className="flex-shrink-0">
            <PlayerSeat
              player={players[leftPlayer]}
              isCurrentTurn={currentPlayerIndex === leftPlayer}
              isDealer={dealerIndex === leftPlayer}
              cardCount={handSizes[leftPlayer] || 0}
              position="left"
              isPartner={leftPlayer % 2 === mySeatIndex % 2}
            />
          </div>

          <div className="flex-1 flex justify-center">
            <TrickArea
              trick={currentTrick}
              mySeatIndex={mySeatIndex}
              animating={animatingTrick}
            />
          </div>

          <div className="flex-shrink-0">
            <PlayerSeat
              player={players[rightPlayer]}
              isCurrentTurn={currentPlayerIndex === rightPlayer}
              isDealer={dealerIndex === rightPlayer}
              cardCount={handSizes[rightPlayer] || 0}
              position="right"
              isPartner={rightPlayer % 2 === mySeatIndex % 2}
            />
          </div>
        </div>

        {/* Bottom: my hand */}
        <div className="w-full max-w-3xl">
          <div className="text-center mb-1">
            <span className="text-[0.65rem] sm:text-xs text-white/30">
              {players[mySeatIndex]?.name} (Team {myTeam})
              {dealerIndex === mySeatIndex ? ' • Dealer' : ''}
            </span>
          </div>
          <Hand
            cards={myHand}
            isMyTurn={isMyTurn}
            leadSuit={leadSuit}
            onPlayCard={onPlayCard}
          />
        </div>
      </div>

      {/* Round end overlay */}
      <AnimatePresence>
        {phase === 'roundEnd' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass p-6 sm:p-8 text-center space-y-4 max-w-sm mx-4"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gold">Round Over</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Team A Tens:</span>
                  <span className="font-bold text-cyan-400">{capturedTens.A.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Team B Tens:</span>
                  <span className="font-bold text-orange-400">{capturedTens.B.length}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white/60">Match Score:</span>
                  <span className="font-bold text-gold">{matchScores.A} - {matchScores.B}</span>
                </div>
              </div>
              <button onClick={onNewRound} className="btn-primary w-full">
                Next Round
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match end overlay */}
      <AnimatePresence>
        {phase === 'matchEnd' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="glass p-8 sm:p-10 text-center space-y-6 max-w-sm mx-4"
            >
              <div className="text-5xl">🏆</div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gold">
                {matchScores.A > matchScores.B
                  ? myTeam === 'A' ? 'You Win!' : 'You Lose!'
                  : myTeam === 'B' ? 'You Win!' : 'You Lose!'}
              </h2>
              <div className="text-base sm:text-lg text-white/70">
                Final Score: {matchScores.A} - {matchScores.B}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
