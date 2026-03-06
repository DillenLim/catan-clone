import { GameState, Edge, Vertex } from "../types";

export function calculateLongestRoad(playerId: string, edges: Edge[], vertices: Vertex[]): number {
    const playerEdges = edges.filter(e => e.road?.playerId === playerId);
    if (playerEdges.length === 0) return 0;

    // Build adjacency graph for player's roads
    // Nodes are vertex IDs. A player road connects two vertex IDs.
    // We cannot traverse through a vertex occupied by an opponent's building.

    const adj = new Map<number, number[]>();
    for (const e of playerEdges) {
        const [v1, v2] = e.vertexIds;

        // Check if vertex is blocked by opponent
        const vert1 = vertices.find(v => v.id === v1);
        const vert2 = vertices.find(v => v.id === v2);

        // Can traverse OUT of a blocked vertex if we started there, but standard rule: 
        // an opponent's settlement "breaks" the road.
        const isBlocked = (v: Vertex) => v.building && v.building.playerId !== playerId;

        if (!adj.has(v1)) adj.set(v1, []);
        if (!adj.has(v2)) adj.set(v2, []);

        // Only add edge to graph if neither vertex blocks passage, OR we just consider edges
        // Actually, DFS on edges is better than DFS on vertices to find longest path without reusing edges.
    }

    let maxLength = 0;

    // DFS function to find longest path from a given vertex, taking care not to reuse edges
    function dfs(v: number, visitedEdges: Set<number>, currentLength: number) {
        maxLength = Math.max(maxLength, currentLength);

        const vertexNode = vertices.find(node => node.id === v);
        // If opponent building is here, we can't continue 'through' it
        if (vertexNode && vertexNode.building && vertexNode.building.playerId !== playerId) {
            return;
        }

        const connectedEdges = playerEdges.filter(e => e.vertexIds.includes(v) && !visitedEdges.has(e.id));

        for (const edge of connectedEdges) {
            const nextV = edge.vertexIds[0] === v ? edge.vertexIds[1] : edge.vertexIds[0];
            visitedEdges.add(edge.id);
            dfs(nextV, visitedEdges, currentLength + 1);
            visitedEdges.delete(edge.id);
        }
    }

    // Start DFS from every vertex that is part of a player road
    const allVerticesInRoads = new Set(playerEdges.flatMap(e => e.vertexIds));
    for (const startV of Array.from(allVerticesInRoads)) {
        dfs(startV, new Set<number>(), 0);
    }

    return maxLength;
}

export function updateLongestRoad(state: GameState): GameState {
    for (const p of state.players) {
        p.roadsBuilt = calculateLongestRoad(p.id, state.edges, state.vertices);
    }

    let newLongestId = state.longestRoadPlayerId;
    let newLongestLength = state.longestRoadLength;

    // Rule: Must be >= 5 to claim.
    // Rule: Challenger must strictly exceed to steal.
    for (const p of state.players) {
        if (p.roadsBuilt >= 5 && p.roadsBuilt > newLongestLength) {
            newLongestId = p.id;
            newLongestLength = p.roadsBuilt;
        }
    }

    // If previous holder lost their road (e.g. broken by opponent settlement),
    // we might need to find the next longest. This implies newLongestLength needs to be re-evaluated
    // if the current holder's length dropped below their previous record.
    if (state.longestRoadPlayerId) {
        const currentHolder = state.players.find(p => p.id === state.longestRoadPlayerId);
        if (!currentHolder || currentHolder.roadsBuilt < state.longestRoadLength) {
            // Recalculate true longest
            let maxDrop = 0;
            let candidates: string[] = [];
            for (const p of state.players) {
                if (p.roadsBuilt >= 5) {
                    if (p.roadsBuilt > maxDrop) {
                        maxDrop = p.roadsBuilt;
                        candidates = [p.id];
                    } else if (p.roadsBuilt === maxDrop) {
                        candidates.push(p.id);
                    }
                }
            }

            if (maxDrop >= 5) {
                if (candidates.length === 1) {
                    newLongestId = candidates[0];
                    newLongestLength = maxDrop;
                } else if (candidates.includes(state.longestRoadPlayerId)) {
                    // Tie, original holder keeps it
                    newLongestId = state.longestRoadPlayerId;
                    newLongestLength = maxDrop;
                } else {
                    // Tie among new players: NO ONE gets it until someone takes lead
                    newLongestId = null;
                    newLongestLength = maxDrop; // no one has it though
                }
            } else {
                newLongestId = null;
                newLongestLength = 4; // effectively reset threshold
            }
        }
    }

    // Apply state
    state.longestRoadPlayerId = newLongestId;
    state.longestRoadLength = newLongestId ? newLongestLength : 4;
    for (const p of state.players) {
        p.hasLongestRoad = p.id === newLongestId;
    }

    return state;
}

export function updateLargestArmy(state: GameState): GameState {
    let newLargestId = state.largestArmyPlayerId;
    let newLargestCount = state.largestArmyCount;

    for (const p of state.players) {
        if (p.knightsPlayed >= 3 && p.knightsPlayed > newLargestCount) {
            newLargestId = p.id;
            newLargestCount = p.knightsPlayed;
        }
    }

    state.largestArmyPlayerId = newLargestId;
    state.largestArmyCount = newLargestId ? newLargestCount : 2;
    for (const p of state.players) {
        p.hasLargestArmy = p.id === newLargestId;
    }

    return state;
}
