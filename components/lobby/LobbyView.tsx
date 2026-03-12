import React from "react";
import { GameState, GameSettings, getExpansionConfig } from "../../lib/types";

interface Props {
    state: GameState;
    myPlayerId: string;
    sendMessage: (msg: import("../../lib/types").ClientMessagePayload) => void;
}

export function LobbyView({ state, myPlayerId, sendMessage }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    const isHost = me?.isHost;

    const handleStart = () => {
        sendMessage({ type: "START_GAME" });
    };

    const handleReady = () => {
        sendMessage({ type: "READY" });
    };

    const updateSettings = (updates: Partial<GameSettings>) => {
        if (isHost) {
            sendMessage({ type: "SETTINGS_UPDATE", settings: updates });
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto glass-dark p-8 rounded-3xl shadow-2xl mt-12 border border-white/10 backdrop-blur-md">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-md">Catan Room</h1>
                <div className="mt-3 text-xl font-mono text-blue-400 bg-blue-900/30 inline-block px-6 py-1.5 rounded-full border border-blue-500/30 shadow-inner">
                    Code: <span className="font-bold text-blue-300">{state.roomCode}</span>
                </div>
                <p className="mt-4 text-white/50 max-w-md mx-auto text-sm">
                    Share the URL with your friends. Wait for everyone to join and mark themselves ready.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Players ({state.players.length}/{getExpansionConfig(state.settings.expansionMode).maxPlayers})</h2>
                    <div className="flex flex-col gap-2">
                        {state.players.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full border border-black/50 shadow-sm" style={{ backgroundColor: p.color }} />
                                    <span className="font-bold text-white/90">{p.name}</span>
                                    {p.isHost && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-[10px] uppercase font-black rounded border border-yellow-500/20">Host</span>}
                                </div>
                                <div className="text-sm">
                                    {p.isReady ? <span className="text-green-400 font-bold">Ready</span> : <span className="text-white/30 italic">Waiting</span>}
                                </div>
                            </div>
                        ))}
                        {state.players.length === 0 && <span className="text-white/30 italic text-sm text-center py-4 bg-black/20 rounded-xl border border-white/5">No one here yet...</span>}
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            onClick={handleReady}
                            className={`w-full py-3.5 rounded-xl font-black text-white transition-all uppercase tracking-widest text-sm ${me?.isReady ? "bg-slate-700 hover:bg-slate-600 border border-white/10" : "bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)] border-b-4 border-green-800 active:translate-y-1 active:border-b-0"
                                }`}
                        >
                            {me?.isReady ? "Cancel Ready" : "I'm Ready!"}
                        </button>
                        {isHost && (
                            <button
                                onClick={handleStart}
                                disabled={state.players.length < 2 || !state.players.every(p => p.isReady)}
                                className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-white/20 disabled:border-white/5 disabled:shadow-none transition-all uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] border-b-4 border-blue-800 active:translate-y-1 active:border-b-0"
                            >
                                Start Game
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Settings</h2>
                    <div className="flex flex-col gap-5 p-5 bg-black/30 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div>
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Game Mode</label>
                            <select
                                disabled={!isHost}
                                value={state.settings.expansionMode}
                                onChange={e => updateSettings({ expansionMode: e.target.value as "base" | "5-6" | "7-8" })}
                                className="w-full mt-1.5 p-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 font-medium"
                            >
                                <option value="base">Base Game (3-4 Players)</option>
                                <option value="5-6">5-6 Player Expansion</option>
                                <option value="7-8">7-8 Player Expansion</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Board Layout</label>
                            <select
                                disabled={!isHost}
                                value={state.settings.boardLayout}
                                onChange={e => updateSettings({ boardLayout: e.target.value as "random" | "standard" })}
                                className="w-full mt-1.5 p-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 font-medium"
                            >
                                <option value="random">Randomized</option>
                                <option value="standard">Standard Structure (TBD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Victory Points</label>
                            <select
                                disabled={!isHost}
                                value={state.settings.victoryPoints}
                                onChange={e => updateSettings({ victoryPoints: Number(e.target.value) })}
                                className="w-full mt-1.5 p-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 font-medium"
                            >
                                <option value="8">8 VP (Short game)</option>
                                <option value="10">10 VP (Standard)</option>
                                <option value="12">12 VP (Long game)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
