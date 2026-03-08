import { GameState, ResourceBundle, ResourceType, Player, Vertex } from "../types";

export function distributeResources(roll: number, state: GameState): void {
    if (roll === 7) return; // Robber phase handles this

    const yieldingHexes = state.hexes.filter(h => h.numberToken === roll && !h.hasRobber);
    if (yieldingHexes.length === 0) return;

    const distribution: Record<string, ResourceBundle> = {};
    state.players.forEach(p => distribution[p.id] = { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 });
    const totalNeeded: ResourceBundle = { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 };

    const distributionLog: { hexId: number; playerId: string; resource: ResourceType; amount: number }[] = [];

    for (const hex of yieldingHexes) {
        if (hex.type === "desert") continue;
        const res: ResourceType = hex.type === "forest" ? "wood" :
            hex.type === "field" ? "wheat" :
                hex.type === "mountain" ? "ore" :
                    hex.type === "pasture" ? "wool" : "brick";

        const adjacentVertices = state.vertices.filter(v => v.adjacentHexIds.includes(hex.id));
        for (const v of adjacentVertices) {
            if (v.building) {
                const amount = v.building.type === "city" ? 2 : 1;
                distribution[v.building.playerId][res] += amount;
                totalNeeded[res] += amount;

                distributionLog.push({
                    hexId: hex.id,
                    playerId: v.building.playerId,
                    resource: res,
                    amount
                });
            }
        }
    }

    // Check bank limits: if bank doesn't have enough, nobody gets that resource
    for (const [res, total] of Object.entries(totalNeeded)) {
        const r = res as ResourceType;
        const bankHas = state.bank[r];
        if (bankHas < total) {
            for (const p of state.players) {
                distribution[p.id][r] = 0;
            }
        } else {
            state.bank[r] -= total;
        }
    }

    for (const p of state.players) {
        const receivedStrs: string[] = [];
        for (const [res, amt] of Object.entries(distribution[p.id])) {
            if (amt > 0) {
                p.resources[res as ResourceType] += amt;
                receivedStrs.push(`[${amt} ${res}]`);
            }
        }
        if (receivedStrs.length > 0) {
            state.log.push({ timestamp: Date.now(), text: `got ${receivedStrs.join(" ")}`, playerId: p.id });
        }
    }

    state.lastDistribution = distributionLog.filter(log => {
        const playerReceivedTotal = distribution[log.playerId][log.resource];
        return playerReceivedTotal > 0;
    });
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
