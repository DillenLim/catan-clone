import { GameState, Player } from "../types";

export function calculateVictoryPoints(player: Player, state: GameState): number {
    let vp = 0;

    // Settlements and Cities
    vp += player.settlementsBuilt * 1;
    vp += player.citiesBuilt * 2;

    // Bonus awards
    if (player.hasLongestRoad) vp += 2;
    if (player.hasLargestArmy) vp += 2;

    // Revealed VP Dev Cards (Only counts on player's own turn to check win condition)
    // According to standard rules, VP cards are kept hidden until the player can reveal
    // them along with other points to declare victory at 10.
    const vpCards = player.devCards.filter(c => c === "victory_point").length;
    vp += vpCards;

    return vp;
}

export function checkWinCondition(state: GameState): string | null {
    for (const p of state.players) {
        // Determine the VP points target dynamically based on lobby settings
        const vpToWin = state.settings.victoryPoints || 10;

        // Only the current player can win on their turn (standard rule)
        if (p.id === state.currentPlayerId) {
            if (calculateVictoryPoints(p, state) >= vpToWin) {
                return p.id;
            }
        }
    }
    return null;
}
