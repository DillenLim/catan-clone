# Catan Clone

A real-time, web-based implementation of the Catan board game. This project demonstrates complex state synchronization, interactive game loop management, and advanced UI rendering using a modern web stack.

## Tech Stack & Architecture

- **Frontend Framework:** Next.js 14 (App Router) with React 18. Chosen for robust routing and server-side rendering capabilities, optimizing the initial load of the game environment.
- **Real-time Engine:** PartyKit (WebSockets). Selected for its edge-native websocket handling and durable state capabilities. It maintains the authoritative `GameState` and safely broadcasts deltas/actions to connected clients.
- **Styling & UI:** Tailwind CSS. Used for rapid, utility-first styling.
- **Animations:** Framer Motion. Applied for complex orchestrations, specifically resource distribution flyouts and dynamic board element reveals, enhancing the UX without sacrificing performance.
- **Icons:** Lucide React.

## Core Systems Implementation

### Game Logic (`lib/game-logic/`)
The game engine is built using pure functions. This enforces strict separation of concerns, allowing the same logic to predict local UI states and validate authoritative moves on the backend.
- **Board Generation:** Randomized hex grid generation utilizing coordinate mapping to establish vertices (settlements/cities) and edges (roads).
- **Turn & Phase Management:** State machine handling the strict flow of Catan (Rolling -> Trading -> Building).
- **Rule Validation:** Pre-flight checks for resource affordability, placement validity (distance rules), and turn sequence.

### State Synchronization (`party/index.ts`)
The PartyKit server acts as the single source of truth.
- Clients dispatch serializable actions (e.g., `BUILD_ROAD`, `OFFER_TRADE`).
- The server validates the action against the current `GameState`.
- If valid, the state is mutated, and the updated state is broadcasted to all active connections in the room.

### Rendering & UX (`app/room/[code]/page.tsx`)
The primary game view connects to the PartyKit socket and renders the board dynamically based on the synced state.
- **Optimized Rendering:** The HexBoard and its interactive vertices/edges are rendered using absolute positioning based on a meticulously calculated coordinate system to ensure perfect alignment across varying screen sizes.
- **Visual Feedback:** Implements predictive UI interactions, such as translucent ghost placement indicators for valid build locations and an interactive Robber discard modal that operates on actual resource card elements rather than abstract numerical counters.

## Local Development

Both the Next.js frontend and the PartyKit backend must be running simultaneously for the application to function locally.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Next.js frontend:**
   ```bash
   npm run dev
   ```

3. **Start the PartyKit websocket server:**
   ```bash
   npx partykit dev
   ```

4. **Access the application:**
   Navigate to `http://localhost:3000`. Create a new room to initiate a game session.
