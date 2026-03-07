import React from "react";
import { GameState, GameAction } from "../../lib/types";
import { canAfford } from "../../lib/game-logic/validation";
import { Hammer, TreePine, BrickWall, Cloud, Wheat, Mountain, GraduationCap } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDispatch: (action: GameAction) => void;
    onSetPlacementMode: (mode: "road" | "settlement" | "city" | null) => void;
    placementMode: "road" | "settlement" | "city" | null;
}

const ICON_MAP = {
    wood: <TreePine size={16} className="text-emerald-400" />,
    brick: <BrickWall size={16} className="text-orange-400" />,
    wool: <Cloud size={16} className="text-lime-400" />,
    wheat: <Wheat size={16} className="text-amber-300" />,
    ore: <Mountain size={16} className="text-slate-400" />
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
        <div className="glass-dark rounded-2xl p-2 shadow-xl border border-white/5">
            <div className="grid grid-cols-2 gap-1.5">
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
                            className={`relative flex flex-col p-2 rounded-xl border transition-all duration-300 ${isActive
                                ? "border-blue-500 bg-blue-500/10 shadow-lg"
                                : disabled
                                    ? "border-white/5 bg-white/2 opacity-30 grayscale cursor-not-allowed"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                }`}
                        >
                            <div className="flex justify-between items-center w-full mb-2">
                                <span className={`font-outfit font-black text-sm uppercase tracking-tight ${isActive ? 'text-blue-400' : 'text-white/60'}`}>{opt.label}</span>
                                <span className="text-xs font-black font-mono text-white/40">
                                    {opt.built}/{opt.limit}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                {Object.entries(opt.cost).map(([res, amt]) => (
                                    <div key={res} className="flex items-center gap-1 opacity-90">
                                        {ICON_MAP[res as keyof typeof ICON_MAP]}
                                        <span className="text-xs font-black text-white/60">{amt}</span>
                                    </div>
                                ))}
                            </div>
                        </button>
                    )
                })}

                <button
                    onClick={() => onDispatch({ type: "BUY_DEV_CARD" })}
                    disabled={!canBuyDevCard}
                    className={`relative flex flex-col p-2 rounded-xl border transition-all duration-300 ${!canBuyDevCard
                        ? "border-white/5 bg-white/2 opacity-30 grayscale cursor-not-allowed"
                        : "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 shadow-lg"
                        }`}
                >
                    <div className="flex justify-between items-center w-full mb-2">
                        <div className="flex items-center gap-1.5">
                            <GraduationCap size={16} className="text-purple-400" />
                            <span className="font-outfit font-black text-sm uppercase tracking-tight text-white/60">Dev Card</span>
                        </div>
                        <span className="text-xs font-black font-mono text-white/40">
                            {state.devCardDeckCount}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {Object.entries(devCardCost).map(([res, amt]) => (
                            <div key={res} className="flex items-center gap-1 opacity-90">
                                {ICON_MAP[res as keyof typeof ICON_MAP]}
                                <span className="text-xs font-black text-white/60">{amt}</span>
                            </div>
                        ))}
                    </div>
                </button>
            </div>
        </div>
    );
}
