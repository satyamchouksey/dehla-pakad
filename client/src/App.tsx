import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Login } from '@/components/Login';
import { Lobby } from '@/components/Lobby';
import { GameBoard } from '@/components/GameBoard';
import { Notifications } from '@/components/Notifications';

export default function App() {
  const { user, loading, restore } = useAuthStore();

  // Restore session on mount
  useEffect(() => {
    restore();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center felt-texture">
        <div className="text-white/60 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { createRoom, joinRoom, startGame, playCard, newRound, requestHistory, reconnectRoom } = useSocket();
  const screen = useGameStore((s) => s.screen);
  const user = useAuthStore((s) => s.user);

  // Request room history on mount and handle ?room= URL param
  useEffect(() => {
    // Small delay to let socket connect first
    const timer = setTimeout(() => {
      requestHistory();

      // Check for room code in URL
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get('room');
      if (roomCode && user) {
        reconnectRoom(roomCode.toUpperCase());
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <Notifications />

      {(screen === 'home' || screen === 'lobby') && (
        <div className="min-h-screen flex items-center justify-center felt-texture">
          <Lobby
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onStartGame={startGame}
            onReconnectRoom={reconnectRoom}
            onRequestHistory={requestHistory}
          />
        </div>
      )}

      {screen === 'game' && (
        <GameBoard onPlayCard={playCard} onNewRound={newRound} />
      )}
    </div>
  );
}
