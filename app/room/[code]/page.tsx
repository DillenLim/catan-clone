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
import { BankDisplay } from "../../../components/game/BankDisplay";
import { DiscardModal } from "../../../components/ui/DiscardModal";
import { DevCardModal } from "../../../components/ui/DevCardModal";
import { ResourceAnimator } from "../../../components/game/ResourceAnimator";
import { DebugControls } from "../../../components/game/DebugControls";
import { DevCardType, ResourceBundle, ResourceInput } from "../../../lib/types";

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

    const [showDebug, setShowDebug] = useState(false);

    if (!playerId) return null;

    // ─────────────────────────────────────────────
    // JOIN SCREEN
    // ─────────────────────────────────────────────
    if (!gameState || !gameState.players.find(p => p.id === playerId)) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full glass-dark rounded-2xl shadow-2xl p-8 border border-white/10">
                    <h1 className="text-3xl font-black text-white mb-6 tracking-tight">Join Room</h1>
                    {!isConnected ? (
                        <div className="animate-pulse text-blue-400 font-bold mb-4">Connecting to server...</div>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (playerName.trim()) {
                                sendMessage({ type: "JOIN", player: { name: playerName, color: playerColor } });
                            }
                        }} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Display Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={playerName}
                                    onChange={e => setPlayerName(e.target.value)}
                                    maxLength={15}
                                    className="w-full p-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-white/20 font-medium"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Color</label>
                                <div className="flex flex-wrap gap-3">
                                    {(() => {
                                        const allColors = ["#d94848", "#4e85d1", "#e08d38", "#f4f4f4", "#50a359", "#8a5c43", "#8950a3", "#d15e9e"];
                                        const takenColors = new Set(gameState?.players.map(p => p.color) ?? []);
                                        return allColors.map(c => {
                                            const taken = takenColors.has(c);
                                            return (
                                                <button
                                                    type="button"
                                                    key={c}
                                                    onClick={() => !taken && setPlayerColor(c)}
                                                    disabled={taken}
                                                    className={`relative w-10 h-10 rounded-full border-2 transition-transform ${taken
                                                        ? "border-white/5 opacity-25 cursor-not-allowed"
                                                        : playerColor === c
                                                            ? "border-white scale-110 shadow-[0_0_15px_currentColor]"
                                                            : "border-white/10 opacity-70 hover:opacity-100"
                                                        }`}
                                                    style={{ backgroundColor: c }}
                                                >
                                                    {taken && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</span>}
                                                </button>
                                            );
                                        });
                                    })()}
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
            <div className="min-h-screen bg-slate-900 flex flex-col items-center">
                {error && <div className="fixed top-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg font-bold z-50">{error}</div>}
                <LobbyView state={gameState} myPlayerId={playerId} sendMessage={sendMessage} />
            </div>
        );
    }

    // ─────────────────────────────────────────────
    // BOARD INTERACTION HANDLERS
    // ─────────────────────────────────────────────

    const handleVertexClick = (id: number) => {
        if (pendingDevCard === "knight") return;

        const vertex = gameState.vertices.find(v => v.id === id);

        if (gameState.phase === "initial_settlement") {
            dispatchAction({ type: "PLACE_INITIAL_SETTLEMENT", vertexId: id });
        } else if (placementMode === "settlement" || (!placementMode && !vertex?.building)) {
            dispatchAction({ type: "BUILD_SETTLEMENT", vertexId: id });
            setPlacementMode(null);
        } else if (placementMode === "city" || (!placementMode && vertex?.building?.type === "settlement")) {
            dispatchAction({ type: "BUILD_CITY", vertexId: id });
            setPlacementMode(null);
        }
    };

    const handleEdgeClick = (id: number) => {
        if (pendingDevCard === "knight") return;

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

        if (placementMode === "road" || !placementMode) {
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
            // Dispatch the action to the server first, then enter pending mode
            dispatchAction(action);
            setPendingDevCard("road_building");
            setRoadBuildingEdge1(null);
        } else {
            dispatchAction(action);
        }
    };

    const handleDiscard = (cards: ResourceInput) => {
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
        <div className="h-screen w-screen relative flex p-2 lg:p-4 gap-4 flex-col lg:flex-row font-inter antialiased overflow-hidden">
            {/* Immersive Ocean Background */}
            <div className="ocean-bg" />
            <div className="ocean-wave opacity-50" style={{ animationDelay: "-2s" }} />
            <div className="ocean-wave opacity-30" style={{ animationDelay: "-7s" }} />
            <div className="ocean-wave opacity-20" style={{ animationDelay: "-12s" }} />

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

            <ResourceAnimator state={gameState} />

            {/* ── MAIN BOARD COLUMN ── */}
            <div className="flex-[3] flex flex-col min-w-0 overflow-hidden h-full">

                {/* Status Bar */}
                <div className="glass-dark p-3 lg:p-4 rounded-2xl shadow-xl border border-white/5 mb-2 flex-shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Room Code</span>
                            <span className="font-outfit font-black text-xl text-white tracking-tighter leading-none">
                                {gameState.roomCode}
                            </span>
                        </div>
                        <div className="w-[1px] h-6 bg-white/10 mx-1" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-0.5">Phase</span>
                            <span className="font-outfit font-black text-lg text-white/80 leading-none">
                                {gameState.phase.replace(/_/g, " ").toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {gameState.currentPlayerId === playerId ? (
                            <div className="flex items-center gap-2.5 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="font-outfit font-black text-[12px] text-green-400 tracking-wide">YOUR TURN</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Turn</span>
                                <span className="font-outfit font-black text-[14px] text-white/60 tracking-tight">
                                    {gameState.players.find(p => p.id === gameState.currentPlayerId)?.name.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Board Container - Strictly proportional */}
                <div className="flex-[4] relative flex items-center justify-center min-h-0 overflow-hidden text-center w-full">
                    <HexBoard
                        gameState={gameState}
                        myPlayerId={playerId}
                        onVertexClick={handleVertexClick}
                        onEdgeClick={handleEdgeClick}
                        onHexClick={handleHexClick}
                    />
                </div>

                {/* Bottom Bar: Consolidated Interactive Group */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 gap-8 bg-black/40 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

                    {/* Left & Middle Group: Trade + Resources + DevCards */}
                    <div className="flex-1 flex items-center gap-6">
                        <div className="flex-shrink-0">
                            <TradePanel state={gameState} myPlayerId={playerId} onDispatch={dispatchAction} />
                        </div>

                        <div className="h-10 w-[1px] bg-white/10 hidden lg:block" />

                        <div className="flex-shrink-0">
                            <ResourceHand state={gameState} myPlayerId={playerId} />
                        </div>

                        <div className="h-10 w-[1px] bg-white/10 hidden lg:block" />

                        <div className="flex-1 max-w-2xl">
                            <DevCardHand
                                state={gameState}
                                myPlayerId={playerId}
                                onPlayDevCard={(type) => setDevCardModal(type)}
                            />
                        </div>
                    </div>

                    {/* Right Group: Dice + Actions */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <DiceDisplay state={gameState} myPlayerId={playerId} onRoll={() => dispatchAction({ type: "ROLL_DICE" })} />

                        {gameState.currentPlayerId === playerId && gameState.phase === "action" && (
                            <button
                                onClick={() => dispatchAction({ type: "END_TURN" })}
                                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-outfit font-black text-sm rounded-2xl transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-in fade-in zoom-in-95 duration-200 uppercase tracking-widest"
                            >
                                End Turn
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="flex-1 w-full flex-shrink-0 flex flex-col gap-3 overflow-hidden max-h-full pr-1">
                <div className="flex-1 flex flex-col min-h-0"><GameLog log={gameState.log} players={gameState.players} /></div>

                <div className="flex-shrink-0"><PlayerScoreboard state={gameState} myPlayerId={playerId} /></div>

                <div className="flex-shrink-0"><BankDisplay state={gameState} /></div>

                <div className="flex-shrink-0 overflow-y-auto min-h-0">
                    <BuildMenu
                        state={gameState}
                        myPlayerId={playerId}
                        onDispatch={dispatchAction}
                        onSetPlacementMode={setPlacementMode}
                        placementMode={placementMode}
                    />
                </div>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="mt-auto flex-shrink-0 opacity-20 hover:opacity-100 transition-opacity text-[10px] text-white/50 uppercase tracking-widest font-black py-2"
                >
                    {showDebug ? "Hide Admin" : "Show Admin"}
                </button>
                {showDebug && <div className="flex-shrink-0"><DebugControls state={gameState} onDispatch={dispatchAction} /></div>}
            </div>

        </div>
    );
}
