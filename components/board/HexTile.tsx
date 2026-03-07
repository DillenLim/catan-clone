import React from "react";
import { HexType } from "../../lib/types";
import { hexCorners } from "./math";
import { TreePine, Wheat, Mountain, BrickWall, Cloud } from "lucide-react";

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

const colors: Record<HexType, { from: string; to: string; icon: React.ReactNode }> = {
    forest: {
        from: "#2d5a27", to: "#4a7c59",
        icon: (
            <g transform="translate(-16, -16)" opacity="0.4">
                <TreePine size={32} color="#1a3a17" strokeWidth={2} />
            </g>
        )
    },
    field: {
        from: "#b8860b", to: "#d4a843",
        icon: (
            <g transform="translate(-16, -16)" opacity="0.5">
                <Wheat size={32} color="#8b4513" strokeWidth={2} />
            </g>
        )
    },
    mountain: {
        from: "#4a4a58", to: "#7a7a8a",
        icon: (
            <g transform="translate(-16, -16)" opacity="0.4">
                <Mountain size={32} color="#2a2a35" strokeWidth={2} />
            </g>
        )
    },
    pasture: {
        from: "#558b2f", to: "#8dc34b",
        icon: (
            <g transform="translate(-16, -16)" opacity="0.4">
                <Cloud size={32} color="#ffffff" strokeWidth={2} />
            </g>
        )
    },
    hill: {
        from: "#b91c1c", to: "#dc2626", // red-700 to red-600
        icon: (
            <g transform="translate(-16, -16)" opacity="0.4">
                <BrickWall size={32} color="#450a0a" strokeWidth={2} />
            </g>
        )
    },
    desert: {
        from: "#c2a378", to: "#d4b896",
        icon: (
            <g opacity="0.3" stroke="#8b7355" fill="none" strokeWidth="2">
                <path d="M-15 5 Q0 -5 15 5" />
                <path d="M-10 12 Q5 2 20 12" />
            </g>
        )
    }
};

export function HexTile({ type, cx, cy, size, numberToken, hasRobber }: Props) {
    const corners = hexCorners(cx, cy, size);
    const points = corners.map(c => `${c.x},${c.y}`).join(" ");
    const { from, to, icon } = colors[type];

    const getDotsCount = (num: number) => {
        if (num <= 7) return num - 1;
        return 13 - num;
    };

    const isRed = numberToken === 6 || numberToken === 8;

    return (
        <g className="hex-tile group transition-all duration-300">
            <defs>
                <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={from} />
                    <stop offset="100%" stopColor={to} />
                </linearGradient>
                <filter id="tile-shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                </filter>
            </defs>

            <polygon
                points={points}
                fill={`url(#grad-${type})`}
                stroke="white"
                strokeWidth="2"
                strokeOpacity="0.2"
                filter="url(#tile-shadow)"
                className="group-hover:stroke-white group-hover:stroke-opacity-50 transition-all"
            />

            {/* Background Iconography */}
            <g transform={`translate(${cx}, ${cy - 16}) scale(1.3)`}>
                {icon}
            </g>

            {/* Glassy overlay */}
            <polygon
                points={points}
                fill="white"
                fillOpacity="0.05"
                pointerEvents="none"
            />

            {numberToken && typeof numberToken === 'number' && (
                <g transform={`translate(${cx}, ${cy + 22})`}>
                    <circle
                        cx="0" cy="0" r="15"
                        fill="white"
                        fillOpacity="0.9"
                        className="drop-shadow-md"
                    />
                    <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="900"
                        fill={isRed ? "#d94848" : "#2a2a2a"}
                        style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
                    >
                        {numberToken}
                    </text>
                    {/* Probability dots underneath */}
                    <g transform={`translate(0, 10)`}>
                        {Array.from({ length: getDotsCount(numberToken) }).map((_, i, arr) => (
                            <circle
                                key={i}
                                cx={(i - (arr.length - 1) / 2) * 5}
                                cy="0"
                                r="1.5"
                                fill={isRed ? "#d94848" : "#2a2a2a"}
                            />
                        ))}
                    </g>
                </g>
            )}

            {hasRobber && (
                <g transform={`translate(${cx}, ${cy + 22})`}>
                    <circle cx="0" cy="0" r="22" fill="#1a1a1a" opacity="0.9" />
                    <text x="0" y="7" textAnchor="middle" fontSize="20">🥷</text>
                </g>
            )}
        </g>
    );
}
