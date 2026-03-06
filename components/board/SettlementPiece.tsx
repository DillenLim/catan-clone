import React from "react";
import { Vertex } from "../../lib/types";

interface Props {
    vertex: Vertex;
    color: string;
}

export function SettlementPiece({ vertex, color }: Props) {
    const HEX_SIZE = 56;
    return (
        <g transform={`translate(${vertex.x * HEX_SIZE}, ${vertex.y * HEX_SIZE})`} style={{ pointerEvents: "none" }}>
            {/* Simple House shape */}
            <polygon
                points="-12,4 -12,-4 0,-14 12,-4 12,4"
                fill={color}
                stroke="#222"
                strokeWidth="1.5"
            />
            <rect x="-12" y="4" width="24" height="10" fill={color} stroke="#222" strokeWidth="1.5" />
        </g>
    );
}
