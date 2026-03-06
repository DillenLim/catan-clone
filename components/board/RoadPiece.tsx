import React from "react";
import { Edge } from "../../lib/types";
import { scaleCoords } from "./math";

interface Props {
    edge: Edge;
    allVertices: import("../../lib/types").Vertex[];
    color: string;
}

export function RoadPiece({ edge, allVertices, color }: Props) {
    const v1 = allVertices.find(v => v.id === edge.vertexIds[0]);
    const v2 = allVertices.find(v => v.id === edge.vertexIds[1]);
    if (!v1 || !v2) return null;

    const p1 = scaleCoords(v1.x, v1.y);
    const p2 = scaleCoords(v2.x, v2.y);

    return (
        <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            style={{
                pointerEvents: "none",
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))"
            }}
        />
    );
}
