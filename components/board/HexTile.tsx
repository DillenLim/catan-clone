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

const colors: Record<HexType, { from: string; to: string; icon: React.ReactNode }> = {
    forest: {
        from: "#2d5a27", to: "#4a7c59",
        icon: (
            <g opacity="0.4">
                <path d="M0 -20 L10 0 L-10 0 Z" fill="#1a3a17" />
                <path d="M-8 -10 L2 10 L-18 10 Z" fill="#1a3a17" transform="translate(10, 5)" />
                <path d="M-8 -10 L2 10 L-18 10 Z" fill="#1a3a17" transform="translate(-5, 8)" />
            </g>
        )
    },
    field: {
        from: "#b8860b", to: "#d4a843",
        icon: (
            <g opacity="0.5" stroke="#8b4513" strokeWidth="1" fill="none">
                <path d="M-15 -10 L-15 10 M-5 -10 L-5 10 M5 -10 L5 10 M15 -10 L15 10" />
                <path d="M-20 -5 L20 -5 M-20 5 L20 5" opacity="0.3" />
            </g>
        )
    },
    mountain: {
        from: "#4a4a58", to: "#7a7a8a",
        icon: (
            <g opacity="0.4">
                <path d="M-20 15 L0 -15 L20 15 Z" fill="#2a2a35" />
                <path d="M-10 15 L5 -5 L20 15 Z" fill="#3a3a45" transform="translate(-10, 5)" />
            </g>
        )
    },
    pasture: {
        from: "#558b2f", to: "#8dc34b",
        icon: (
            <g opacity="0.4" fill="white">
                <circle cx="-10" cy="-5" r="3" />
                <circle cx="-7" cy="-7" r="3" />
                <circle cx="-13" cy="-7" r="3" />
                <circle cx="10" cy="5" r="3" />
                <circle cx="13" cy="3" r="3" />
                <circle cx="7" cy="3" r="3" />
            </g>
        )
    },
    hill: {
        from: "#8d4a27", to: "#c06b3a",
        icon: (
            <g opacity="0.4">
                <path d="M-20 10 Q0 -20 20 10" fill="#5a2a17" />
                <path d="M-10 15 Q10 -15 30 15" fill="#6a3a27" transform="translate(-15, 5)" />
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
            <g transform={`translate(${cx}, ${cy})`}>
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
                <g transform={`translate(${cx}, ${cy})`}>
                    <circle
                        cx="0" cy="0" r="18"
                        fill="white"
                        fillOpacity="0.9"
                        className="drop-shadow-md"
                    />
                    <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="900"
                        fill={isRed ? "#d94848" : "#2a2a2a"}
                        style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
                    >
                        {numberToken}
                    </text>
                    {/* Probability dots underneath */}
                    <g transform={`translate(0, 12)`}>
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
                <g transform={`translate(${cx}, ${cy + (numberToken ? -25 : 0)})`}>
                    <circle cx="0" cy="0" r="22" fill="#1a1a1a" opacity="0.9" />
                    <text x="0" y="7" textAnchor="middle" fontSize="20">🥷</text>
                </g>
            )}
        </g>
    );
}
