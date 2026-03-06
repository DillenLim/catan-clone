import React from "react";
import { GameState, GameAction } from "../../lib/types";
import { canAfford } from "../../lib/game-logic/validation";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDispatch: (action: GameAction) => void;
    onSetPlacementMode: (mode: "road" | "settlement" | "city" | null) => void;
    placementMode: "road" | "settlement" | "city" | null;
}

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
        },
        {
            type: "settlement" as const,
            label: "Settlement",
            cost: { wood: 1, brick: 1, wool: 1, wheat: 1 },
            limit: 5,
            built: me.settlementsBuilt,
        },
        {
            type: "city" as const,
            label: "City",
            cost: { wheat: 2, ore: 3 },
            limit: 4,
            built: me.citiesBuilt,
        }
    ];

    const devCardCost = { wool: 1, wheat: 1, ore: 1 };
    const canBuyDevCard = canAfford(devCardCost, me) && state.devCardDeckCount > 0 && isMyTurn;

    return (
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Build</h2>

            <div className="flex flex-col gap-2">
                {buildOptions.map(opt => {
                    const affordable = canAfford(opt.cost, me);
                    const belowLimit = opt.built < opt.limit;
                    const disabled = !isMyTurn || !affordable || !belowLimit;

                    return (
                        <button
                            key={opt.type}
                            onClick={() => onSetPlacementMode(opt.type)}
                            disabled={disabled && placementMode !== opt.type}
                            className={`flex flex-col p-2 rounded-lg border-2 text-left transition-all ${placementMode === opt.type
                                    ? "border-blue-500 bg-blue-50"
                                    : disabled
                                        ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                                }`}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className="font-bold text-slate-800">{opt.label}</span>
                                <span className="text-xs font-mono text-slate-500">{opt.built}/{opt.limit}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {Object.entries(opt.cost).map(([res, amt]) => (
                                    <span key={res} className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                        {amt} {res.substring(0, 2).toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </button>
                    )
                })}

                <button
                    onClick={() => onDispatch({ type: "BUY_DEV_CARD" })}
                    disabled={!canBuyDevCard}
                    className={`flex flex-col p-2 rounded-lg border-2 text-left transition-all ${!canBuyDevCard
                            ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                            : "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300"
                        }`}
                >
                    <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-purple-900">Buy Dev Card</span>
                        <span className="text-xs font-mono text-purple-500">{state.devCardDeckCount} left</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                        <span className="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded text-purple-800">1 WO</span>
                        <span className="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded text-purple-800">1 WH</span>
                        <span className="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded text-purple-800">1 OR</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
