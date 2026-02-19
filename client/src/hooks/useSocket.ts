import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { connectSocket, getSocket } from '@/lib/socket';
import type { RoomHistoryEntry } from '@shared/types';

export function useSocket() {
  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      console.log('[Socket] Connected:', socket.id);
      useGameStore.getState().setConnected(true);
    };

    const onDisconnect = () => {
      console.log('[Socket] Disconnected');
      useGameStore.getState().setConnected(false);
    };

    const onRoomCreated = (data: any) => {
      const s = useGameStore.getState();
      s.setRoomCode(data.roomCode);
      s.setPlayers(data.players);
      useGameStore.setState({ mySeatIndex: data.seatIndex });
      s.setScreen('lobby');
      s.addNotification('Room created! Share the code with friends.', 'success');
    };

    const onRoomJoined = (data: any) => {
      const s = useGameStore.getState();
      s.setRoomCode(data.roomCode);
      s.setPlayers(data.players);
      useGameStore.setState({ mySeatIndex: data.seatIndex });
      s.setScreen('lobby');
      s.addNotification('Joined room successfully!', 'success');
    };

    const onPlayerJoined = (data: any) => {
      const s = useGameStore.getState();
      s.setPlayers(data.players);
      s.addNotification(`${data.player.name} joined the game`);
    };

    const onPlayerLeft = (data: any) => {
      const s = useGameStore.getState();
      s.setPlayers(data.players);
      const name = data.players[data.playerIndex]?.name || 'A player';
      s.addNotification(`${name} disconnected`, 'warning');
    };

    const onGameStarted = (gameState: any) => {
      const s = useGameStore.getState();
      s.setGameState(gameState);
      s.setScreen('game');
      s.addNotification('Game started! Good luck!', 'success');
    };

    const onStateUpdate = (gameState: any) => {
      useGameStore.getState().setGameState(gameState);
    };

    const onCardPlayed = (data: any) => {
      const s = useGameStore.getState();
      s.setLastPlayedCard(data);

      // Highlight when trump is played on a non-trump lead
      if (s.trumpSuit && data.card?.suit === s.trumpSuit && s.leadSuit && s.leadSuit !== s.trumpSuit) {
        const symbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        s.addNotification(`Trump ${symbols[data.card.suit] || ''} played!`, 'warning');
      }

      setTimeout(() => useGameStore.getState().setLastPlayedCard(null), 600);
    };

    const onTrickWon = (data: any) => {
      const s = useGameStore.getState();

      // Show all 4 cards in the trick area for 2 seconds
      if (data.cards && data.cards.length > 0) {
        useGameStore.setState({ currentTrick: data.cards });
      }

      const currentSeat = s.mySeatIndex;
      const winnerTeam = data.winnerIndex % 2 === currentSeat % 2 ? 'your' : 'the opposing';
      s.addNotification(
        `${data.winnerName} won the trick for ${winnerTeam} team!`,
        data.winnerIndex % 2 === currentSeat % 2 ? 'success' : 'info'
      );
      if (data.capturedTens) {
        const totalTens = data.capturedTens.A.length + data.capturedTens.B.length;
        const prevTotal = s.capturedTens.A.length + s.capturedTens.B.length;
        if (totalTens > prevTotal) {
          s.addNotification('A Dehla (10) was captured!', 'warning');
        }
      }

      // After 2s of viewing, animate the trick collection
      setTimeout(() => {
        useGameStore.getState().setAnimatingTrick(true);
        setTimeout(() => useGameStore.getState().setAnimatingTrick(false), 800);
      }, 2000);
    };

    const onRoundEnd = (data: any) => {
      const s = useGameStore.getState();
      if (data.roundWinner) {
        const msg = data.isKot
          ? `KOT! Team ${data.roundWinner} captured all 4 tens! (+2 points)`
          : `Team ${data.roundWinner} wins the round! (+1 point)`;
        s.addNotification(msg, 'success');
      } else {
        s.addNotification('Round draw - 2 tens each!', 'info');
      }
    };

    const onMatchEnd = (data: any) => {
      useGameStore.getState().addNotification(
        `Team ${data.winner} wins the match! (${data.matchScores.A} - ${data.matchScores.B})`,
        'success'
      );
    };

    const onError = (data: any) => {
      useGameStore.getState().addNotification(data.message, 'warning');
    };

    const onReconnected = (data: any) => {
      const s = useGameStore.getState();
      useGameStore.setState({ mySeatIndex: data.playerIndex });
      if (data.roomCode) s.setRoomCode(data.roomCode);
      if (data.players) s.setPlayers(data.players);
      if (data.gameState) {
        s.setGameState(data.gameState);
        s.setScreen('game');
      } else {
        // No game in progress - go to lobby
        s.setScreen('lobby');
      }
      s.addNotification('Reconnected!', 'success');
    };

    const onRoomHistory = (data: any) => {
      useGameStore.getState().setRoomHistory(data.rooms || []);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:created', onRoomCreated);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:playerJoined', onPlayerJoined);
    socket.on('room:playerLeft', onPlayerLeft);
    socket.on('game:started', onGameStarted);
    socket.on('game:stateUpdate', onStateUpdate);
    socket.on('game:cardPlayed', onCardPlayed);
    socket.on('game:trickWon', onTrickWon);
    socket.on('game:roundEnd', onRoundEnd);
    socket.on('game:matchEnd', onMatchEnd);
    socket.on('game:error', onError);
    socket.on('player:reconnected', onReconnected);
    socket.on('room:history', onRoomHistory);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:created', onRoomCreated);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:playerJoined', onPlayerJoined);
      socket.off('room:playerLeft', onPlayerLeft);
      socket.off('game:started', onGameStarted);
      socket.off('game:stateUpdate', onStateUpdate);
      socket.off('game:cardPlayed', onCardPlayed);
      socket.off('game:trickWon', onTrickWon);
      socket.off('game:roundEnd', onRoundEnd);
      socket.off('game:matchEnd', onMatchEnd);
      socket.off('game:error', onError);
      socket.off('player:reconnected', onReconnected);
      socket.off('room:history', onRoomHistory);
    };
  }, []);

  const createRoom = useCallback((playerName: string, avatar: number) => {
    const socket = getSocket();
    socket.emit('room:create', { playerName, avatar });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, avatar: number) => {
    const socket = getSocket();
    socket.emit('room:join', { roomCode: roomCode.toUpperCase(), playerName, avatar });
  }, []);

  const startGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:start');
  }, []);

  const playCard = useCallback((cardId: string) => {
    const socket = getSocket();
    socket.emit('game:playCard', { cardId });
  }, []);

  const newRound = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:newRound');
  }, []);

  const requestHistory = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:history');
  }, []);

  const reconnectRoom = useCallback((roomCode: string) => {
    const socket = getSocket();
    socket.emit('room:reconnect', { roomCode, playerId: '' });
  }, []);

  return { createRoom, joinRoom, startGame, playCard, newRound, requestHistory, reconnectRoom };
}
