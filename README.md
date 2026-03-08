# Catan Clone

A real-time, web-based implementation of Catan. This project focuses on strict state synchronization, predictive UI feedback, and a maintainable game engine structure.

## Tech Stack
- **Frontend**: Next.js 14, React 18, TailwindCSS, Framer Motion
- **Backend / Multiplayer**: PartyKit, WebSockets
- **Languages**: TypeScript, HTML, CSS

## Features

- **Authoritative Server**: Validates rules, resource constraints, and placement distances.
- **Predictive Rendering**: Valid builds show translucent previews before socket confirmation.
- **Synchronized Game Loop**: Strict enforcement of Rolling -> Trading -> Building sequences.
- **Rich Logging**: Real-time event log parsing actions into inline UI badges.
- **Robber Mechanics**: Interactive discard modal acting directly on resource elements.

## Architecture & State

### 1. Game State Engine (`lib/game-logic/`)
The engine is written as pure functions. The `GameState` object contains arrays of `Hex`, `Vertex`, and `Edge` objects modeled via an accurate coordinate grid. Functions like `distributeResources` and `canAfford` execute deterministically, allowing parallel validation on both client and server.

### 2. Synchronization (`party/index.ts`)
**PartyKit (WebSockets)** runs the authoritative backend. 
- Clients emit serializeable intent objects (e.g., `BUILD_SETTLEMENT`, `OFFER_TRADE`).
- The server applies the action to the in-memory state.
- The server broadcasts the mutated state to all concurrent room members.

### 3. Client Rendering (`app/room/[code]/page.tsx`)
**Next.js 14 (App Router)** drives the frontend. The `HexBoard` component translates the abstract coordinate system into absolute pixel coordinates for rendering. Framer Motion handles complex layout shifts (like resource distribution flyouts) independent of the core React render cycle.

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Next.js (Frontend):**
   ```bash
   npm run dev
   ```

3. **Start PartyKit (Backend):**
   ```bash
   npx partykit dev
   ```
Navigate to `http://localhost:3000` to start a session.

## Vercel Deployment

This application utilizes two separate domains: one for the static/serverless frontend, and one for the persistent WebSocket backend.

1. **Deploy Frontend (Next.js):**
   - Push your repository to GitHub.
   - Import the repository in your Vercel dashboard.
   - Vercel will automatically detect Next.js and build it.
   - *Note: Once the backend is deployed, you will need to set an Environment Variable in Vercel pointing to the backend URL (e.g., `NEXT_PUBLIC_PARTYKIT_HOST`).*

2. **Deploy Backend (PartyKit):**
   - Ensure you are logged into the PartyKit CLI: `npx partykit login`
   - Run the deploy script from your terminal:
     ```bash
     npx partykit deploy
     ```
   - Copy the deployed PartyKit URL and add it to your Next.js Vercel environment variables. Redeploy Next.js if necessary.
