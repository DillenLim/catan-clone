import React from "react";
import { Vertex } from "../../lib/types";

interface Props {
    vertex: Vertex;
    color: string;
}

export function CityPiece({ vertex, color }: Props) {
    const HEX_SIZE = 56;
    return (
        <g transform={`translate(${vertex.x * HEX_SIZE}, ${vertex.y * HEX_SIZE})`} style={{ pointerEvents: "none" }}>
            {/* City Shape (Blockier, double wide) */}
            <polygon
                points="-16,8 -16,-6 -6,-16 4,-6 4,-2 16,-2 16,8"
                fill={color}
                stroke="#222"
                strokeWidth="1.5"
            />
            <rect x="-16" y="8" width="32" height="8" fill={color} stroke="#222" strokeWidth="1.5" />
        </g>
    );
}
