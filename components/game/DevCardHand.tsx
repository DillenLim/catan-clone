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
    const isSpecialBuild = state.phase === "special_building";

    // Group cards
    const groupedCards = myCards.reduce((acc, card) => {
        acc[card] = (acc[card] || 0) + 1;
        return acc;
    }, {} as Record<DevCardType, number>);

    return (
        <div className="glass-dark rounded-2xl shadow-xl p-3 border border-white/5">
            <h2 className="font-outfit font-black text-white/50 text-xs uppercase tracking-widest mb-3 px-1.5">Development Cards</h2>

            {myCards.length === 0 ? (
                <div className="text-white/20 text-[10px] italic py-2 text-center">No cards held</div>
            ) : (
                <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(groupedCards) as [DevCardType, number][]).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-1.5 pl-2">
                            <div className="flex items-center gap-2 text-white/80">
                                {React.cloneElement(DEVCARD_INFO[type].icon as React.ReactElement, { size: 14, className: "text-purple-400" })}
                                <div className="flex flex-col">
                                    <span className="text-xs font-black leading-none uppercase tracking-tighter">{DEVCARD_INFO[type].label}</span>
                                    <span className="text-[10px] text-white/40 font-bold mt-0.5">x{count}</span>
                                </div>
                            </div>
                            {type !== "victory_point" && (
                                <button
                                    onClick={() => onPlayDevCard(type)}
                                    disabled={!isMyTurn || isSpecialBuild || me.devCardPlayedThisTurn || (type === "knight" ? !["roll", "action"].includes(state.phase) : state.phase !== "action") || (me.devCardsBoughtThisTurn?.length > 0 && myCards.length === count)}
                                    className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 disabled:bg-white/5 disabled:text-white/10 text-white rounded-lg text-xs font-black transition-all"
                                >
                                    PLAY
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
