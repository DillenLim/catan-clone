import React from "react";
import { GameState } from "../../lib/types";
import { HexTile } from "./HexTile";
import { RoadPiece } from "./RoadPiece";
import { SettlementPiece } from "./SettlementPiece";
import { CityPiece } from "./CityPiece";
import { BoardOverlay } from "./BoardOverlay";
import { HEX_SIZE, axialToPixel, scaleCoords } from "./math";

interface Props {
    gameState: GameState;
    myPlayerId: string;
    onVertexClick: (id: number) => void;
    onEdgeClick: (id: number) => void;
    onHexClick: (id: number) => void;
}

export function HexBoard({ gameState, myPlayerId, onVertexClick, onEdgeClick, onHexClick }: Props) {
    const width = 1000;
    const height = 900;

    const getPlayerColor = (playerId: string) => {
        return gameState.players.find(p => p.id === playerId)?.color || "#fff";
    };

    return (
        <div className="w-full flex-1 flex bg-sky-100 rounded-3xl overflow-hidden shadow-2xl relative border-8 border-white/20 backdrop-blur-md">
            <svg
                viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
                className="w-full h-full drop-shadow-2xl"
            >
                <g id="board-layer">
                    {gameState.hexes.map(hex => {
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
                </g>

                <g id="harbors-layer">
                    {gameState.vertices.filter(v => v.harbor).map(v => {
                        const coords = scaleCoords(v.x, v.y);
                        const label = v.harbor!.type === "generic"
                            ? "3:1"
                            : `2:1 ${v.harbor!.type === "wood" ? "WD" : v.harbor!.type === "wool" ? "WL" : v.harbor!.type.substring(0, 2).toUpperCase()}`;
                        return (
                            <g key={`harbor-${v.id}`} transform={`translate(${coords.x}, ${coords.y})`}>
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
