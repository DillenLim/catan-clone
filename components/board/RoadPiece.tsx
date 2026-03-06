import React from "react";
import { Edge } from "../../lib/types";

interface Props {
    edge: Edge;
    allVertices: import("../../lib/types").Vertex[];
    color: string;
}

export function RoadPiece({ edge, allVertices, color }: Props) {
    const v1 = allVertices.find(v => v.id === edge.vertexIds[0]);
    const v2 = allVertices.find(v => v.id === edge.vertexIds[1]);
    if (!v1 || !v2) return null;

    const HEX_SIZE = 56;

    return (
        <line
            x1={v1.x * HEX_SIZE}
            y1={v1.y * HEX_SIZE}
            x2={v2.x * HEX_SIZE}
            y2={v2.y * HEX_SIZE}
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            style={{ pointerEvents: "none" }}
        />
    );
}
