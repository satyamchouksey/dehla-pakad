import type { Suit, Rank } from '@shared/types';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

export const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

export const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export const AVATARS = ['🎭', '🦊', '🐯', '🦅', '🐺', '🦁', '🐻', '🦉'];

export function getRelativeSeatPosition(
  mySeat: number,
  targetSeat: number
): 'bottom' | 'left' | 'top' | 'right' {
  const diff = (targetSeat - mySeat + 4) % 4;
  switch (diff) {
    case 0: return 'bottom';
    case 1: return 'left';
    case 2: return 'top';
    case 3: return 'right';
    default: return 'bottom';
  }
}
