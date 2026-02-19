// ============================================
// Dehla Pakad - Shared Types
// ============================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Team = 'A' | 'B';
export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'trickEnd' | 'roundEnd' | 'matchEnd';

export const RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  googleId: string;
  name: string;
  seatIndex: number;
  team: Team;
  connected: boolean;
  avatar: number;
}

export interface TrickCard {
  card: Card;
  playerIndex: number;
}

export interface TeamScore {
  A: number;
  B: number;
}

export interface TeamCards {
  A: Card[];
  B: Card[];
}

// Full authoritative game state (server only)
export interface GameState {
  phase: GamePhase;
  players: Player[];
  hands: Card[][];
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
  lastCapturedTenSuit: Suit | null;
  matchTarget: number;
}

// Client-visible state (hides other players' hands)
export interface ClientGameState {
  phase: GamePhase;
  players: Player[];
  myHand: Card[];
  mySeatIndex: number;
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
}

// Socket.io event payloads
export interface RoomCreatedPayload {
  roomCode: string;
  seatIndex: number;
  players: Player[];
}

export interface RoomJoinedPayload {
  roomCode: string;
  seatIndex: number;
  players: Player[];
}

export interface PlayerJoinedPayload {
  player: Player;
  players: Player[];
}

export interface PlayerLeftPayload {
  playerIndex: number;
  players: Player[];
}

export interface CardPlayedPayload {
  playerIndex: number;
  card: Card;
}

export interface TrickWonPayload {
  winnerIndex: number;
  winnerName: string;
  cards: TrickCard[];
  capturedTens: TeamCards;
}

export interface RoundEndPayload {
  capturedTens: TeamCards;
  tricksWon: TeamScore;
  matchScores: TeamScore;
  roundWinner: Team | null;
  isKot: boolean;
}

export interface MatchEndPayload {
  winner: Team;
  matchScores: TeamScore;
}

export interface ErrorPayload {
  message: string;
}

export interface ReconnectedPayload {
  playerIndex: number;
  gameState: ClientGameState | null;
}

// Auth types
export interface AuthUser {
  googleId: string;
  name: string;
  email: string;
  avatar: number;
  picture?: string;
}

export interface RoomHistoryEntry {
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  players: { name: string; googleId: string; seatIndex: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomHistoryPayload {
  rooms: RoomHistoryEntry[];
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

// Voice chat types
export interface VoiceJoinedPayload {
  peerId: string;
  seatIndex: number;
  name: string;
}

export interface VoiceLeftPayload {
  peerId: string;
  seatIndex: number;
}

export interface VoicePeersPayload {
  peers: { peerId: string; seatIndex: number; name: string }[];
}

export interface VoiceSignalPayload {
  from: string;
  to: string;
  signal: any;
  type: 'offer' | 'answer' | 'ice-candidate';
}

// Socket event maps
export interface ServerToClientEvents {
  'room:created': (data: RoomCreatedPayload) => void;
  'room:joined': (data: RoomJoinedPayload) => void;
  'room:playerJoined': (data: PlayerJoinedPayload) => void;
  'room:playerLeft': (data: PlayerLeftPayload) => void;
  'game:started': (data: ClientGameState) => void;
  'game:stateUpdate': (data: ClientGameState) => void;
  'game:cardPlayed': (data: CardPlayedPayload) => void;
  'game:trickWon': (data: TrickWonPayload) => void;
  'game:roundEnd': (data: RoundEndPayload) => void;
  'game:matchEnd': (data: MatchEndPayload) => void;
  'game:error': (data: ErrorPayload) => void;
  'player:reconnected': (data: ReconnectedPayload) => void;
  'room:history': (data: RoomHistoryPayload) => void;
  'voice:joined': (data: VoiceJoinedPayload) => void;
  'voice:left': (data: VoiceLeftPayload) => void;
  'voice:peers': (data: VoicePeersPayload) => void;
  'voice:signal': (data: VoiceSignalPayload) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; avatar: number }) => void;
  'room:join': (data: { roomCode: string; playerName: string; avatar: number }) => void;
  'game:start': () => void;
  'game:playCard': (data: { cardId: string }) => void;
  'game:newRound': () => void;
  'room:reconnect': (data: { roomCode: string; playerId: string }) => void;
  'room:history': () => void;
  'voice:join': () => void;
  'voice:leave': () => void;
  'voice:signal': (data: { to: string; signal: any; type: 'offer' | 'answer' | 'ice-candidate' }) => void;
}
