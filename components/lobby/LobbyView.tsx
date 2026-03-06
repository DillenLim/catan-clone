import React from "react";
import { GameState, GameSettings } from "../../lib/types";

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
        <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-xl mt-12 border border-slate-200">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Catan Room</h1>
                <div className="mt-2 text-xl font-mono text-purple-600 bg-purple-50 inline-block px-4 py-1 rounded-full border border-purple-200">
                    Code: <span className="font-bold">{state.roomCode}</span>
                </div>
                <p className="mt-4 text-slate-500 max-w-md mx-auto">
                    Share the URL with your friends. Wait for everyone to join and mark themselves ready.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-4">Players ({state.players.length}/8)</h2>
                    <div className="flex flex-col gap-2">
                        {state.players.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: p.color }} />
                                    <span className="font-bold text-slate-800">{p.name}</span>
                                    {p.isHost && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold rounded">Host</span>}
                                </div>
                                <div className="text-sm">
                                    {p.isReady ? <span className="text-green-600 font-bold">Ready</span> : <span className="text-slate-400">Waiting</span>}
                                </div>
                            </div>
                        ))}
                        {state.players.length === 0 && <span className="text-slate-400 italic">No one here yet...</span>}
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                        <button
                            onClick={handleReady}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${me?.isReady ? "bg-slate-400 hover:bg-slate-500" : "bg-green-500 hover:bg-green-600 shadow border border-green-700"
                                }`}
                        >
                            {me?.isReady ? "Cancel Ready" : "I'm Ready!"}
                        </button>
                        {isHost && (
                            <button
                                onClick={handleStart}
                                disabled={state.players.length < 2 || !state.players.every(p => p.isReady)}
                                className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow"
                            >
                                Start Game
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="font-bold text-slate-700 uppercase tracking-widest text-sm mb-4">Settings</h2>
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Board Layout</label>
                            <select
                                disabled={!isHost}
                                value={state.settings.boardLayout}
                                onChange={e => updateSettings({ boardLayout: e.target.value as "random" | "standard" })}
                                className="w-full mt-1 p-2 rounded border bg-white disabled:bg-slate-50"
                            >
                                <option value="random">Randomized</option>
                                <option value="standard">Standard Structure (TBD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Victory Points</label>
                            <select
                                disabled={!isHost}
                                value={state.settings.victoryPoints}
                                onChange={e => updateSettings({ victoryPoints: Number(e.target.value) })}
                                className="w-full mt-1 p-2 rounded border bg-white disabled:bg-slate-50"
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
