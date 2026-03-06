import React from "react";
import { GameState, GameAction, ResourceType } from "../../lib/types";
import { canAfford } from "../../lib/game-logic/validation";
import { Hammer, TreePine, BrickWall, Sparkles, Wheat, Mountain, GraduationCap } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDispatch: (action: GameAction) => void;
    onSetPlacementMode: (mode: "road" | "settlement" | "city" | null) => void;
    placementMode: "road" | "settlement" | "city" | null;
}

const ICON_MAP = {
    wood: <TreePine size={12} className="text-emerald-400" />,
    brick: <BrickWall size={12} className="text-orange-400" />,
    wool: <Sparkles size={12} className="text-zinc-200" />,
    wheat: <Wheat size={12} className="text-amber-300" />,
    ore: <Mountain size={12} className="text-slate-400" />
};

export function BuildMenu({ state, myPlayerId, onDispatch, onSetPlacementMode, placementMode }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    const isMyTurn = state.currentPlayerId === myPlayerId && state.phase === "action";
    if (!me) return null;

    const buildOptions = [
        {
            type: "road" as const,
            label: "Road",
            cost: { wood: 1, brick: 1 },
            limit: 15,
            built: me.roadsBuilt,
            color: "blue"
        },
        {
            type: "settlement" as const,
            label: "Settlement",
            cost: { wood: 1, brick: 1, wool: 1, wheat: 1 },
            limit: 5,
            built: me.settlementsBuilt,
            color: "emerald"
        },
        {
            type: "city" as const,
            label: "City",
            cost: { wheat: 2, ore: 3 },
            limit: 4,
            built: me.citiesBuilt,
            color: "amber"
        }
    ];

    const devCardCost = { wool: 1, wheat: 1, ore: 1 };
    const canBuyDevCard = canAfford(devCardCost, me) && state.devCardDeckCount > 0 && isMyTurn;

    return (
        <div className="glass-dark rounded-3xl p-6 shadow-2xl border-t border-white/10">
            <div className="flex items-center gap-2 mb-6">
                <Hammer size={18} className="text-blue-400" />
                <h2 className="font-outfit font-black text-white/90 text-sm uppercase tracking-[0.2em]">Build Menu</h2>
            </div>

            <div className="flex flex-col gap-3">
                {buildOptions.map(opt => {
                    const affordable = canAfford(opt.cost, me);
                    const belowLimit = opt.built < opt.limit;
                    const isActive = placementMode === opt.type;
                    const disabled = !isMyTurn || !affordable || !belowLimit;

                    return (
                        <button
                            key={opt.type}
                            onClick={() => onSetPlacementMode(opt.type)}
                            disabled={disabled && !isActive}
                            className={`group relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isActive
                                    ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                    : disabled
                                        ? "border-white/5 bg-white/2 opacity-30 grayscale cursor-not-allowed"
                                        : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                                }`}
                        >
                            <div className="flex justify-between items-center w-full z-10">
                                <span className={`font-outfit font-black text-lg ${isActive ? 'text-blue-400' : 'text-white/80'}`}>{opt.label}</span>
                                <span className="text-[10px] font-black font-mono text-white/30 bg-black/40 px-2 py-0.5 rounded-full">
                                    {opt.built}/{opt.limit}
                                </span>
                            </div>

                            <div className="flex gap-2 mt-2 z-10">
                                {Object.entries(opt.cost).map(([res, amt]) => (
                                    <div key={res} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10 shadow-inner">
                                        {ICON_MAP[res as keyof typeof ICON_MAP]}
                                        <span className="text-[11px] font-black text-white/60">{amt}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Active Glow Indicator */}
                            {isActive && <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />}
                        </button>
                    )
                })}

                <button
                    onClick={() => onDispatch({ type: "BUY_DEV_CARD" })}
                    disabled={!canBuyDevCard}
                    className={`group relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 ${!canBuyDevCard
                            ? "border-white/5 bg-white/2 opacity-30 grayscale cursor-not-allowed"
                            : "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/10"
                        }`}
                >
                    <div className="flex justify-between items-center w-full z-10">
                        <div className="flex items-center gap-2">
                            <GraduationCap size={18} className="text-purple-400" />
                            <span className="font-outfit font-black text-lg text-white/80">Dev Card</span>
                        </div>
                        <span className="text-[10px] font-black font-mono text-purple-300/40 bg-purple-900/40 px-2 py-0.5 rounded-full">
                            {state.devCardDeckCount} left
                        </span>
                    </div>
                    <div className="flex gap-2 mt-2 z-10">
                        {[
                            { res: "wool", amt: 1 },
                            { res: "wheat", amt: 1 },
                            { res: "ore", amt: 1 }
                        ].map(({ res, amt }) => (
                            <div key={res} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10 shadow-inner">
                                {ICON_MAP[res as keyof typeof ICON_MAP]}
                                <span className="text-[11px] font-black text-white/60">{amt}</span>
                            </div>
                        ))}
                    </div>
                </button>
            </div>
        </div>
    );
}
