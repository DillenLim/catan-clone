import React from "react";
import { Vertex } from "../../lib/types";
import { scaleCoords } from "./math";

interface Props {
    vertex: Vertex;
    color: string;
}

export function CityPiece({ vertex, color }: Props) {
    const coords = scaleCoords(vertex.x, vertex.y);
    return (
        <g transform={`translate(${coords.x}, ${coords.y})`} style={{ pointerEvents: "none" }}>
            <polygon
                points="-16,8 -16,-6 -6,-16 4,-6 4,-2 16,-2 16,8"
                fill={color}
                stroke="#000"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
            />
            <rect x="-16" y="8" width="32" height="12" fill={color} stroke="#000" strokeWidth="2" />
        </g>
    );
}
