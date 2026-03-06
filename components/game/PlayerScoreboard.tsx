import React from "react";
import { GameState } from "../../lib/types";
import { Crown, Shield, Activity, Users, Layout } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export function PlayerScoreboard({ state, myPlayerId }: Props) {
    const vpTarget = state.settings.victoryPoints || 10;

    return (
        <div className="glass-dark rounded-3xl p-6 shadow-2xl border-t border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-blue-400" />
                <h2 className="font-outfit font-black text-white/90 text-sm uppercase tracking-[0.2em]">Participants</h2>
            </div>

            <div className="flex flex-col gap-3">
                {state.players.map(p => {
                    const isMe = p.id === myPlayerId;
                    const isCurrent = state.currentPlayerId === p.id;
                    const resCount = 'resourceCount' in p.resources
                        ? (p.resources as { resourceCount: number }).resourceCount
                        : Object.values(p.resources).reduce((sum, val) => sum + ((val as number) || 0), 0);

                    const devCount = 'devCardCount' in p.devCards
                        ? (p.devCards as { devCardCount: number }).devCardCount
                        : p.devCards.length;

                    let vp = p.settlementsBuilt + p.citiesBuilt * 2;
                    if (p.hasLongestRoad) vp += 2;
                    if (p.hasLargestArmy) vp += 2;

                    return (
                        <div
                            key={p.id}
                            className={`flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 ${isCurrent
                                    ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                    : "border-white/5 bg-white/5"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white/20"
                                        style={{ backgroundColor: p.color }}
                                    />
                                    <span className={`font-outfit font-black text-sm tracking-wide ${isMe ? "text-blue-400" : "text-white/80"}`}>
                                        {p.name} {isMe && "(YOU)"}
                                    </span>
                                </div>
                                {!p.isConnected && <span className="text-[10px] font-black text-red-400/60 uppercase">Offline</span>}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5" title="Victory Points">
                                        <Crown size={12} className="text-yellow-400" />
                                        <span className="text-xs font-black text-white/90 font-mono">{vp}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5" title="Resources">
                                        <Layout size={12} className="text-blue-400" />
                                        <span className="text-xs font-black text-white/70 font-mono">{resCount}</span>
                                    </div>
                                </div>

                                <div className="flex gap-1.5">
                                    {p.hasLongestRoad && (
                                        <div className="bg-amber-500/20 p-1.5 rounded-lg border border-amber-500/30" title="Longest Road">
                                            <Activity size={14} className="text-amber-400" />
                                        </div>
                                    )}
                                    {p.hasLargestArmy && (
                                        <div className="bg-slate-500/20 p-1.5 rounded-lg border border-slate-500/30" title="Largest Army">
                                            <Shield size={14} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Current Turn Progress Bar (Subtle) */}
                            {isCurrent && (
                                <div className="mt-3 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-1/2 animate-[shimmer_1.5s_infinite]" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
