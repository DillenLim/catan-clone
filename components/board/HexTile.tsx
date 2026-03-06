import React from "react";
import { HexType } from "../../lib/types";
import { hexCorners } from "./math";

interface Props {
    q: number;
    r: number;
    type: Exclude<HexType, "desert"> | "desert";
    cx: number;
    cy: number;
    size: number;
    numberToken: number | null;
    hasRobber: boolean;
}

const colors: Record<HexType, string> = {
    forest: "#4a7c59",
    field: "#d4a843",
    mountain: "#7a7a8a",
    pasture: "#82c469",
    hill: "#c06b3a",
    desert: "#d4b896"
};

export function HexTile({ type, cx, cy, size, numberToken, hasRobber }: Props) {
    const corners = hexCorners(cx, cy, size);
    const points = corners.map(c => `${c.x},${c.y}`).join(" ");

    // Probability dots
    const getDotsCount = (num: number) => {
        if (num <= 7) return num - 1;
        return 13 - num;
    };

    const isRed = numberToken === 6 || numberToken === 8;

    return (
        <g className="hex-tile">
            <polygon
                points={points}
                fill={colors[type]}
                stroke="#2a2a2a"
                strokeWidth="1.5"
            />

            {numberToken && typeof numberToken === 'number' && (
                <g transform={`translate(${cx}, ${cy})`}>
                    <circle cx="0" cy="0" r="16" fill="white" />
                    <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="bold"
                        fill={isRed ? "#d94848" : "#2a2a2a"}
                        style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                        {numberToken}
                    </text>
                    {/* Dots representation underneath */}
                    <g transform={`translate(0, 10)`}>
                        {Array.from({ length: getDotsCount(numberToken) }).map((_, i, arr) => (
                            <circle
                                key={i}
                                cx={(i - (arr.length - 1) / 2) * 4}
                                cy="0"
                                r="1"
                                fill={isRed ? "#d94848" : "#2a2a2a"}
                            />
                        ))}
                    </g>
                </g>
            )}

            {hasRobber && (
                <circle cx={cx} cy={cy + (numberToken ? -10 : 0)} r="20" fill="#1a1a1a" opacity="0.85" />
            )}
        </g>
    );
}
