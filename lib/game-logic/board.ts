import { Hex, Vertex, Edge, HexType, ResourceType } from "../types";


// Map a hex to its 6 abstract vertices (each shared by up to 3 hexes)
// We designate vertices around a hex by the directions they fall between.
// Vertex i is between direction i and (i+1)%6.
export function generateBoard(): { hexes: Hex[]; vertices: Vertex[]; edges: Edge[] } {
    const hexes: Hex[] = [];
    const radius = 2;

    let idCounter = 0;
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            hexes.push({
                id: idCounter++,
                type: "desert",
                numberToken: null,
                hasRobber: false,
                q,
                r,
            });
        }
    }

    const terrainCounts: Record<HexType, number> = {
        forest: 4, field: 4, mountain: 3, pasture: 4, hill: 3, desert: 1
    };
    const numberTokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

    const assignHexes = () => {
        let terrains: HexType[] = [];
        for (const [t, count] of Object.entries(terrainCounts)) {
            for (let i = 0; i < count; i++) terrains.push(t as HexType);
        }
        terrains = shuffleArray(terrains);

        const tokens = shuffleArray([...numberTokens]);

        // Find desert first
        const desertIndex = terrains.indexOf("desert");
        const desertHex = hexes[desertIndex];
        desertHex.type = "desert";
        desertHex.numberToken = null;
        desertHex.hasRobber = true;

        const remainingHexes = hexes.filter(h => h.id !== desertHex.id);
        const remainingTerrains = terrains.filter(t => t !== "desert");

        // Simple adjacency check for 6/8
        let attempts = 0;
        let valid = false;

        while (!valid && attempts < 100) {
            attempts++;
            const ShuffledTokens = shuffleArray([...tokens]);
            valid = true;

            // Tentatively assign
            for (let i = 0; i < remainingHexes.length; i++) {
                remainingHexes[i].type = remainingTerrains[i];
                remainingHexes[i].numberToken = ShuffledTokens[i];
            }

            // Check 6/8 adjacency
            for (const h1 of remainingHexes) {
                if (h1.numberToken === 6 || h1.numberToken === 8) {
                    const neighbors = remainingHexes.filter(h2 =>
                        h2.id !== h1.id &&
                        Math.max(
                            Math.abs(h1.q - h2.q),
                            Math.abs(h1.r - h2.r),
                            Math.abs((-h1.q - h1.r) - (-h2.q - h2.r))
                        ) === 1
                    );
                    if (neighbors.some(n => n.numberToken === 6 || n.numberToken === 8)) {
                        valid = false;
                        break;
                    }
                }
            }
        }
    };

    assignHexes();

    const vertexMap = new Map<string, Vertex>();
    const edgeMap = new Map<string, Edge>();
    const round = (val: number) => Math.round(val * 1000) / 1000;

    let vId = 0;
    let eId = 0;

    for (const hex of hexes) {
        const cx = Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r;
        const cy = (3 / 2) * hex.r;
        const hexVertexIds: number[] = [];

        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const vx = cx + Math.cos(angle_rad);
            const vy = cy + Math.sin(angle_rad);

            const key = `${round(vx)},${round(vy)}`;
            if (!vertexMap.has(key)) {
                vertexMap.set(key, {
                    id: vId++,
                    x: round(vx),
                    y: round(vy),
                    adjacentHexIds: [],
                    adjacentEdgeIds: [],
                    adjacentVertexIds: [],
                    building: null,
                    harbor: null,
                });
            }
            const v = vertexMap.get(key)!;
            if (!v.adjacentHexIds.includes(hex.id)) v.adjacentHexIds.push(hex.id);
            hexVertexIds.push(v.id);
        }

        for (let i = 0; i < 6; i++) {
            const v1Id = hexVertexIds[i];
            const v2Id = hexVertexIds[(i + 1) % 6];
            const minV = Math.min(v1Id, v2Id);
            const maxV = Math.max(v1Id, v2Id);
            const eKey = `${minV}-${maxV}`;

            if (!edgeMap.has(eKey)) {
                edgeMap.set(eKey, {
                    id: eId++,
                    vertexIds: [minV, maxV],
                    road: null
                });
            }
        }
    }

    const verticesArray = Array.from(vertexMap.values());
    const edgesArray = Array.from(edgeMap.values());

    for (const edge of edgesArray) {
        const v1 = verticesArray[edge.vertexIds[0]];
        const v2 = verticesArray[edge.vertexIds[1]];
        v1.adjacentEdgeIds.push(edge.id);
        v2.adjacentEdgeIds.push(edge.id);
        if (!v1.adjacentVertexIds.includes(v2.id)) v1.adjacentVertexIds.push(v2.id);
        if (!v2.adjacentVertexIds.includes(v1.id)) v2.adjacentVertexIds.push(v1.id);
    }

    // Structured Harbor Placement
    // 1. Find coastal edges
    const coastalEdgesFiltered = edgesArray.filter(e => {
        const v1 = verticesArray[e.vertexIds[0]];
        const v2 = verticesArray[e.vertexIds[1]];
        const commonHexes = v1.adjacentHexIds.filter(id => v2.adjacentHexIds.includes(id));
        return commonHexes.length === 1;
    });

    // 2. Sort coastal edges to form a continuous ring
    const sortedCoastalEdges: Edge[] = [];
    if (coastalEdgesFiltered.length > 0) {
        const currentEdge = coastalEdgesFiltered[0];
        const remaining = new Set(coastalEdgesFiltered.slice(1));
        sortedCoastalEdges.push(currentEdge);

        while (remaining.size > 0) {
            const lastEdge = sortedCoastalEdges[sortedCoastalEdges.length - 1];
            const vIds = lastEdge.vertexIds;
            let found = false;
            for (const next of Array.from(remaining)) {
                if (vIds.includes(next.vertexIds[0]) || vIds.includes(next.vertexIds[1])) {
                    sortedCoastalEdges.push(next);
                    remaining.delete(next);
                    found = true;
                    break;
                }
            }
            if (!found) break; // Should not happen for a convex blob
        }
    }

    const harborTypes: (ResourceType | "generic")[] = ["generic", "generic", "generic", "generic", "wood", "brick", "wool", "wheat", "ore"];
    const shuffledHarborTypes = shuffleArray([...harborTypes]);

    // 3. Space out harbors (pattern of gaps to symmetrically distribute 9 harbors over 30 edges)
    const edgeGaps = [3, 4, 3, 3, 4, 3, 3, 4, 3];
    let currentIndex = 0;

    for (let i = 0; i < 9; i++) {
        if (currentIndex >= sortedCoastalEdges.length) break;
        const edge = sortedCoastalEdges[currentIndex];
        const type = shuffledHarborTypes[i];
        verticesArray[edge.vertexIds[0]].harbor = { type };
        verticesArray[edge.vertexIds[1]].harbor = { type };

        currentIndex += edgeGaps[i % edgeGaps.length];
    }

    return { hexes, vertices: verticesArray, edges: edgesArray };
}

export function shuffleArray<T>(arr: T[]): T[] {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
}

export function shuffleDevCards(): import("../types").DevCardType[] {
    const deck: import("../types").DevCardType[] = [];
    for (let i = 0; i < 14; i++) deck.push("knight");
    for (let i = 0; i < 5; i++) deck.push("victory_point");
    for (let i = 0; i < 2; i++) deck.push("road_building");
    for (let i = 0; i < 2; i++) deck.push("year_of_plenty");
    for (let i = 0; i < 2; i++) deck.push("monopoly");
    return shuffleArray(deck);
}
