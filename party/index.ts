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
            longestRoadPlayerId: null,
            longestRoadLength: 0,
            largestArmyPlayerId: null,
            largestArmyCount: 0,
            lastDiceRoll: null,
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
        // Send customized state to each connected client
        const connections = Array.from(this.room.getConnections() as Iterable<any>);
        for (const conn of connections) {
            const sanitized = sanitizeStateForPlayer(this.gameState, conn.id);
            conn.send(JSON.stringify({ type: "STATE_UPDATE", payload: sanitized }));
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
                const newPlayer: Player = {
                    id: msg.playerId,
                    name: msg.player.name,
                    color: msg.player.color,
                    resources: { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 },
                    devCards: [],
                    newDevCardThisTurn: false,
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
            const { hexes, vertices, edges } = generateBoard(this.gameState.settings.boardLayout);
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
            // Intercept buying a dev card because it requires Server side deck manipulation
            if (msg.payload.type === "BUY_DEV_CARD") {
                const player = this.gameState.players.find(p => p.id === msg.playerId);
                if (!player) return;

                if (this.devCardDeckOrder.length === 0) {
                    sender.send(JSON.stringify({ type: "ERROR", message: "Deck is empty." }));
                    return;
                }

                const result = applyAction({ type: "BUY_DEV_CARD" }, msg.playerId, this.gameState);
                // applyAction normally doesn't mutate devCards since it lacks deck knowledge.
                // We handle the valid payment check here:
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
                player.newDevCardThisTurn = true;
                this.gameState.devCardDeckCount = this.devCardDeckOrder.length;
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
    }

    onClose(conn: Party.Connection) {
        const player = this.gameState.players.find(p => p.id === conn.id);
        if (player) {
            player.isConnected = false;
            this.broadcastState();

            // If host disconnected, promote first connected player
            if (player.isHost) {
                const nextHost = this.gameState.players.find(p => p.isConnected);
                if (nextHost) {
                    player.isHost = false;
                    nextHost.isHost = true;
                    this.gameState.log.push({ timestamp: Date.now(), text: `${nextHost.name} is now the host.` });
                    this.broadcastState();
                }
            }
        }
    }
}
