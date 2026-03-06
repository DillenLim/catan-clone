import React from "react";
import { GameState } from "../../lib/types";
import { Crown, Shield, Activity } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export function PlayerScoreboard({ state, myPlayerId }: Props) {
    const vpTarget = state.settings.victoryPoints || 10;

    return (
        <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-2 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-1">Players</h2>
            {state.players.map(p => {
                const isMe = p.id === myPlayerId;
                const isCurrent = state.currentPlayerId === p.id;
                // Count resources (might be a number if sanitized)
                const resCount = 'resourceCount' in p.resources
                    ? (p.resources as { resourceCount: number }).resourceCount
                    : Object.values(p.resources).reduce((sum, val) => sum + ((val as number) || 0), 0);

                const devCount = 'devCardCount' in p.devCards
                    ? (p.devCards as { devCardCount: number }).devCardCount
                    : p.devCards.length;

                // Base VPs (cities + settlements)
                let vp = p.settlementsBuilt + p.citiesBuilt * 2;
                if (p.hasLongestRoad) vp += 2;
                if (p.hasLargestArmy) vp += 2;

                return (
                    <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${isCurrent ? "border-blue-500 bg-blue-50" : "border-transparent bg-slate-50"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full shadow-inner border border-black/20"
                                style={{ backgroundColor: p.color }}
                            />
                            <span className={`font-medium ${isMe ? "text-blue-700" : "text-slate-700"}`}>
                                {p.name} {isMe && "(You)"} {!p.isConnected && "(Offline)"}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            {p.hasLongestRoad && <span className="flex items-center gap-1 text-amber-600" title="Longest Road"><Activity size={14} /> </span>}
                            {p.hasLargestArmy && <span className="flex items-center gap-1 text-slate-700" title="Largest Army"><Shield size={14} /> </span>}

                            <span title="Victory Points" className="font-bold text-slate-800 flex items-center gap-1">
                                <Crown size={14} className="text-yellow-500" /> {vp}/{vpTarget}
                            </span>
                            <span title="Cards in hand" className="px-2 bg-slate-200 rounded text-xs font-mono">{resCount}</span>
                            <span title="Dev Cards" className="px-2 bg-purple-100 text-purple-800 rounded text-xs font-mono">{devCount}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
