import React from "react";
import { GameState } from "../../lib/types";
import { HEX_SIZE, axialToPixel, scaleCoords } from "./math";

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

    if (!isMyTurn && !isPlacement) return null;

    const showRobberZones = state.phase === "move_robber";
    const showVertexZones = state.phase === "initial_settlement" || state.phase === "action";
    const showEdgeZones = state.phase === "initial_road" || state.phase === "action";

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
                return (
                    <line
                        key={`edge-${edge.id}`}
                        x1={p1.x} y1={p1.y}
                        x2={p2.x} y2={p2.y}
                        stroke="transparent"
                        strokeWidth={25}
                        onClick={() => onEdgeClick(edge.id)}
                        className="hover:stroke-white hover:stroke-opacity-30 transition-all duration-200"
                    />
                );
            })}

            {/* Vertices for Settlements/Cities */}
            {showVertexZones && state.vertices.map(vertex => {
                if (vertex.building && (vertex.building.type === "city" || vertex.building.playerId !== myPlayerId)) return null;
                const { x, y } = scaleCoords(vertex.x, vertex.y);
                return (
                    <circle
                        key={`vert-${vertex.id}`}
                        cx={x}
                        cy={y}
                        r={18}
                        fill="transparent"
                        className="hover:fill-white hover:fill-opacity-40 transition-all duration-200"
                        onClick={() => onVertexClick(vertex.id)}
                    />
                );
            })}
        </g>
    );
}
