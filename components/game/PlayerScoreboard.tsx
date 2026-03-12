import React from "react";
import { GameState } from "../../lib/types";
import { Crown, Activity, Users, Package, Layers } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export function PlayerScoreboard({ state, myPlayerId }: Props) {

    return (
        <div className="glass-dark rounded-2xl p-3 shadow-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2 px-1">
                <Users size={16} className="text-blue-400" />
                <h2 className="font-outfit font-black text-white/40 text-[10px] uppercase tracking-widest">Participants</h2>
            </div>

            <div className={`flex flex-col gap-2 ${state.players.length > 5 ? "max-h-[45vh] overflow-y-auto pr-1" : ""}`}>
                {state.players.map(p => {
                    const isMe = p.id === myPlayerId;
                    const isCurrent = state.currentPlayerId === p.id;
                    const isSpecialBuilder = state.phase === "special_building" && 
                        state.specialBuildPhaseActive && 
                        state.specialBuildOrder[state.specialBuildIndex] === p.id;
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
                            id={`scoreboard-player-${p.id}`}
                            className={`flex flex-col ${state.players.length > 5 ? "p-2" : "p-3"} rounded-xl border transition-all duration-300 ${isSpecialBuilder
                                ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]"
                                : isCurrent
                                ? "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]"
                                : "border-white/5 bg-white/5"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20"
                                        style={{ backgroundColor: p.color }}
                                    />
                                    <span className={`font-outfit font-black text-[14px] truncate tracking-tight ${isMe ? "text-blue-400" : "text-white/90"}`}>
                                        {p.name} {isMe && <span className="text-[9px] opacity-60 ml-2">YOU</span>}
                                    </span>
                                </div>
                                {isSpecialBuilder && <Activity size={14} className="text-amber-400 animate-pulse flex-shrink-0" />}
                                {isCurrent && !isSpecialBuilder && <Activity size={14} className="text-green-400 animate-pulse flex-shrink-0" />}
                            </div>

                            <div className={`flex items-center gap-3 ${state.players.length > 5 ? "mt-1" : "mt-1.5"}`}>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20" title="Victory Points">
                                    <Crown size={state.players.length > 5 ? 14 : 18} className="text-yellow-400" />
                                    <span className={`${state.players.length > 5 ? "text-[13px]" : "text-[16px]"} font-black text-yellow-100 font-mono leading-none`}>{vp}</span>
                                </div>
                                <div id={`scoreboard-res-${p.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20" title="Resources">
                                    <Package size={state.players.length > 5 ? 14 : 18} className="text-blue-400" />
                                    <span className={`${state.players.length > 5 ? "text-[13px]" : "text-[16px]"} font-black text-blue-100 font-mono leading-none`}>{resCount}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20" title="Development Cards">
                                    <Layers size={state.players.length > 5 ? 14 : 18} className="text-purple-400" />
                                    <span className={`${state.players.length > 5 ? "text-[13px]" : "text-[16px]"} font-black text-purple-100 font-mono leading-none`}>{devCount}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
