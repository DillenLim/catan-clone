import type * as Party from "partykit/server";
import { GameState, ClientMessage, Player, GameLogEntry } from "../lib/types";
import { generateBoard, shuffleDevCards, shuffleArray } from "../lib/game-logic/board";
import { applyAction } from "../lib/game-logic/actions";
import { sanitizeStateForPlayer } from "../lib/sanitize";

export default class CatanRoom implements Party.Server {
    gameState: GameState;

    // Actually tracking deck order (hidden from clients)
    devCardDeckOrder: import("../lib/types").DevCardType[] = [];

    constructor(readonly room: Party.Room) {
        // Initialize default empty state
        this.gameState = this.createEmptyState(room.id);
    }

    createEmptyState(roomCode: string): GameState {
        return {
            roomCode,
            status: "lobby",
            players: [],
            turnOrder: [],
            currentPlayerId: "",
            phase: "initial_settlement",
            initialPlacementRound: 1,
            initialPlacementIndex: 0,
            hexes: [],
            vertices: [],
            edges: [],
            bank: { wood: 19, brick: 19, wool: 19, wheat: 19, ore: 19 },
            devCardDeckCount: 25,
            freeRoadsRemaining: 0,
            longestRoadPlayerId: null,
            longestRoadLength: 0,
            largestArmyPlayerId: null,
            largestArmyCount: 0,
            lastDiceRoll: null,
            lastDistribution: null,
            pendingDiscarders: [],
            pendingTradeOffer: null,
            log: [],
            winnerId: null,
            settings: {
                boardLayout: "random",
                victoryPoints: 10,
                maritimeOnly: false,
                turnTimerSeconds: null,
            }
        };
    }

    broadcastState() {
        if (!this.gameState) return;

        // Send customized state to each connected player
        for (const player of this.gameState.players) {
            if (player.isConnected) {
                const connection = this.room.getConnection(player.id);
                if (connection) {
                    const sanitized = sanitizeStateForPlayer(this.gameState, player.id);
                    connection.send(JSON.stringify({
                        type: "STATE_UPDATE",
                        payload: sanitized
                    }));
                }
            }
        }
    }

    onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        // Send current game state to newly connected player
        const sanitized = sanitizeStateForPlayer(this.gameState, conn.id);
        conn.send(JSON.stringify({ type: "STATE_UPDATE", payload: sanitized }));
    }

    onMessage(message: string, sender: Party.Connection) {
        const msg = JSON.parse(message) as ClientMessage;

        if (msg.type === "JOIN") {
            const existing = this.gameState.players.find(p => p.id === msg.playerId);
            if (existing) {
                existing.isConnected = true;
            } else {
                if (this.gameState.status !== "lobby") {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Game already started." }));
                    return;
                }
                if (this.gameState.players.length >= 4) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Room is full (4 players max)." }));
                    return;
                }
                if (this.gameState.players.some(p => p.color === msg.player.color)) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "That color is already taken. Pick another." }));
                    return;
                }
                const newPlayer: Player = {
                    id: msg.playerId,
                    name: msg.player.name,
                    color: msg.player.color,
                    resources: { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 },
                    devCards: [],
                    devCardPlayedThisTurn: false,
                    devCardsBoughtThisTurn: [],
                    knightsPlayed: 0,
                    roadsBuilt: 0,
                    settlementsBuilt: 0,
                    citiesBuilt: 0,
                    hasLongestRoad: false,
                    hasLargestArmy: false,
                    isReady: false,
                    isConnected: true,
                    isHost: this.gameState.players.length === 0,
                };
                this.gameState.players.push(newPlayer);
            }
            this.broadcastState();
        }

        if (msg.type === "READY") {
            const player = this.gameState.players.find(p => p.id === msg.playerId);
            if (player) {
                player.isReady = !player.isReady;
                this.broadcastState();
            }
        }

        if (msg.type === "START_GAME") {
            const player = this.gameState.players.find(p => p.id === msg.playerId);
            if (!player?.isHost) {
                sender.send(JSON.stringify({ type: "ERROR", message: "Only host can start." }));
                return;
            }
            if (this.gameState.players.length < 2) {
                sender.send(JSON.stringify({ type: "ERROR", message: "Need at least 2 players." }));
                return;
            }
            if (!this.gameState.players.every(p => p.isReady)) {
                sender.send(JSON.stringify({ type: "ERROR", message: "Not all players are ready." }));
                return;
            }

            // Initialize Board
            const { hexes, vertices, edges } = generateBoard();
            this.gameState.hexes = hexes;
            this.gameState.vertices = vertices;
            this.gameState.edges = edges;

            // Initialize Deck
            this.devCardDeckOrder = shuffleDevCards();
            this.gameState.devCardDeckCount = this.devCardDeckOrder.length;

            // Randomize turn order
            this.gameState.turnOrder = shuffleArray(this.gameState.players.map(p => p.id));
            this.gameState.currentPlayerId = this.gameState.turnOrder[0];

            this.gameState.status = "initial_placement";
            this.gameState.phase = "initial_settlement";
            this.gameState.log.push({ timestamp: Date.now(), text: "Game started!" });

            this.broadcastState();
        }

        if (msg.type === "ACTION") {
            // Intercept buying a dev card because it requires server-side deck manipulation
            if (msg.payload.type === "BUY_DEV_CARD") {
                const player = this.gameState.players.find(p => p.id === msg.playerId);
                if (!player) return;

                // Validate turn and phase
                if (this.gameState.currentPlayerId !== msg.playerId) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Not your turn." }));
                    return;
                }
                if (this.gameState.phase !== "action") {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Cannot buy dev card during this phase." }));
                    return;
                }

                if (this.devCardDeckOrder.length === 0) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Deck is empty." }));
                    return;
                }

                const cost = { wool: 1, wheat: 1, ore: 1 };
                let canAfford = true;
                for (const [res, amt] of Object.entries(cost)) {
                    if ((player.resources[res as keyof import("../lib/types").ResourceBundle] || 0) < amt) canAfford = false;
                }

                if (!canAfford) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Cannot afford Dev Card." }));
                    return;
                }

                // Process payment
                player.resources.wool! -= 1;
                player.resources.wheat! -= 1;
                player.resources.ore! -= 1;
                this.gameState.bank.wool! += 1;
                this.gameState.bank.wheat! += 1;
                this.gameState.bank.ore! += 1;

                // Give card
                const card = this.devCardDeckOrder.pop()!;
                player.devCards.push(card);
                player.devCardsBoughtThisTurn.push(player.devCards.length - 1); // Track the index
                this.gameState.devCardDeckCount = this.devCardDeckOrder.length;
                this.gameState.lastDistribution = null; // Prevent animation replay
                this.gameState.log.push({ timestamp: Date.now(), text: "bought a development card", playerId: msg.playerId });

                this.broadcastState();
                return;
            }

            const result = applyAction(msg.payload, msg.playerId, this.gameState);
            if (result.valid) {
                this.gameState = result.newState;
                this.broadcastState();
            } else {
                sender.send(JSON.stringify({ type: "ERROR", message: result.error }));
            }
        }

        if (msg.type === "CHAT") {
            const player = this.gameState.players.find(p => p.id === msg.playerId);
            if (player) {
                this.room.broadcast(JSON.stringify({
                    type: "CHAT",
                    payload: { playerId: player.id, name: player.name, text: msg.payload.text, timestamp: Date.now() }
                }));
            }
        }

        if (msg.type === "SETTINGS_UPDATE") {
            const player = this.gameState.players.find(p => p.id === msg.playerId);
            if (!player?.isHost) {
                sender.send(JSON.stringify({ type: "ERROR", message: "Only host can change settings." }));
                return;
            }
            if (this.gameState.status !== "lobby") {
                sender.send(JSON.stringify({ type: "ERROR", message: "Cannot change settings after game started." }));
                return;
            }
            this.gameState.settings = { ...this.gameState.settings, ...msg.settings };
            this.broadcastState();
        }
    }

    onClose(conn: Party.Connection) {
        const player = this.gameState.players.find(p => p.id === conn.id);
        if (player) {
            player.isConnected = false;

            // If host disconnected, promote first connected player
            if (player.isHost) {
                const nextHost = this.gameState.players.find(p => p.isConnected);
                if (nextHost) {
                    player.isHost = false;
                    nextHost.isHost = true;
                    this.gameState.log.push({ timestamp: Date.now(), text: `${nextHost.name} is now the host.` });
                }
            }

            // If it's the disconnected player's turn during active play, auto-skip after a delay
            if (
                (this.gameState.status === "playing" || this.gameState.status === "initial_placement") &&
                this.gameState.currentPlayerId === conn.id
            ) {
                setTimeout(() => {
                    // Re-check: player might have reconnected
                    const p = this.gameState.players.find(pl => pl.id === conn.id);
                    if (p && !p.isConnected && this.gameState.currentPlayerId === conn.id) {
                        const pIdx = this.gameState.turnOrder.indexOf(conn.id);
                        this.gameState.currentPlayerId = this.gameState.turnOrder[(pIdx + 1) % this.gameState.turnOrder.length];
                        this.gameState.phase = "roll";
                        this.gameState.log.push({ timestamp: Date.now(), text: `${p.name} disconnected. Turn skipped.` });
                        this.broadcastState();
                    }
                }, 15000); // 15 second grace period
            }

            this.broadcastState();
        }
    }
}
