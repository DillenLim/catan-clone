import React, { useMemo } from "react";
import { GameState, Hex, Vertex, Edge } from "../../lib/types";
import { HEX_SIZE, axialToPixel, scaleCoords, getBoardBounds } from "./math";
import { HexTile } from "./HexTile";
import { BoardOverlay } from "./BoardOverlay";
import { RoadPiece } from "./RoadPiece";
import { SettlementPiece } from "./SettlementPiece";
import { CityPiece } from "./CityPiece";
import { TreePine, BrickWall, Wheat, Mountain, Cloud, Anchor } from "lucide-react";

interface Props {
    gameState: GameState;
    myPlayerId: string;
    onVertexClick: (vertexId: number) => void;
    onEdgeClick: (edgeId: number) => void;
    onHexClick: (hexId: number) => void;
}

export function HexBoard({ gameState, myPlayerId, onVertexClick, onEdgeClick, onHexClick }: Props) {
    const { hexes, vertices, edges } = gameState;

    // Fixed: Get bounds for centering and responsiveness
    const bounds = useMemo(() => getBoardBounds(hexes), [hexes]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-black/10 rounded-3xl shadow-inner border border-white/5 overflow-hidden relative">
            <svg
                viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-2xl transition-all duration-700 ease-out"
                style={{ filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.5))" }}
            >
                {/* 1. Harbors Rendering (Behind hexes) */}
                <g className="harbor-layer">
                    {edges.filter(e => {
                        const v1 = vertices[e.vertexIds[0]];
                        const v2 = vertices[e.vertexIds[1]];
                        return v1.harbor && v2.harbor && v1.harbor.type === v2.harbor.type;
                    }).map((e: Edge) => {
                        const v1 = vertices[e.vertexIds[0]];
                        const v2 = vertices[e.vertexIds[1]];
                        const { x: x1, y: y1 } = scaleCoords(v1.x, v1.y);
                        const { x: x2, y: y2 } = scaleCoords(v2.x, v2.y);
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;

                        // Vector outward from center (0,0)
                        const centerDist = Math.sqrt(mx * mx + my * my);
                        const nx = mx / centerDist;
                        const ny = my / centerDist;

                        // Push the harbor out by 40 pixels
                        const hx = mx + nx * 40;
                        const hy = my + ny * 40;

                        const harborType = v1.harbor!.type;
                        const label = harborType === "generic" ? "3:1" : "2:1";

                        let Icon = Anchor;
                        let color = "#cbd5e1"; // slate-300
                        if (harborType === "wood") { Icon = TreePine; color = "#34d399"; } // emerald-400
                        else if (harborType === "brick") { Icon = BrickWall; color = "#eb6640"; } // rust
                        else if (harborType === "wheat") { Icon = Wheat; color = "#fcd34d"; } // amber-300
                        else if (harborType === "ore") { Icon = Mountain; color = "#94a3b8"; } // slate-400
                        else if (harborType === "wool") { Icon = Cloud; color = "#a3e635"; } // lime-400

                        return (
                            <g key={`harbor-${e.id}`}>
                                {/* Dock lines from vertices to the harbor badge */}
                                <line x1={x1} y1={y1} x2={hx} y2={hy} stroke="#8b4513" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                                <line x2={x2} y2={y2} x1={hx} y1={hy} stroke="#8b4513" strokeWidth="6" strokeLinecap="round" opacity="0.9" />

                                {/* Inner lighter dock plank detail */}
                                <line x1={x1} y1={y1} x2={hx} y2={hy} stroke="#a0522d" strokeWidth="2" strokeLinecap="round" />
                                <line x2={x2} y2={y2} x1={hx} y1={hy} stroke="#a0522d" strokeWidth="2" strokeLinecap="round" />

                                {/* Harbor Badge Background */}
                                <circle cx={hx} cy={hy} r="22" fill="#1e293b" stroke={color} strokeWidth="3" opacity="0.95" />
                                <circle cx={hx} cy={hy} r="22" fill="none" stroke="#000000" strokeWidth="1" opacity="0.3" />

                                {/* Type Icon */}
                                <g transform={`translate(${hx - 10}, ${hy - 16})`}>
                                    <Icon size={20} color={color} strokeWidth={2.5} />
                                </g>

                                {/* 3:1 or 2:1 label */}
                                <text
                                    x={hx}
                                    y={hy + 14}
                                    textAnchor="middle"
                                    className="font-outfit font-black text-[14px] tracking-tighter drop-shadow-md"
                                    fill={color}
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                </g>

                {/* 2. Tiles Rendering */}
                {hexes.map((hex: Hex) => {
                    const { x, y } = axialToPixel(hex.q, hex.r);
                    return (
                        <HexTile
                            key={hex.id}
                            q={hex.q}
                            r={hex.r}
                            type={hex.type}
                            cx={x}
                            cy={y}
                            size={HEX_SIZE}
                            numberToken={hex.numberToken}
                            hasRobber={hex.hasRobber}
                        />
                    );
                })}

                {/* 3. Roads Rendering */}
                {edges.filter((e: Edge) => e.road).map((e: Edge) => (
                    <RoadPiece
                        key={e.id}
                        edge={e}
                        allVertices={vertices}
                        color={gameState.players.find(p => p.id === e.road!.playerId)?.color || "gray"}
                    />
                ))}

                {/* 4. Buildings Rendering */}
                {vertices.filter((v: Vertex) => v.building).map((v: Vertex) => (
                    v.building!.type === "settlement" ? (
                        <SettlementPiece
                            key={v.id}
                            vertex={v}
                            color={gameState.players.find(p => p.id === v.building!.playerId)?.color || "gray"}
                        />
                    ) : (
                        <CityPiece
                            key={v.id}
                            vertex={v}
                            color={gameState.players.find(p => p.id === v.building!.playerId)?.color || "gray"}
                        />
                    )
                ))}

                {/* 5. Overlay layer for interactions */}
                <BoardOverlay
                    state={gameState}
                    myPlayerId={myPlayerId}
                    onVertexClick={onVertexClick}
                    onEdgeClick={onEdgeClick}
                    onHexClick={onHexClick}
                />
            </svg>
        </div>
    );
}
