import { create } from 'zustand';
import type {
  Player, Card, TrickCard, TeamCards, TeamScore,
  GamePhase, ClientGameState, Suit,
} from '@shared/types';

export type Screen = 'home' | 'lobby' | 'game';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface GameStore {
  // Connection
  screen: Screen;
  connected: boolean;
  roomCode: string | null;
  playerName: string;
  avatar: number;

  // Game state
  phase: GamePhase;
  players: Player[];
  mySeatIndex: number;
  myHand: Card[];
  currentPlayerIndex: number;
  currentTrick: TrickCard[];
  trickNumber: number;
  leadSuit: Suit | null;
  trumpSuit: Suit | null;
  capturedTens: TeamCards;
  tricksWon: TeamScore;
  matchScores: TeamScore;
  dealerIndex: number;
  lastTrickWinner: number | null;
  roundNumber: number;
  handSizes: number[];
  matchTarget: number;

  // UI state
  notifications: Notification[];
  animatingTrick: boolean;
  lastPlayedCard: { playerIndex: number; card: Card } | null;

  // Actions
  setScreen: (screen: Screen) => void;
  setConnected: (connected: boolean) => void;
  setRoomCode: (code: string | null) => void;
  setPlayerName: (name: string) => void;
  setAvatar: (avatar: number) => void;
  setPlayers: (players: Player[]) => void;
  setGameState: (state: ClientGameState) => void;
  setAnimatingTrick: (animating: boolean) => void;
  setLastPlayedCard: (data: { playerIndex: number; card: Card } | null) => void;
  addNotification: (message: string, type?: 'info' | 'success' | 'warning') => void;
  removeNotification: (id: string) => void;
  playCardFromHand: (cardId: string) => void;
  reset: () => void;
}

const initialGameState = {
  phase: 'waiting' as GamePhase,
  players: [] as Player[],
  mySeatIndex: -1,
  myHand: [] as Card[],
  currentPlayerIndex: 0,
  currentTrick: [] as TrickCard[],
  trickNumber: 0,
  leadSuit: null as Suit | null,
  trumpSuit: null as Suit | null,
  capturedTens: { A: [], B: [] } as TeamCards,
  tricksWon: { A: 0, B: 0 } as TeamScore,
  matchScores: { A: 0, B: 0 } as TeamScore,
  dealerIndex: 0,
  lastTrickWinner: null as number | null,
  roundNumber: 0,
  handSizes: [0, 0, 0, 0],
  matchTarget: 5,
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Connection
  screen: 'home',
  connected: false,
  roomCode: null,
  playerName: '',
  avatar: 0,

  // Game state
  ...initialGameState,

  // UI state
  notifications: [],
  animatingTrick: false,
  lastPlayedCard: null,

  // Actions
  setScreen: (screen) => set({ screen }),
  setConnected: (connected) => set({ connected }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setPlayerName: (playerName) => set({ playerName }),
  setAvatar: (avatar) => set({ avatar }),
  setPlayers: (players) => set({ players }),

  setGameState: (state) => set({
    phase: state.phase,
    players: state.players,
    mySeatIndex: state.mySeatIndex,
    myHand: state.myHand,
    currentPlayerIndex: state.currentPlayerIndex,
    currentTrick: state.currentTrick,
    trickNumber: state.trickNumber,
    leadSuit: state.leadSuit,
    trumpSuit: state.trumpSuit,
    capturedTens: state.capturedTens,
    tricksWon: state.tricksWon,
    matchScores: state.matchScores,
    dealerIndex: state.dealerIndex,
    lastTrickWinner: state.lastTrickWinner,
    roundNumber: state.roundNumber,
    handSizes: state.handSizes,
    matchTarget: state.matchTarget,
  }),

  setAnimatingTrick: (animating) => set({ animatingTrick: animating }),
  setLastPlayedCard: (data) => set({ lastPlayedCard: data }),

  addNotification: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeNotification(id);
    }, 3500);
  },

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  playCardFromHand: (cardId) => set((state) => ({
    myHand: state.myHand.filter((c) => c.id !== cardId),
  })),

  reset: () => set({
    screen: 'home',
    roomCode: null,
    ...initialGameState,
    notifications: [],
    animatingTrick: false,
    lastPlayedCard: null,
  }),
}));
