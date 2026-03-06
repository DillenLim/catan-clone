import { GameState, Player } from "./types";

/**
 * Strips out private information before broadcasting the GameState to a specific player.
 * Prevents cheating by inspecting the WebSocket payloads.
 */
export function sanitizeStateForPlayer(state: GameState, forPlayerId: string): any {
    // We manipulate a deep clone
    const sanitized = JSON.parse(JSON.stringify(state)) as GameState;

    for (const player of sanitized.players) {
        if (player.id !== forPlayerId) {
            // Hide other players' exact resources
            const totalResources = Object.values(player.resources).reduce((sum, val) => sum + (val || 0), 0);
            (player as any).resources = { resourceCount: totalResources };

            // Hide other players' dev cards, but keep the count
            (player as any).devCards = { devCardCount: player.devCards.length };

            // Hide visibility lock status flag
            delete (player as any).newDevCardThisTurn;
        } else {
            // For the receiving player, keep their hand intact but maybe obscure VP cards? 
            // Nah, they get to see their own VP cards.
        }
    }

    // Ensure dev deck order is NEVER exposed
    // Deck count is present, but deck array actually lives in PartyKit session if we needed to pull.
    // Currently the deck order wasn't added to GameState to avoid this leak, but we use `deckCount`.

    return sanitized;
}
