# 🃏 Dehla Pakad - Multiplayer Card Game

A production-quality multiplayer web application for the classic Indian card game **Dehla Pakad** (Ten Capture).

## Game Rules

- **Players**: 4 players in 2 teams (Seats 1 & 3 = Team A, Seats 2 & 4 = Team B)
- **Deck**: Standard 52-card deck, all cards dealt (13 per player)
- **Objective**: Capture the four 10s (Dehlas)
- **Trump**: No trump in Round 1. From Round 2+, trump is the suit of the last 10 captured in the previous round.
- **Suit Following**: Must follow the led suit if possible. If not, play any card (including trump).
- **Trick Winner**: Highest trump wins if any trumps played; otherwise highest card of led suit.
- **Scoring**: 3 tens = 1 point, 4 tens (Kot) = 2 points, 2-2 = draw
- **Match**: First team to 5 points wins

## Architecture

```
dehla-pakad/
├── shared/                  # Shared TypeScript types
│   └── types.ts
├── server/                  # Node.js + Express + Socket.io
│   └── src/
│       ├── index.ts         # Server entry point
│       ├── game/
│       │   └── GameEngine.ts  # Authoritative game logic
│       ├── rooms/
│       │   └── RoomManager.ts # Room & player management
│       └── socket/
│           └── handlers.ts    # Socket.io event handlers
├── client/                  # React + Vite + TailwindCSS
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── components/      # UI components
│       │   ├── PlayingCard.tsx
│       │   ├── Hand.tsx
│       │   ├── GameBoard.tsx
│       │   ├── Lobby.tsx
│       │   ├── PlayerSeat.tsx
│       │   ├── TrickArea.tsx
│       │   ├── ScoreBoard.tsx
│       │   └── Notifications.tsx
│       ├── hooks/
│       │   └── useSocket.ts   # Socket event hooks
│       ├── store/
│       │   └── gameStore.ts   # Zustand state management
│       └── lib/
│           ├── socket.ts      # Socket.io client setup
│           └── cards.ts       # Card utilities
└── README.md
```

## Game Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Home    │───▶│  Lobby   │───▶│  Game    │───▶│  Match   │
│  Screen  │    │  (Wait   │    │  Board   │    │  End     │
│          │    │   for 4) │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  Round End   │──▶ Next Round
                              │  (Score)     │
                              └──────────────┘
```

**Server-side flow per trick:**
1. Player plays a card → server validates (correct turn, suit following)
2. Server broadcasts card played to all clients
3. After 4 cards: server resolves trick winner, checks for captured 10s
4. After 13 tricks: server calculates round score, checks match end
5. State updates sent to each player (each sees only their own hand)

## Running Locally

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Development

Open two terminal windows:

**Terminal 1 — Server (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — Client (port 5173):**
```bash
cd client
npm run dev
```

Open **http://localhost:5173** in 4 browser tabs to simulate 4 players.

### Production Build

```bash
# Build client
cd client
npm run build

# Start server (serves API only; deploy client separately)
cd ../server
npm run build
npm start
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript |
| State | Zustand |
| Animations | Framer Motion |
| Styling | TailwindCSS 3 |
| Realtime | Socket.io |
| Backend | Node.js, Express |
| Transport | WebSockets |

## Deployment Suggestions

### Client (Vercel)
```bash
cd client
npx vercel --prod
```
Set `VITE_SERVER_URL` env var to your server URL.

### Server (Render / Fly.io)

**Render:**
- Create a new Web Service pointing to the `server/` directory
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Set `CLIENT_URL` env var to your Vercel client URL

**Fly.io:**
```bash
cd server
fly launch
fly deploy
```

## Key Design Decisions

- **Authoritative server**: All game logic runs server-side. Clients send intents, server validates and broadcasts results. Prevents cheating.
- **Per-player state views**: Each client only receives their own hand. Other players' hands are hidden (only card counts shown).
- **Reconnection support**: Players can reconnect to an in-progress game using room code.
- **Clean separation**: Game engine has zero knowledge of networking. Socket handlers are a thin adapter layer.
- **Optimistic UI**: Cards are removed from hand immediately on play for snappy feel; server state reconciles on next update.
