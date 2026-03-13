"use client";

import { useEffect, useRef } from "react";
import { GameState } from "../lib/types";
import { useSound } from "./useSound";

/**
 * Watches game state transitions and triggers appropriate sound effects.
 * Compares previous state with current state to detect events.
 */
export function useSoundEffects(state: GameState | null, myPlayerId: string) {
    const { play } = useSound();
    const prev = useRef<GameState | null>(null);

    useEffect(() => {
        if (!state) return;
        const p = prev.current;
        prev.current = state;

        // Skip the very first state (no previous to compare)
        if (!p) return;

        // ── Game started ──
        if (p.status === "lobby" && state.status !== "lobby") {
            play("gameStarted");
            return;
        }

        // ── Victory ──
        if (!p.winnerId && state.winnerId) {
            play("victory");
            return;
        }

        // ── Dice rolled ──
        if (state.lastDiceRoll && (!p.lastDiceRoll || p.lastDiceRoll[0] !== state.lastDiceRoll[0] || p.lastDiceRoll[1] !== state.lastDiceRoll[1])) {
            play("diceRoll");
        }

        // ── Your turn started ──
        if (state.currentPlayerId === myPlayerId && p.currentPlayerId !== myPlayerId && state.phase === "roll") {
            play("yourTurn");
        }

        // ── Discard notification (you need to discard) ──
        if (state.pendingDiscarders.includes(myPlayerId) && !p.pendingDiscarders.includes(myPlayerId)) {
            play("discardNotify");
        }

        // ── Robber moved ──
        const prevRobberHex = p.hexes.find(h => h.hasRobber)?.id;
        const currRobberHex = state.hexes.find(h => h.hasRobber)?.id;
        if (prevRobberHex !== currRobberHex) {
            play("robberPlace");
        }

        // ── Buildings placed ──
        // Count buildings across all vertices
        const prevBuildings = { settlement: 0, city: 0 };
        const currBuildings = { settlement: 0, city: 0 };
        for (const v of p.vertices) {
            if (v.building) prevBuildings[v.building.type]++;
        }
        for (const v of state.vertices) {
            if (v.building) currBuildings[v.building.type]++;
        }
        if (currBuildings.city > prevBuildings.city) {
            play("cityPlace");
        } else if (currBuildings.settlement > prevBuildings.settlement) {
            play("settlementPlace");
        }

        // ── Roads placed ──
        const prevRoads = p.edges.filter(e => e.road).length;
        const currRoads = state.edges.filter(e => e.road).length;
        if (currRoads > prevRoads) {
            play("roadPlace");
        }

        // ── Dev card bought ──
        if (state.devCardDeckCount < p.devCardDeckCount) {
            play("devCardBought");
        }

        // ── Dev card played (knight, monopoly, etc.) ──
        // Detect via log entries mentioning "played"
        if (state.log.length > p.log.length) {
            const newEntries = state.log.slice(p.log.length);
            for (const entry of newEntries) {
                if (entry.text.includes("played") && entry.text.includes("[knight]")) {
                    play("devCardPlayed");
                    break;
                }
                if (entry.text.includes("played") && entry.text.includes("[monopoly]")) {
                    play("monopoly");
                    break;
                }
                if (entry.text.includes("played") && (entry.text.includes("[road_building]") || entry.text.includes("[year_of_plenty]"))) {
                    play("devCardPlayed");
                    break;
                }
            }
        }

        // ── Trade offer ──
        if (state.pendingTradeOffer && !p.pendingTradeOffer) {
            if (state.pendingTradeOffer.fromPlayerId !== myPlayerId) {
                play("tradeOffer");
            }
        }

        // ── Trade accepted (offer cleared + resources changed for both parties) ──
        if (p.pendingTradeOffer && !state.pendingTradeOffer) {
            // Check if resources changed for the offering player (indicates acceptance vs cancellation)
            const offeringId = p.pendingTradeOffer.fromPlayerId;
            const prevPlayer = p.players.find(pl => pl.id === offeringId);
            const currPlayer = state.players.find(pl => pl.id === offeringId);
            if (prevPlayer && currPlayer) {
                const resourcesChanged = Object.keys(prevPlayer.resources).some(
                    r => prevPlayer.resources[r as keyof typeof prevPlayer.resources] !== currPlayer.resources[r as keyof typeof currPlayer.resources]
                );
                if (resourcesChanged) {
                    play("tradeAccepted");
                } else {
                    play("tradeRejected");
                }
            }
        }

        // ── Achievements: longest road / largest army ──
        if (state.longestRoadPlayerId && state.longestRoadPlayerId !== p.longestRoadPlayerId) {
            play("achievement");
        }
        if (state.largestArmyPlayerId && state.largestArmyPlayerId !== p.largestArmyPlayerId) {
            play("achievement");
        }

        // ── Player connection changes ──
        for (const player of state.players) {
            const prevP = p.players.find(pl => pl.id === player.id);
            if (prevP) {
                if (prevP.isConnected && !player.isConnected) play("disconnect");
                if (!prevP.isConnected && player.isConnected) play("reconnect");
            }
        }

        // ── Player joined lobby ──
        if (state.status === "lobby" && state.players.length > p.players.length) {
            play("joinRoom");
        }
        if (state.status === "lobby" && state.players.length < p.players.length) {
            play("leaveRoom");
        }

    }, [state, myPlayerId, play]);
}
