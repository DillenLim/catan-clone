import React from "react";
import { GameState, DevCardType } from "../../lib/types";
import { Shield, Hammer, RotateCcw, Gem, Crown } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
    onPlayDevCard: (type: DevCardType) => void;
}

const DEVCARD_INFO = {
    knight: { label: "Knight", icon: <Shield size={16} />, desc: "Move Robber & Steal" },
    road_building: { label: "Road Building", icon: <Hammer size={16} />, desc: "Build 2 Roads" },
    year_of_plenty: { label: "Year of Plenty", icon: <RotateCcw size={16} />, desc: "Take 2 Resources" },
    monopoly: { label: "Monopoly", icon: <Gem size={16} />, desc: "Steal 1 Resource Type" },
    victory_point: { label: "Victory Point", icon: <Crown size={16} />, desc: "Worth 1 VP" },
}

export function DevCardHand({ state, myPlayerId, onPlayDevCard }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    // We only see string types in our hand (sanitized devCardCount is a number for others)
    const myCards = me.devCards as unknown as DevCardType[];
    if (!Array.isArray(myCards)) return null;

    const isMyTurn = state.currentPlayerId === myPlayerId;
    const canPlay = isMyTurn && state.phase === "action";

    // Group cards
    const groupedCards = myCards.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
    }, {} as Record<DevCardType, number>);

    return (
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Development Cards</h2>

            {myCards.length === 0 ? (
                <div className="text-slate-400 text-sm italic py-4 text-center">No development cards</div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(groupedCards) as [DevCardType, number][]).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-2">
                            <div className="flex items-center gap-2 text-purple-900">
                                {DEVCARD_INFO[type].icon}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold leading-none">{DEVCARD_INFO[type].label}</span>
                                    <span className="text-[10px] text-purple-600">x{count}</span>
                                </div>
                            </div>
                            {type !== "victory_point" && (
                                <button
                                    onClick={() => onPlayDevCard(type)}
                                    disabled={!canPlay || (me.newDevCardThisTurn && myCards.length === count)} // Simplified lock check
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded text-xs font-bold transition-colors"
                                >
                                    Play
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
