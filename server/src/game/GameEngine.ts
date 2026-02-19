import {
  Card, Suit, Rank, Team, GamePhase, GameState, ClientGameState,
  TrickCard, Player, RANK_ORDER, SUITS, RANKS,
} from '../../../shared/types';

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getTeam(seatIndex: number): Team {
  return seatIndex % 2 === 0 ? 'A' : 'B';
}

export interface PlayCardResult {
  success: boolean;
  error?: string;
  trickComplete?: boolean;
  trickWinner?: number;
  trickCards?: TrickCard[];
  roundComplete?: boolean;
  roundWinner?: Team | null;
  isKot?: boolean;
  matchComplete?: boolean;
  matchWinner?: Team;
  capturedTen?: boolean;
}

export class GameEngine {
  private state: GameState;

  constructor(players: Player[], matchTarget: number = 5) {
    this.state = {
      phase: 'waiting',
      players,
      hands: [[], [], [], []],
      currentPlayerIndex: 0,
      currentTrick: [],
      trickNumber: 0,
      leadSuit: null,
      trumpSuit: null,
      capturedTens: { A: [], B: [] },
      tricksWon: { A: 0, B: 0 },
      matchScores: { A: 0, B: 0 },
      dealerIndex: 0,
      lastTrickWinner: null,
      roundNumber: 0,
      lastCapturedTenSuit: null,
      matchTarget,
    };
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getState(): GameState {
    return this.state;
  }

  startRound(): void {
    const deck = shuffleDeck(createDeck());

    // Deal 13 cards to each player
    this.state.hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      this.state.hands[i % 4].push(deck[i]);
    }

    // Sort each hand by suit then rank
    for (const hand of this.state.hands) {
      hand.sort((a, b) => {
        const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        if (suitOrder !== 0) return suitOrder;
        return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
      });
    }

    this.state.roundNumber++;
    this.state.trickNumber = 0;
    this.state.currentTrick = [];
    this.state.leadSuit = null;
    this.state.capturedTens = { A: [], B: [] };
    this.state.tricksWon = { A: 0, B: 0 };
    this.state.lastTrickWinner = null;
    this.state.lastCapturedTenSuit = null;

    // Set trump from previous round's last captured ten
    // Round 1 has no trump
    if (this.state.roundNumber === 1) {
      this.state.trumpSuit = null;
    }
    // Otherwise trumpSuit was already set at end of previous round

    // Player to the left of dealer starts
    this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % 4;
    this.state.phase = 'playing';
  }

  playCard(playerIndex: number, cardId: string): PlayCardResult {
    // Validate it's this player's turn
    if (this.state.phase !== 'playing') {
      return { success: false, error: 'Game is not in playing phase' };
    }
    if (playerIndex !== this.state.currentPlayerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    // Find card in player's hand
    const hand = this.state.hands[playerIndex];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in your hand' };
    }

    const card = hand[cardIndex];

    // Validate suit following rules
    if (!this.isValidPlay(playerIndex, card)) {
      return { success: false, error: 'You must follow the lead suit if you have it' };
    }

    // Remove card from hand
    hand.splice(cardIndex, 1);

    // Set lead suit if first card of trick
    if (this.state.currentTrick.length === 0) {
      this.state.leadSuit = card.suit;
    }

    // Add to current trick
    this.state.currentTrick.push({ card, playerIndex });

    // Check if trick is complete (4 cards played)
    if (this.state.currentTrick.length === 4) {
      return this.resolveTrick();
    }

    // Move to next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4;

    return { success: true, trickComplete: false };
  }

  private isValidPlay(playerIndex: number, card: Card): boolean {
    const hand = this.state.hands[playerIndex];

    // First card of trick - any card is valid
    if (this.state.currentTrick.length === 0) {
      return true;
    }

    const leadSuit = this.state.leadSuit!;

    // If player has cards of the lead suit, they must play one
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);
    if (hasLeadSuit) {
      return card.suit === leadSuit;
    }

    // If player doesn't have lead suit, any card is valid
    return true;
  }

  private resolveTrick(): PlayCardResult {
    const trick = this.state.currentTrick;
    const leadSuit = this.state.leadSuit!;
    const trumpSuit = this.state.trumpSuit;

    // Determine winner
    let winnerIndex = 0;
    let highestRank = -1;
    let winningWithTrump = false;

    for (let i = 0; i < trick.length; i++) {
      const { card } = trick[i];
      const cardRank = RANK_ORDER[card.rank];

      if (trumpSuit && card.suit === trumpSuit) {
        // Trump card
        if (!winningWithTrump || cardRank > highestRank) {
          winnerIndex = i;
          highestRank = cardRank;
          winningWithTrump = true;
        }
      } else if (!winningWithTrump && card.suit === leadSuit) {
        // Lead suit card (only counts if no trump has been played yet as winner)
        if (cardRank > highestRank) {
          winnerIndex = i;
          highestRank = cardRank;
        }
      }
    }

    const winnerPlayerIndex = trick[winnerIndex].playerIndex;
    const winnerTeam = getTeam(winnerPlayerIndex);

    // Track tricks won
    this.state.tricksWon[winnerTeam]++;

    // Check for captured tens
    let capturedTen = false;
    for (const { card } of trick) {
      if (card.rank === '10') {
        this.state.capturedTens[winnerTeam].push(card);
        this.state.lastCapturedTenSuit = card.suit;
        capturedTen = true;
      }
    }

    this.state.trickNumber++;
    this.state.lastTrickWinner = winnerPlayerIndex;

    const trickCards = [...trick];

    // Reset trick
    this.state.currentTrick = [];
    this.state.leadSuit = null;

    // Check if round is complete (all 13 tricks played)
    if (this.state.trickNumber === 13) {
      return this.resolveRound(winnerPlayerIndex, trickCards, capturedTen);
    }

    // Winner leads next trick
    this.state.currentPlayerIndex = winnerPlayerIndex;

    return {
      success: true,
      trickComplete: true,
      trickWinner: winnerPlayerIndex,
      trickCards,
      capturedTen,
    };
  }

  private resolveRound(
    lastTrickWinner: number,
    lastTrickCards: TrickCard[],
    lastTrickCapturedTen: boolean
  ): PlayCardResult {
    const tensA = this.state.capturedTens.A.length;
    const tensB = this.state.capturedTens.B.length;

    let roundWinner: Team | null = null;
    let isKot = false;
    let points = 0;

    if (tensA === 4) {
      roundWinner = 'A';
      isKot = true;
      points = 2;
    } else if (tensB === 4) {
      roundWinner = 'B';
      isKot = true;
      points = 2;
    } else if (tensA > tensB) {
      roundWinner = 'A';
      points = 1;
    } else if (tensB > tensA) {
      roundWinner = 'B';
      points = 1;
    }
    // If 2-2, no points awarded

    if (roundWinner) {
      this.state.matchScores[roundWinner] += points;
    }

    // Set trump for next round based on last captured ten
    if (this.state.lastCapturedTenSuit) {
      this.state.trumpSuit = this.state.lastCapturedTenSuit;
    }

    // Rotate dealer
    this.state.dealerIndex = (this.state.dealerIndex + 1) % 4;

    // Check if match is over
    const matchComplete =
      this.state.matchScores.A >= this.state.matchTarget ||
      this.state.matchScores.B >= this.state.matchTarget;

    if (matchComplete) {
      const matchWinner: Team =
        this.state.matchScores.A >= this.state.matchTarget ? 'A' : 'B';
      this.state.phase = 'matchEnd';
      return {
        success: true,
        trickComplete: true,
        trickWinner: lastTrickWinner,
        trickCards: lastTrickCards,
        capturedTen: lastTrickCapturedTen,
        roundComplete: true,
        roundWinner,
        isKot,
        matchComplete: true,
        matchWinner,
      };
    }

    this.state.phase = 'roundEnd';
    return {
      success: true,
      trickComplete: true,
      trickWinner: lastTrickWinner,
      trickCards: lastTrickCards,
      capturedTen: lastTrickCapturedTen,
      roundComplete: true,
      roundWinner,
      isKot,
      matchComplete: false,
    };
  }

  getClientState(seatIndex: number): ClientGameState {
    return {
      phase: this.state.phase,
      players: this.state.players,
      myHand: this.state.hands[seatIndex] || [],
      mySeatIndex: seatIndex,
      currentPlayerIndex: this.state.currentPlayerIndex,
      currentTrick: this.state.currentTrick,
      trickNumber: this.state.trickNumber,
      leadSuit: this.state.leadSuit,
      trumpSuit: this.state.trumpSuit,
      capturedTens: this.state.capturedTens,
      tricksWon: this.state.tricksWon,
      matchScores: this.state.matchScores,
      dealerIndex: this.state.dealerIndex,
      lastTrickWinner: this.state.lastTrickWinner,
      roundNumber: this.state.roundNumber,
      handSizes: this.state.hands.map(h => h.length),
      matchTarget: this.state.matchTarget,
    };
  }

  updatePlayerConnection(seatIndex: number, connected: boolean): void {
    if (this.state.players[seatIndex]) {
      this.state.players[seatIndex].connected = connected;
    }
  }

  resetForNewMatch(): void {
    this.state.matchScores = { A: 0, B: 0 };
    this.state.roundNumber = 0;
    this.state.trumpSuit = null;
    this.state.dealerIndex = 0;
    this.state.phase = 'waiting';
  }
}
