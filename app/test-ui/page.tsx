"use client";

import React, { useState } from "react";
import { HexBoard } from "../../components/board/HexBoard";
import { PlayerScoreboard } from "../../components/game/PlayerScoreboard";
import { DiceDisplay } from "../../components/game/DiceDisplay";
import { ResourceHand } from "../../components/game/ResourceHand";
import { DevCardHand } from "../../components/game/DevCardHand";
import { BuildMenu } from "../../components/game/BuildMenu";
import { TradePanel } from "../../components/game/TradePanel";
import { GameLog } from "../../components/game/GameLog";
import { BankDisplay } from "../../components/game/BankDisplay";
import { DebugControls } from "../../components/game/DebugControls";
import { ResourceAnimator } from "../../components/game/ResourceAnimator";
import { DiscardModal } from "../../components/ui/DiscardModal";
import { GameState, Player, Hex, Vertex, Edge } from "../../lib/types";
import { generateBoard } from "../../lib/game-logic/board";

// Helper to generate mock data
const generateMockState = (): GameState => {
    const players: Player[] = [
        {
            id: "p1",
            name: "Alice",
            color: "#d94848",
            resources: { wood: 5, brick: 3, wool: 2, wheat: 4, ore: 1 },
            devCards: ["knight", "victory_point"],
            newDevCardThisTurn: false,
            devCardPlayedThisTurn: false,
            devCardsBoughtThisTurn: [],
            knightsPlayed: 1,
            roadsBuilt: 4,
            settlementsBuilt: 2,
            citiesBuilt: 1,
            hasLongestRoad: true,
            hasLargestArmy: false,
            isReady: true,
            isConnected: true,
            isHost: true,
        },
        {
            id: "p2",
            name: "Bob",
            color: "#4e85d1",
            resources: { wood: 2, brick: 0, wool: 5, wheat: 1, ore: 4 },
            devCards: ["monopoly"],
            newDevCardThisTurn: true,
            devCardPlayedThisTurn: false,
            devCardsBoughtThisTurn: [],
            knightsPlayed: 2,
            roadsBuilt: 5,
            settlementsBuilt: 3,
            citiesBuilt: 0,
            hasLongestRoad: false,
            hasLargestArmy: true,
            isReady: true,
            isConnected: true,
            isHost: false,
        }
    ];

    // Generate a real 19-hex board
    const board = generateBoard();
    const hexes = board.hexes;

    // For testing buildings, we can manually plop a few down on the valid board
    const vertices = board.vertices;
    const edges = board.edges;

    // Add mock buildings
    if (vertices.length > 0) {
        vertices[0].building = { type: "settlement", playerId: "p1" };
        if (vertices.length > 2) vertices[2].building = { type: "city", playerId: "p2" };
    }
    if (edges.length > 0) {
        edges[0].road = { playerId: "p1" };
    }

    return {
        roomCode: "TESTER",
        status: "playing",
        players,
        turnOrder: ["p1", "p2"],
        currentPlayerId: "p1",
        phase: "action",
        initialPlacementRound: 1,
        initialPlacementIndex: 0,
        hexes,
        vertices,
        edges,
        bank: { wood: 14, brick: 16, wool: 17, wheat: 15, ore: 18 },
        devCardDeckCount: 20,
        freeRoadsRemaining: 0,
        longestRoadPlayerId: "p1",
        longestRoadLength: 4,
        largestArmyPlayerId: "p2",
        largestArmyCount: 2,
        lastDiceRoll: null,
        lastDistribution: null,
        pendingDiscarders: ["p1"],
        pendingTradeOffer: null,
        log: [
            { timestamp: Date.now(), text: "Game started", playerId: "system" },
            { timestamp: Date.now(), text: "Alice rolled a 7", playerId: "p1" },
        ],
        winnerId: null,
        settings: {
            boardLayout: "standard",
            victoryPoints: 10,
            maritimeOnly: false,
            turnTimerSeconds: null,
        },
    };
};

export default function TesterPage() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showDebug, setShowDebug] = useState(true);
    const playerId = "p1";

    React.useEffect(() => {
        setGameState(generateMockState());
    }, []);

    const dispatchAction = (action: any) => {
        console.log("Mock Action Dispatched:", action);
        // Add simple mock reactions if needed for testing UI states
    };

    const handleRoll = () => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        setGameState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                lastDiceRoll: [d1, d2]
            };
        });
    };

    if (!gameState) return null;

    return (
        <div className="h-screen w-screen relative flex p-2 lg:p-4 gap-4 flex-col lg:flex-row font-inter antialiased overflow-hidden bg-slate-900">
            <ResourceAnimator state={gameState} />
            <DiscardModal state={gameState} myPlayerId={playerId} onDiscard={() => { }} />
            <div className="ocean-bg" />

            {/* ── MAIN BOARD COLUMN ── */}
            <div className="flex-[3] flex flex-col min-w-0 overflow-hidden h-full">
                {/* Status Bar */}
                <div className="glass-dark p-3 lg:p-4 rounded-2xl shadow-xl border border-white/5 mb-2 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Room Code</span>
                            <span className="font-outfit font-black text-xl text-white tracking-tighter leading-none">
                                {gameState.roomCode}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="font-outfit font-black text-[12px] text-green-400 tracking-wide">TESTER MODE</span>
                        </div>
                    </div>
                </div>

                {/* Board Container */}
                <div className="flex-[4] relative flex items-center justify-center min-h-0 overflow-hidden text-center w-full">
                    <HexBoard
                        gameState={gameState}
                        myPlayerId={playerId}
                        onVertexClick={() => { }}
                        onEdgeClick={() => { }}
                        onHexClick={() => { }}
                    />
                </div>

                {/* Bottom Bar: Trade | Hand | DevCard | Dice + End Turn */}
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
                                onPlayDevCard={() => { }}
                            />
                        </div>
                    </div>

                    {/* Right Group: Dice + Actions */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <DiceDisplay state={gameState} myPlayerId={playerId} onRoll={handleRoll} />

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
                        onSetPlacementMode={() => { }}
                        placementMode={null}
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
