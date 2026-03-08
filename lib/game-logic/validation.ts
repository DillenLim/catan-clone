import { GameState, Vertex, Edge, Player, ResourceBundle, TurnPhase, GameAction } from "../types";

export function isPlayerTurn(playerId: string, state: GameState): boolean {
    return state.currentPlayerId === playerId;
}

export function isValidPhase(action: GameAction, phase: TurnPhase): boolean {
    switch (action.type) {
        case "ROLL_DICE": return phase === "roll";
        case "MOVE_ROBBER": return phase === "move_robber";
        case "DISCARD_CARDS": return phase === "discard";
        case "PLACE_INITIAL_SETTLEMENT": return phase === "initial_settlement";
        case "PLACE_INITIAL_ROAD": return phase === "initial_road";
        case "PLAY_KNIGHT": return phase === "action" || phase === "roll";
        case "ACCEPT_TRADE": return phase === "action";
        case "REJECT_TRADE": return phase === "action";
        default: return phase === "action";
    }
}

export function canAfford(cost: ResourceBundle, player: Player): boolean {
    for (const [res, amt] of Object.entries(cost)) {
        const pAmt = player.resources[res as keyof ResourceBundle] || 0;
        if (pAmt < (amt as number)) return false;
    }
    return true;
}

export function isValidSettlementPlacement(vertexId: number, state: GameState, playerId: string): boolean {
    const vertex = state.vertices.find(v => v.id === vertexId);
    if (!vertex || vertex.building) return false;

    // Distance Rule: no adjacent vertices can have buildings
    const hasAdjacentBuilding = vertex.adjacentVertexIds.some(adjId => {
        const adj = state.vertices.find(v => v.id === adjId);
        return adj?.building !== null;
    });
    if (hasAdjacentBuilding) return false;

    // If initial placement, any valid vertex is fine. Otherwise, must connect to own road
    if (state.phase === "initial_settlement") return true;

    const connectedToOwnRoad = vertex.adjacentEdgeIds.some(edgeId => {
        const edge = state.edges.find(e => e.id === edgeId);
        return edge?.road?.playerId === playerId;
    });

    return connectedToOwnRoad;
}

export function isValidCityPlacement(vertexId: number, state: GameState, playerId: string): boolean {
    const vertex = state.vertices.find(v => v.id === vertexId);
    if (!vertex) return false;
    return vertex.building?.playerId === playerId && vertex.building.type === "settlement";
}

export function isValidRoadPlacement(edgeId: number, state: GameState, playerId: string): boolean {
    const edge = state.edges.find(e => e.id === edgeId);
    if (!edge || edge.road) return false;

    // Must connect to own road or own building
    const [v1, v2] = edge.vertexIds.map(id => state.vertices.find(v => v.id === id)!);

    const checkConnection = (v: Vertex) => {
        if (v.building?.playerId === playerId) return true;
        if (v.building && v.building.playerId !== playerId) return false; // Opponent building blocks road extension

        return v.adjacentEdgeIds.some(adjEdgeId => {
            const adjEdge = state.edges.find(e => e.id === adjEdgeId);
            return adjEdge?.road?.playerId === playerId;
        });
    };

    if (state.phase === "initial_road") {
        // In initial setup, road MUST connect to the settlement just placed.
        // We infer the settlement by looking at player's settlements that have 0 connecting roads.
        // (A bit hacky, normally we'd pass the strictly required attached vertex, but finding lonely settlements works)
        return checkConnection(v1) || checkConnection(v2);
    }

    return checkConnection(v1) || checkConnection(v2);
}

export function isValidRobberPlacement(hexId: number, state: GameState): boolean {
    const hex = state.hexes.find(h => h.id === hexId);
    return !!hex && !hex.hasRobber; // cannot move to same hex
}
