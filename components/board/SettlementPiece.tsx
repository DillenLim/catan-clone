import React from "react";
import { Vertex } from "../../lib/types";
import { scaleCoords } from "./math";

interface Props {
    vertex: Vertex;
    color: string;
}

export function SettlementPiece({ vertex, color }: Props) {
    const coords = scaleCoords(vertex.x, vertex.y);
    return (
        <g transform={`translate(${coords.x}, ${coords.y})`} style={{ pointerEvents: "none" }}>
            <polygon
                points="-12,4 -12,-4 0,-14 12,-4 12,4"
                fill={color}
                stroke="#000"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" }}
            />
            <rect x="-12" y="4" width="24" height="10" fill={color} stroke="#000" strokeWidth="2" />
        </g>
    );
}
