import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

const WINNER_DIALOGUES = [
  "Dehla loot liya! 🔥",
  "10 ka dum! Ab bolo! 💪",
  "Pakad liya bhai! 🎯",
  "Tera baap aaya! 👑",
  "Das number ka shot! 🚀",
  "Aaj ka king hum! 🤴",
  "Kya baat hai! Kya baat! 🎉",
  "Ek aur Dehla hamare! 💰",
  "Maza aa gaya! 😎",
  "Champion move! 🏆",
];

const LOSER_DIALOGUES = [
  "Oops! Gaya Dehla... 😭",
  "Bhai kya hua?! 💀",
  "Haath se nikal gaya! 😩",
  "Kuch nahi bachega... 🪦",
  "Ab rona mat! 😢",
  "F in the chat... 🫡",
  "RIP Dehla... ☠️",
  "Ye kya ho gaya?! 🤡",
  "Galti se mistake! 😵",
  "Lag gayi! 😬",
];

interface DehlaCaptureState {
  visible: boolean;
  isWinner: boolean;
  team: 'A' | 'B';
  suitSymbol: string;
  suitColor: string;
}

export function DehlaCapture() {
  const [state, setState] = useState<DehlaCaptureState>({
    visible: false,
    isWinner: false,
    team: 'A',
    suitSymbol: '♠',
    suitColor: '#e5e7eb',
  });
  const [dialogue, setDialogue] = useState('');

  useEffect(() => {
    const unsub = useGameStore.subscribe(
      (curr, prev) => {
        const currTotal = curr.capturedTens.A.length + curr.capturedTens.B.length;
        const prevTotal = prev.capturedTens.A.length + prev.capturedTens.B.length;

        if (currTotal > prevTotal) {
          const myTeam = curr.mySeatIndex % 2 === 0 ? 'A' : 'B';
          const capturingTeam = curr.capturedTens.A.length > prev.capturedTens.A.length ? 'A' : 'B';
          const isWinner = myTeam === capturingTeam;

          const newTens = capturingTeam === 'A'
            ? curr.capturedTens.A.filter(c => !prev.capturedTens.A.find(p => p.id === c.id))
            : curr.capturedTens.B.filter(c => !prev.capturedTens.B.find(p => p.id === c.id));

          const capturedCard = newTens[0];
          const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
          const suitSymbol = capturedCard ? suitSymbols[capturedCard.suit] || '♠' : '♠';
          const suitColor = capturedCard && (capturedCard.suit === 'hearts' || capturedCard.suit === 'diamonds')
            ? '#ef4444' : '#e5e7eb';

          const dialogues = isWinner ? WINNER_DIALOGUES : LOSER_DIALOGUES;
          const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];

          setDialogue(randomDialogue);
          setState({
            visible: true,
            isWinner,
            team: capturingTeam,
            suitSymbol,
            suitColor,
          });

          setTimeout(() => {
            setState(s => ({ ...s, visible: false }));
          }, 3500);
        }
      }
    );

    return unsub;
  }, []);

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Particles */}
          {state.isWinner && Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{
                opacity: 1,
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, 1.5, 0.5],
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 2, delay: i * 0.05, ease: 'easeOut' }}
              className="absolute text-2xl"
              style={{ color: state.suitColor }}
            >
              {i % 3 === 0 ? '✨' : i % 3 === 1 ? state.suitSymbol : '🔟'}
            </motion.div>
          ))}

          {/* Main card animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-180, 10, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex flex-col items-center gap-3"
          >
            {/* Big 10 card visual */}
            <motion.div
              animate={{
                boxShadow: state.isWinner
                  ? ['0 0 0px rgba(218,165,32,0)', '0 0 60px rgba(218,165,32,0.6)', '0 0 30px rgba(218,165,32,0.3)']
                  : ['0 0 0px rgba(255,0,0,0)', '0 0 60px rgba(255,0,0,0.4)', '0 0 30px rgba(255,0,0,0.2)'],
              }}
              transition={{ duration: 1.5, repeat: 1 }}
              className="w-24 h-36 sm:w-32 sm:h-44 rounded-xl bg-white flex flex-col items-center justify-center border-4"
              style={{ borderColor: state.isWinner ? '#daa520' : '#dc2626' }}
            >
              <span className="text-5xl sm:text-6xl font-extrabold" style={{ color: state.suitColor }}>
                10
              </span>
              <span className="text-3xl sm:text-4xl" style={{ color: state.suitColor }}>
                {state.suitSymbol}
              </span>
            </motion.div>

            {/* Team badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                state.isWinner
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              Team {state.team} captured!
            </motion.div>

            {/* Dialogue */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
              className={`px-6 py-3 rounded-2xl max-w-[280px] text-center text-lg font-bold ${
                state.isWinner
                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-200 border border-yellow-500/30'
                  : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-200 border border-red-500/30'
              }`}
            >
              {dialogue}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
