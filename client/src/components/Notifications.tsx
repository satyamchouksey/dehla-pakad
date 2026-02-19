import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export function Notifications() {
  const notifications = useGameStore((s) => s.notifications);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium backdrop-blur-md border
              ${n.type === 'success' ? 'bg-green-900/80 border-green-500/30 text-green-100' : ''}
              ${n.type === 'warning' ? 'bg-amber-900/80 border-amber-500/30 text-amber-100' : ''}
              ${n.type === 'info' ? 'bg-blue-900/80 border-blue-500/30 text-blue-100' : ''}
            `}
          >
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
