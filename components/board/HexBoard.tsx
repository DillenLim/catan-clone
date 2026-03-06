import React from "react";
import { GameState } from "../../lib/types";
import { HexTile } from "./HexTile";
import { RoadPiece } from "./RoadPiece";
import { SettlementPiece } from "./SettlementPiece";
import { CityPiece } from "./CityPiece";
import { BoardOverlay } from "./BoardOverlay";
import { HEX_SIZE } from "./math";

interface Props {
    gameState: GameState;
    myPlayerId: string;
    onVertexClick: (id: number) => void;
    onEdgeClick: (id: number) => void;
    onHexClick: (id: number) => void;
}

export function HexBoard({ gameState, myPlayerId, onVertexClick, onEdgeClick, onHexClick }: Props) {
    // Determine SVG bounding box
    // A standard board has radius 2, meaning max q is 2, max r is 2.
    // Extents roughly: width 6 hex widths, height 6 hex heights
    const width = 800;
    const height = 700;

    const getPlayerColor = (playerId: string) => {
        return gameState.players.find(p => p.id === playerId)?.color || "#fff";
    };

    return (
        <div className="w-full max-w-4xl mx-auto aspect-square md:aspect-video flex bg-blue-100 rounded-xl overflow-hidden shadow-inner border-4 border-blue-200">
            <svg
                viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
                className="w-full h-full"
                style={{ filter: "drop-shadow(0px 10px 15px rgba(0,0,0,0.1))" }}
            >
                <g id="board-layer">
                    {gameState.hexes.map(hex => {
                        // Hex coordinates scaling
                        const cx = (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r) * HEX_SIZE;
                        const cy = (3 / 2 * hex.r) * HEX_SIZE;

                        return (
                            <HexTile
                                key={hex.id}
                                q={hex.q}
                                r={hex.r}
                                type={hex.type}
                                cx={cx}
                                cy={cy}
                                size={HEX_SIZE}
                                numberToken={hex.numberToken}
                                hasRobber={hex.hasRobber}
                            />
                        );
                    })}
                </g>

                <g id="harbors-layer">
                    {gameState.vertices.filter(v => v.harbor).map(v => {
                        // Draw a tiny text/circle for the harbor
                        const label = v.harbor!.type === "generic" ? "3:1" : `2:1 ${v.harbor!.type.substring(0, 2).toUpperCase()}`;
                        return (
                            <g key={`harbor-${v.id}`} transform={`translate(${v.x}, ${v.y})`}>
                                <circle cx="0" cy="0" r="14" fill="#eee" stroke="#333" strokeDasharray="2,2" />
                                <text x="0" y="4" fontSize="10" textAnchor="middle" fontWeight="bold">{label}</text>
                            </g>
                        )
                    })}
                </g>

                <g id="roads-layer">
                    {gameState.edges.filter(e => e.road).map(edge => (
                        <RoadPiece
                            key={edge.id}
                            edge={edge}
                            allVertices={gameState.vertices}
                            color={getPlayerColor(edge.road!.playerId)}
                        />
                    ))}
                </g>

                <g id="buildings-layer">
                    {gameState.vertices.filter(v => v.building).map(vertex => {
                        if (vertex.building!.type === "city") {
                            return <CityPiece key={vertex.id} vertex={vertex} color={getPlayerColor(vertex.building!.playerId)} />;
                        } else {
                            return <SettlementPiece key={vertex.id} vertex={vertex} color={getPlayerColor(vertex.building!.playerId)} />;
                        }
                    })}
                </g>

                {/* The topmost interactive layer */}
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
