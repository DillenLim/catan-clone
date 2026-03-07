import { GameState, ResourceBundle, Player, Vertex } from "../types";

export function distributeResources(roll: number, state: GameState): GameState {
    if (roll === 7) return state; // Robber phase handles this

    // Find all hexes matching roll
    const yieldingHexes = state.hexes.filter(h => h.numberToken === roll && !h.hasRobber);
    if (yieldingHexes.length === 0) return state;

    // Map players to what they should receive
    const distribution: Record<string, ResourceBundle> = {};
    state.players.forEach(p => distribution[p.id] = { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 });
    const totalNeeded: ResourceBundle = { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 };

    const distributionLog: { hexId: number; playerId: string; resource: import("../types").ResourceType; amount: number }[] = [];

    for (const hex of yieldingHexes) {
        if (hex.type === "desert") continue;
        const res = hex.type === "forest" ? "wood" :
            hex.type === "field" ? "wheat" :
                hex.type === "mountain" ? "ore" :
                    hex.type === "pasture" ? "wool" : "brick";

        // Find all adjacent vertices with buildings
        const adjacentVertices = state.vertices.filter(v => v.adjacentHexIds.includes(hex.id));
        for (const v of adjacentVertices) {
            if (v.building) {
                const amount = v.building.type === "city" ? 2 : 1;
                distribution[v.building.playerId][res] = (distribution[v.building.playerId][res] || 0) + amount;
                totalNeeded[res] = (totalNeeded[res] || 0) + amount;

                // Record the specific source hex for animations
                distributionLog.push({
                    hexId: hex.id,
                    playerId: v.building.playerId,
                    resource: res,
                    amount
                });
            }
        }
    }

    // Check bank limits (standard rule: if bank doesn't have enough of a resource, nobody gets any of that resource)
    // But wait, if bank runs out, technically they get 0. Let's simplify and just drain the bank.
    for (const [res, total] of Object.entries(totalNeeded)) {
        const bankHas = state.bank[res as keyof ResourceBundle] || 0;
        if (bankHas < total) {
            // Bank doesn't have enough: no one gets this resource this turn for this roll
            for (const p of state.players) {
                distribution[p.id][res as keyof ResourceBundle] = 0;
            }
        } else {
            // Deduct from bank
            state.bank[res as keyof ResourceBundle] = bankHas - total;
        }
    }

    for (const p of state.players) {
        const receivedStrs: string[] = [];
        for (const [res, amt] of Object.entries(distribution[p.id])) {
            if (amt && amt > 0) {
                p.resources[res as keyof ResourceBundle] = (p.resources[res as keyof ResourceBundle] || 0) + (amt as number);
                receivedStrs.push(`[${amt} ${res}]`);
            }
        }
        if (receivedStrs.length > 0) {
            state.log.push({ timestamp: Date.now(), text: `got ${receivedStrs.join(" ")}`, playerId: p.id });
        }
    }

    // Attach the layout data for animations. If someone got 0 because of bank limits, we filter them out.
    state.lastDistribution = distributionLog.filter(log => {
        const playerReceivedTotal = distribution[log.playerId][log.resource] || 0;
        return playerReceivedTotal > 0;
    });

    return state;
}

export function getHarborRates(playerId: string, vertices: Vertex[]): Partial<Record<string, number>> {
    const rates: Record<string, number> = {
        wood: 4, brick: 4, wool: 4, wheat: 4, ore: 4
    };

    const playerVertices = vertices.filter(v => v.building?.playerId === playerId);
    for (const v of playerVertices) {
        if (v.harbor) {
            if (v.harbor.type === "generic") {
                for (const k in rates) rates[k] = Math.min(rates[k], 3);
            } else {
                rates[v.harbor.type] = 2;
            }
        }
    }

    return rates;
}
