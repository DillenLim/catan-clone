import React, { useState } from "react";
import { GameState } from "../../lib/types";
import { HEX_SIZE, axialToPixel, scaleCoords } from "./math";
import { RoadPiece } from "./RoadPiece";
import { SettlementPiece } from "./SettlementPiece";
import { CityPiece } from "./CityPiece";

interface Props {
    state: GameState;
    myPlayerId: string;
    onVertexClick: (id: number) => void;
    onEdgeClick: (id: number) => void;
    onHexClick: (id: number) => void;
}

export function BoardOverlay({ state, myPlayerId, onVertexClick, onEdgeClick, onHexClick }: Props) {
    const isMyTurn = state.currentPlayerId === myPlayerId;
    const isPlacement = state.phase === "initial_settlement" || state.phase === "initial_road";

    const [hoveredEdgeId, setHoveredEdgeId] = useState<number | null>(null);
    const [hoveredVertexId, setHoveredVertexId] = useState<number | null>(null);

    if (!isMyTurn && !isPlacement) return null;

    const showRobberZones = state.phase === "move_robber";
    const showVertexZones = state.phase === "initial_settlement" || state.phase === "action";
    const showEdgeZones = state.phase === "initial_road" || state.phase === "action";

    // Get player color for ghost previews
    const myPlayerColor = state.players.find(p => p.id === myPlayerId)?.color || "white";

    return (
        <g className="board-overlay" style={{ cursor: "pointer" }}>
            {/* Hex Centers for Robber */}
            {showRobberZones && state.hexes.map(hex => {
                if (hex.hasRobber) return null;
                const { x, y } = axialToPixel(hex.q, hex.r);
                return <circle key={`hex-${hex.id}`} cx={x} cy={y} r={HEX_SIZE * 0.6} fill="transparent" onClick={() => onHexClick(hex.id)} className="hover:fill-white/10" />;
            })}

            {/* Edges for Roads */}
            {showEdgeZones && state.edges.map(edge => {
                if (edge.road) return null;
                const v1 = state.vertices.find(v => v.id === edge.vertexIds[0]);
                const v2 = state.vertices.find(v => v.id === edge.vertexIds[1]);
                if (!v1 || !v2) return null;
                const p1 = scaleCoords(v1.x, v1.y);
                const p2 = scaleCoords(v2.x, v2.y);
                const isHovered = hoveredEdgeId === edge.id;

                return (
                    <g key={`edge-group-${edge.id}`}>
                        {/* Invisible thicker line purely for easy hovering */}
                        <line
                            x1={p1.x} y1={p1.y}
                            x2={p2.x} y2={p2.y}
                            stroke="transparent"
                            strokeWidth={30}
                            onClick={() => onEdgeClick(edge.id)}
                            onMouseEnter={() => setHoveredEdgeId(edge.id)}
                            onMouseLeave={() => setHoveredEdgeId(null)}
                            style={{ cursor: "pointer" }}
                        />
                        {/* Ghost visual representation rendered ONLY when hovered */}
                        {isHovered && (
                            <g style={{ opacity: 0.6 }} className="animate-pulse pointer-events-none">
                                <RoadPiece edge={edge} allVertices={state.vertices} color={myPlayerColor} />
                            </g>
                        )}
                    </g>
                );
            })}

            {/* Vertices for Settlements/Cities */}
            {showVertexZones && state.vertices.map(vertex => {
                if (vertex.building && (vertex.building.type === "city" || vertex.building.playerId !== myPlayerId)) return null;
                const { x, y } = scaleCoords(vertex.x, vertex.y);
                const isHovered = hoveredVertexId === vertex.id;

                // If it already has a settlement, we are previewing a city upgrade
                const isUpgradeToCity = vertex.building?.type === "settlement";

                return (
                    <g key={`vert-group-${vertex.id}`}>
                        {/* Invisible circle purely for easy hovering */}
                        <circle
                            cx={x} cy={y}
                            r={25}
                            fill="transparent"
                            onClick={() => onVertexClick(vertex.id)}
                            onMouseEnter={() => setHoveredVertexId(vertex.id)}
                            onMouseLeave={() => setHoveredVertexId(null)}
                            style={{ cursor: "pointer" }}
                        />
                        {/* Ghost visual representation rendered ONLY when hovered */}
                        {isHovered && (
                            <g style={{ opacity: 0.6 }} className="animate-pulse pointer-events-none">
                                {isUpgradeToCity ? (
                                    <CityPiece vertex={vertex} color={myPlayerColor} />
                                ) : (
                                    <SettlementPiece vertex={vertex} color={myPlayerColor} />
                                )}
                            </g>
                        )}
                    </g>
                );
            })}
        </g>
    );
}
