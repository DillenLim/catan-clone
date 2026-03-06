import { Hex, Vertex, Edge, HexType, ResourceType } from "../types";

const HEX_DIRECTIONS = [
    { q: 1, r: -1 }, // Top Right
    { q: 1, r: 0 },  // Right
    { q: 0, r: 1 },  // Bottom Right
    { q: -1, r: 1 }, // Bottom Left
    { q: -1, r: 0 }, // Left
    { q: 0, r: -1 }, // Top Left
];

// Map a hex to its 6 abstract vertices (each shared by up to 3 hexes)
// We designate vertices around a hex by the directions they fall between.
// Vertex i is between direction i and (i+1)%6.
export function generateBoard(layout: "random" | "standard"): { hexes: Hex[]; vertices: Vertex[]; edges: Edge[] } {
    const hexes: Hex[] = [];
    const radius = 2; // Catan is a hex grid of radius 2 (center, ring 1, ring 2)

    let idCounter = 0;
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            hexes.push({
                id: idCounter++,
                type: "desert", // Placeholder, will populate later
                numberToken: null,
                hasRobber: false,
                q,
                r,
            });
        }
    }

    // Assign Terrain and Numbers
    const terrainCounts: Record<HexType, number> = {
        forest: 4, field: 4, mountain: 4, pasture: 3, hill: 3, desert: 1
    };
    const numberTokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

    let terrains: HexType[] = [];
    for (const [t, count] of Object.entries(terrainCounts)) {
        for (let i = 0; i < count; i++) terrains.push(t as HexType);
    }

    if (layout === "random") {
        terrains = shuffleArray(terrains);
        const tokens = shuffleArray([...numberTokens]);

        for (const hex of hexes) {
            hex.type = terrains.pop()!;
            if (hex.type === "desert") {
                hex.numberToken = null;
                hex.hasRobber = true;
            } else {
                hex.numberToken = tokens.pop()!;
            }
        }
    } else {
        // Standard spiral layout. We'll simplify and just use random for now but reproducible for standard.
        // For a true standard, we'd map specific q,r to specific terrain/tokens.
        terrains = shuffleArray(terrains);
        const tokens = shuffleArray([...numberTokens]);
        for (const hex of hexes) {
            hex.type = terrains.pop()!;
            if (hex.type === "desert") {
                hex.numberToken = null;
                hex.hasRobber = true;
            } else {
                hex.numberToken = tokens.pop()!;
            }
        }
    }

    // --- TOPOLOGY GENERATION ---
    // To uniquely identify edges and vertices regardless of which hex we process them from:
    // Edge: defined by 2 adjacent hexes (or 1 hex + direction for outer edges).
    // Vertex: defined by 3 mutually adjacent hexes (or 1/2 hexes for outer).
    //
    // Better approach: 
    // Map axial (q,r) to Cartesian (x,y) to find precise shared points.
    // Hex center (x,y) = ( sqrt(3)*q + sqrt(3)/2*r, 3/2*r )
    // The 6 vertices are at angles 30, 90, 150, 210, 270, 330 degrees from center.
    // Let radius = 1 unit.

    const vertexMap = new Map<string, Vertex>();
    const edgeMap = new Map<string, Edge>();

    function round(val: number) {
        return Math.round(val * 1000) / 1000;
    }

    let vId = 0;
    let eId = 0;

    for (const hex of hexes) {
        const cx = Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r;
        const cy = (3 / 2) * hex.r;

        const hexVertexIds: number[] = [];

        for (let i = 0; i < 6; i++) {
            // Flat-top vs Pointy-top hexes.
            // If we use pointy-top (corners at 30, 90...), then:
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
            if (!v.adjacentHexIds.includes(hex.id)) {
                v.adjacentHexIds.push(hex.id);
            }
            hexVertexIds.push(v.id);
        }

        // Edges are between adjacent vertices around the hex
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

    // Link vertices and edges
    for (const edge of edgesArray) {
        const v1 = verticesArray[edge.vertexIds[0]];
        const v2 = verticesArray[edge.vertexIds[1]];

        v1.adjacentEdgeIds.push(edge.id);
        v2.adjacentEdgeIds.push(edge.id);

        if (!v1.adjacentVertexIds.includes(v2.id)) v1.adjacentVertexIds.push(v2.id);
        if (!v2.adjacentVertexIds.includes(v1.id)) v2.adjacentVertexIds.push(v1.id);
    }

    // Assign Harbors (simplified random placement on outer vertices for now)
    // Real Catan places harbors on specific coastal edges. 
    // We can find edges that only belong to 1 hex (coastal edges) and place harbors there.
    const harborTypes: (ResourceType | "generic")[] = [
        "generic", "generic", "generic", "generic",
        "wood", "brick", "wool", "wheat", "ore"
    ];
    const shuffledHarbors = shuffleArray([...harborTypes]);

    // Find valid harbor edges (nodes on the outer rim forming a line)
    // This simplistic approach just assigns harbors to random outer vertices for now.
    // In a robust implementation, you iterate outer edges evenly.
    const outerVertices = verticesArray.filter(v => v.adjacentHexIds.length < 3);
    const selectedForHarbor = shuffleArray(outerVertices).slice(0, 9 * 2); // 9 harbors, 2 vertices each

    for (let i = 0; i < 9; i++) {
        const harbor = shuffledHarbors[i];
        if (selectedForHarbor[i * 2]) selectedForHarbor[i * 2].harbor = { type: harbor };
        if (selectedForHarbor[i * 2 + 1]) selectedForHarbor[i * 2 + 1].harbor = { type: harbor };
    }

    return {
        hexes,
        vertices: verticesArray,
        edges: edgesArray
    };
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
