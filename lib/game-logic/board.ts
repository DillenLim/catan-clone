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
        // Standard A-R token sequence for the spiral
        const tokenSequence = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

        // Define the spiral order for hexes (Axial coordinates)
        // This is a fixed spiral starting from a corner and moving inward.
        const spiralCoords = [
            { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 },
            { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 1 },
            { q: -2, r: 0 }, { q: -1, r: -1 },
            // Inner ring
            { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 },
            // Center
            { q: 0, r: 0 }
        ];

        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 200) {
            attempts++;
            valid = true;

            // 1. Shuffle terrains
            let terrains: HexType[] = [];
            for (const [t, count] of Object.entries(terrainCounts)) {
                for (let i = 0; i < count; i++) terrains.push(t as HexType);
            }
            terrains = shuffleArray(terrains);

            // 2. Assign terrains and tokens along the spiral
            let tokenIdx = 0;
            const tempHexMap = new Map<string, Hex>();

            for (let i = 0; i < spiralCoords.length; i++) {
                const coord = spiralCoords[i];
                const hex = hexes.find(h => h.q === coord.q && h.r === coord.r)!;
                hex.type = terrains[i];

                if (hex.type === "desert") {
                    hex.numberToken = null;
                    hex.hasRobber = true;
                } else {
                    hex.numberToken = tokenSequence[tokenIdx++];
                    hex.hasRobber = false;
                }
                tempHexMap.set(`${hex.q},${hex.r}`, hex);
            }

            // 3. Check for number adjacency (no two same numbers next to each other)
            // AND ensure no red numbers (6/8) are adjacent
            for (const hex of hexes) {
                if (hex.numberToken === null) continue;

                const neighbors = hexes.filter(h2 =>
                    h2.id !== hex.id &&
                    Math.max(
                        Math.abs(hex.q - h2.q),
                        Math.abs(hex.r - h2.r),
                        Math.abs((-hex.q - hex.r) - (-h2.q - h2.r))
                    ) === 1
                );

                for (const n of neighbors) {
                    if (n.numberToken === null) continue;

                    // Case 1: Same number adjacency
                    if (n.numberToken === hex.numberToken) {
                        valid = false;
                        break;
                    }

                    // Case 2: Red number adjacency
                    if ((hex.numberToken === 6 || hex.numberToken === 8) &&
                        (n.numberToken === 6 || n.numberToken === 8)) {
                        valid = false;
                        break;
                    }
                }
                if (!valid) break;
            }

            if (!valid) continue;

            // 4. Check for 3-way resource clumping at vertices
            // A vertex is shared by 3 hexes if it's an "inner" vertex.
            // We can check hex types around each hex to see if any 3 meet.
            for (const hex of hexes) {
                if (hex.type === "desert") continue;

                const neighbors = hexes.filter(h2 =>
                    h2.id !== hex.id &&
                    Math.max(
                        Math.abs(hex.q - h2.q),
                        Math.abs(hex.r - h2.r),
                        Math.abs((-hex.q - hex.r) - (-h2.q - h2.r))
                    ) === 1
                );

                // Check for triangles of neighbors (hexes that meet at a vertex)
                for (let i = 0; i < neighbors.length; i++) {
                    for (let j = i + 1; j < neighbors.length; j++) {
                        const n1 = neighbors[i];
                        const n2 = neighbors[j];

                        // If n1 and n2 are also neighbors, they form a triangle with 'hex'
                        if (Math.max(
                            Math.abs(n1.q - n2.q),
                            Math.abs(n1.r - n2.r),
                            Math.abs((-n1.q - n1.r) - (-n2.q - n2.r))
                        ) === 1) {
                            if (hex.type === n1.type && hex.type === n2.type) {
                                valid = false;
                                break;
                            }
                        }
                    }
                    if (!valid) break;
                }
                if (!valid) break;
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
