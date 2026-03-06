"use client";

import { useState } from "react";
import { usePlayerSession } from "../../../hooks/usePlayerSession";
import { usePartyKit } from "../../../hooks/usePartyKit";
import { useGameStore } from "../../../store/gameStore";
import { LobbyView } from "../../../components/lobby/LobbyView";
import { HexBoard } from "../../../components/board/HexBoard";
import { PlayerScoreboard } from "../../../components/game/PlayerScoreboard";
import { DiceDisplay } from "../../../components/game/DiceDisplay";
import { ResourceHand } from "../../../components/game/ResourceHand";
import { DevCardHand } from "../../../components/game/DevCardHand";
import { BuildMenu } from "../../../components/game/BuildMenu";
import { TradePanel } from "../../../components/game/TradePanel";
import { GameLog } from "../../../components/game/GameLog";
import { DiscardModal } from "../../../components/ui/DiscardModal";
import { DevCardModal } from "../../../components/ui/DevCardModal";
import { DevCardType, ResourceBundle } from "../../../lib/types";

export default function RoomPage({ params }: { params: { code: string } }) {
    const roomCode = params.code;
    const playerId = usePlayerSession();
    const { gameState, isConnected, error } = useGameStore();
    const { dispatchAction, sendMessage } = usePartyKit(roomCode, playerId);

    const [playerName, setPlayerName] = useState("");
    const [playerColor, setPlayerColor] = useState("#d94848");

    // Board placement mode: road/settlement/city from build menu, or special dev card modes
    const [placementMode, setPlacementMode] = useState<"road" | "settlement" | "city" | null>(null);

    // Dev card modal state
    const [devCardModal, setDevCardModal] = useState<DevCardType | null>(null);

    // Pending dev card that needs board interaction (knight = robber, roadBuilding = roads)
    const [pendingDevCard, setPendingDevCard] = useState<"knight" | "road_building" | null>(null);
    // For road building: first edge already placed
    const [roadBuildingEdge1, setRoadBuildingEdge1] = useState<number | null>(null);

    if (!playerId) return null;

    // ─────────────────────────────────────────────
    // JOIN SCREEN
    // ─────────────────────────────────────────────
    if (!gameState || !gameState.players.find(p => p.id === playerId)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <h1 className="text-3xl font-black text-slate-800 mb-6">Join Room</h1>
                    {!isConnected ? (
                        <div className="animate-pulse text-blue-600 font-bold mb-4">Connecting to server...</div>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (playerName.trim()) {
                                sendMessage({ type: "JOIN", player: { name: playerName, color: playerColor } });
                            }
                        }} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={playerName}
                                    onChange={e => setPlayerName(e.target.value)}
                                    maxLength={15}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {["#d94848", "#4e85d1", "#e08d38", "#f4f4f4", "#50a359", "#8a5c43", "#8950a3", "#d15e9e"].map(c => (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => setPlayerColor(c)}
                                            className={`w-10 h-10 rounded-full border-2 transition-transform ${playerColor === c ? "border-slate-800 scale-110 shadow-md" : "border-slate-200 opacity-80"}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow">
                                Enter Game
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────
    // LOBBY
    // ─────────────────────────────────────────────
    if (gameState.status === "lobby") {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center">
                {error && <div className="fixed top-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg font-bold z-50">{error}</div>}
                <LobbyView state={gameState} myPlayerId={playerId} sendMessage={sendMessage} />
            </div>
        );
    }

    // ─────────────────────────────────────────────
    // BOARD INTERACTION HANDLERS
    // ─────────────────────────────────────────────

    const handleVertexClick = (id: number) => {
        if (gameState.phase === "initial_settlement") {
            dispatchAction({ type: "PLACE_INITIAL_SETTLEMENT", vertexId: id });
        } else if (placementMode === "settlement") {
            dispatchAction({ type: "BUILD_SETTLEMENT", vertexId: id });
            setPlacementMode(null);
        } else if (placementMode === "city") {
            dispatchAction({ type: "BUILD_CITY", vertexId: id });
            setPlacementMode(null);
        }
    };

    const handleEdgeClick = (id: number) => {
        if (gameState.phase === "initial_road") {
            dispatchAction({ type: "PLACE_INITIAL_ROAD", edgeId: id });
            return;
        }

        if (pendingDevCard === "road_building") {
            if (roadBuildingEdge1 === null) {
                // First road, free build and record edge
                dispatchAction({ type: "BUILD_ROAD", edgeId: id });
                setRoadBuildingEdge1(id);
            } else {
                // Second road — free build then clear pending
                dispatchAction({ type: "BUILD_ROAD", edgeId: id });
                setPendingDevCard(null);
                setRoadBuildingEdge1(null);
            }
            return;
        }

        if (placementMode === "road") {
            dispatchAction({ type: "BUILD_ROAD", edgeId: id });
            setPlacementMode(null);
        }
    };

    const handleHexClick = (id: number) => {
        if (gameState.phase === "move_robber" || pendingDevCard === "knight") {
            const candidates = gameState.vertices
                .filter(v => v.adjacentHexIds.includes(id) && v.building && v.building.playerId !== playerId)
                .map(v => v.building!.playerId);
            const targetId = candidates.length > 0
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : undefined;

            if (pendingDevCard === "knight") {
                dispatchAction({ type: "PLAY_KNIGHT", hexId: id, stealFromPlayerId: targetId });
                setPendingDevCard(null);
            } else {
                dispatchAction({ type: "MOVE_ROBBER", hexId: id, stealFromPlayerId: targetId });
            }
        }
    };

    const handleDevCardConfirm = (action: import("../../../lib/types").GameAction) => {
        setDevCardModal(null);
        if (action.type === "PLAY_KNIGHT") {
            // Knight needs a board click — enter pending mode
            setPendingDevCard("knight");
        } else if (action.type === "PLAY_ROAD_BUILDING") {
            // Road building needs two board edge clicks — enter pending mode
            setPendingDevCard("road_building");
            setRoadBuildingEdge1(null);
        } else {
            dispatchAction(action);
        }
    };

    const handleDiscard = (cards: ResourceBundle) => {
        dispatchAction({ type: "DISCARD_CARDS", cards });
    };

    // Determine board interaction hint for the status bar
    const getBoardHint = () => {
        if (pendingDevCard === "knight") return "⚔️ Click a hex to place the Robber";
        if (pendingDevCard === "road_building") {
            return roadBuildingEdge1 === null
                ? "🛤️ Click an edge to place Road 1"
                : "🛤️ Click an edge to place Road 2";
        }
        if (placementMode) return `Click to place a ${placementMode}`;
        return null;
    };

    const boardHint = getBoardHint();

    // ─────────────────────────────────────────────
    // ACTIVE GAME UI
    // ─────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-100 flex p-4 gap-4 flex-col lg:flex-row">

            {/* Global error toast */}
            {error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-bold z-50 animate-bounce">
                    {error}
                </div>
            )}

            {/* ── WIN SCREEN ── */}
            {gameState.status === "finished" && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-12 rounded-2xl flex flex-col items-center shadow-2xl">
                        <div className="text-8xl mb-4">👑</div>
                        <h2 className="text-4xl font-black text-slate-800 text-center">
                            {gameState.players.find(p => p.id === gameState.winnerId)?.name} wins!
                        </h2>
                    </div>
                </div>
            )}

            {/* ── DISCARD MODAL ── */}
            {gameState.pendingDiscarders.includes(playerId) && (
                <DiscardModal state={gameState} myPlayerId={playerId} onDiscard={handleDiscard} />
            )}

            {/* ── DEV CARD MODAL ── */}
            <DevCardModal
                cardType={devCardModal}
                state={gameState}
                myPlayerId={playerId}
                onSetPendingCard={(card) => { setPendingDevCard(card); setDevCardModal(null); }}
                onConfirm={handleDevCardConfirm}
                onClose={() => setDevCardModal(null)}
            />

            {/* ── BOARD HINT BANNER (when board interaction needed) ── */}
            {boardHint && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-purple-600 text-white px-6 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2">
                    {boardHint}
                    <button onClick={() => { setPendingDevCard(null); setPlacementMode(null); }} className="ml-2 text-purple-200 hover:text-white">✕</button>
                </div>
            )}

            {/* ── MAIN BOARD COLUMN ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Status Bar */}
                <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4 flex justify-between items-center text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-wider text-xs">
                            Room: {gameState.roomCode}
                        </span>
                        <span className="text-slate-500">
                            Phase: <span className="text-slate-800">{gameState.phase.replace(/_/g, " ")}</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {gameState.currentPlayerId === playerId ? (
                            <span className="text-green-600 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Your Turn
                            </span>
                        ) : (
                            <span className="text-slate-500">
                                Waiting for {gameState.players.find(p => p.id === gameState.currentPlayerId)?.name}...
                            </span>
                        )}
                        {gameState.currentPlayerId === playerId && gameState.phase === "action" && (
                            <button
                                onClick={() => dispatchAction({ type: "END_TURN" })}
                                className="ml-4 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors border-b-2 border-red-700 active:border-b-0 active:translate-y-0.5"
                            >
                                End Turn
                            </button>
                        )}
                    </div>
                </div>

                {/* Board */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <HexBoard
                        gameState={gameState}
                        myPlayerId={playerId}
                        onVertexClick={handleVertexClick}
                        onEdgeClick={handleEdgeClick}
                        onHexClick={handleHexClick}
                    />
                </div>

                {/* Resource Hand (bottom) */}
                <div className="mt-4">
                    <ResourceHand state={gameState} myPlayerId={playerId} />
                </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto max-h-[100vh]">
                <PlayerScoreboard state={gameState} myPlayerId={playerId} />
                <DiceDisplay state={gameState} myPlayerId={playerId} onRoll={() => dispatchAction({ type: "ROLL_DICE" })} />
                <BuildMenu
                    state={gameState}
                    myPlayerId={playerId}
                    onDispatch={dispatchAction}
                    onSetPlacementMode={setPlacementMode}
                    placementMode={placementMode}
                />
                <TradePanel state={gameState} myPlayerId={playerId} onDispatch={dispatchAction} />
                <DevCardHand
                    state={gameState}
                    myPlayerId={playerId}
                    onPlayDevCard={(type) => setDevCardModal(type)}
                />
                <GameLog log={gameState.log} players={gameState.players} />
            </div>

        </div>
    );
}
