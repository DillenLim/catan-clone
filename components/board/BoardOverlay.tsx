import React from "react";
import { GameState } from "../../lib/types";

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

    if (!isMyTurn && !isPlacement) return null; // Only show interactive zones when it's your turn (or you're placing)

    const showRobberZones = state.phase === "move_robber";
    const showVertexZones = state.phase === "initial_settlement" || state.phase === "action";
    const showEdgeZones = state.phase === "initial_road" || state.phase === "action";

    return (
        <g className="board-overlay" style={{ cursor: "pointer" }}>
            {/* Hex Centers for Robber */}
            {showRobberZones && state.hexes.map(hex => {
                if (hex.hasRobber) return null;
                const cx = Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r;
                const cy = 3 / 2 * hex.r;
                // Scale back up to SVG units using HEX_SIZE = 56
                const px = cx * 56;
                const py = cy * 56;
                return <circle key={`hex-${hex.id}`} cx={px} cy={py} r={30} fill="transparent" onClick={() => onHexClick(hex.id)} />;
            })}

            {/* Edges for Roads */}
            {showEdgeZones && state.edges.map(edge => {
                if (edge.road) return null;
                const v1 = state.vertices.find(v => v.id === edge.vertexIds[0]);
                const v2 = state.vertices.find(v => v.id === edge.vertexIds[1]);
                if (!v1 || !v2) return null;
                return (
                    <line
                        key={`edge-${edge.id}`}
                        x1={v1.x} y1={v1.y}
                        x2={v2.x} y2={v2.y}
                        stroke="transparent"
                        strokeWidth={20}
                        onClick={() => onEdgeClick(edge.id)}
                        className="hover:stroke-blue-400 hover:stroke-opacity-50"
                    />
                );
            })}

            {/* Vertices for Settlements/Cities */}
            {showVertexZones && state.vertices.map(vertex => {
                // Technically, clicking a city to upgrade shouldn't be blocked if it's our settlement
                // But if it's already a city or an opponent building, ignore
                if (vertex.building && (vertex.building.type === "city" || vertex.building.playerId !== myPlayerId)) return null;

                return (
                    <circle
                        key={`vert-${vertex.id}`}
                        cx={vertex.x}
                        cy={vertex.y}
                        r={15}
                        fill="transparent"
                        className="hover:fill-blue-400 hover:fill-opacity-50"
                        onClick={() => onVertexClick(vertex.id)}
                    />
                );
            })}
        </g>
    );
}
