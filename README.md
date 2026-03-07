# Catan Friends 🏰🎲

A modern, minimal, web-based Catan clone designed for playing with friends. Built with Next.js, React, Tailwind CSS, and PartyKit for live multiplayer synchronization.

## Features ✨

### Core Gameplay
- Fully functional Hexagonal Board generation and interaction.
- Complete game loop: Rolling dice, resource distribution, trading, building, and playing Development Cards.
- "Longest Road" and "Largest Army" tracking.
- Robber functionality (discarding half your cards and stealing).
- Win condition tracking (10 Victory Points).

### Highly Polished Visuals & UX
We've focused heavily on making the UI not just functional, but a joy to use. Recent updates include:
- **Translucent Ghost Previews**: When building a road, settlement, or city, hovering over a valid spot displays a pulsing, translucent 3D preview of your actual game piece, rather than generic outlines or white boxes.
- **Colonist-Style Animations**: When resources are gathered after a dice roll, animated icons burst from the producing hex and fly directly into the players' scoreboards on the sidebar.
- **Thematic Interactive UI**: The Robber "Discard Cards" sequence utilizes a dark, immersive modal where players click directly on physical resource cards to move them between their "Hand" and the "Discard Pile".
- **Rich Text Game Logs**: The live game log automatically parses actions to display beautiful inline resource badges (e.g., `[1 Wood]`) and building icons.
- **Dynamic Layout**: A dark-glass themed sidebar that smartly flows from Game Logs to Player Stats, Bank availability, and Build Menus without requiring scrolling.

## Tech Stack 🛠️

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Framer Motion (for animations).
- **Backend/Multiplayer:** [PartyKit](https://www.partykit.io/) (WebSockets for real-time state synchronization).
- **Icons:** Lucide React.

## Getting Started 🚀

1. **Install dependencies:**
    ```bash
    npm install
    ```

2. **Start the development servers:**
    You need to run both the Next.js frontend and the PartyKit backend locally.

    Terminal 1 (Next.js App):
    ```bash
    npm run dev
    ```

    Terminal 2 (PartyKit Server):
    ```bash
    npx partykit dev
    ```

3. **Play:**
    Open [http://localhost:3000](http://localhost:3000) with your browser. From the home screen, you can generate a room code and invite friends to join your live game.

## Architecture Highlights
- `lib/game-logic/`: Contains pure functions defining the strict rules of Catan (board generation, validating actions, checking costs).
- `party/index.ts`: The authoritative game server. It holds the canonical `GameState` and safely applies actions broadcasted from connected clients via websockets.
- `app/room/[code]/page.tsx`: The main game UI wrapper that connects to the PartyKit room and renders the board and sidebars.
