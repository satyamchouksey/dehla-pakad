import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import { Lobby } from '@/components/Lobby';
import { GameBoard } from '@/components/GameBoard';
import { Notifications } from '@/components/Notifications';

export default function App() {
  const { createRoom, joinRoom, startGame, playCard, newRound } = useSocket();
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <Notifications />

      {(screen === 'home' || screen === 'lobby') && (
        <div className="min-h-screen flex items-center justify-center felt-texture">
          <Lobby
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onStartGame={startGame}
          />
        </div>
      )}

      {screen === 'game' && (
        <GameBoard onPlayCard={playCard} onNewRound={newRound} />
      )}
    </div>
  );
}
