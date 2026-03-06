import React from "react";
import { GameState, ResourceBundle } from "../../lib/types";
import { TreePine, BrickWall, Sparkles, Wheat, Mountain } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export const RESOURCE_COLORS = {
    wood: "bg-emerald-700 text-white",
    brick: "bg-orange-700 text-white",
    wool: "bg-green-400 text-green-950",
    wheat: "bg-yellow-400 text-yellow-950",
    ore: "bg-slate-500 text-white"
};

export const RESOURCE_ICONS = {
    wood: <TreePine size={16} />,
    brick: <BrickWall size={16} />,
    wool: <Sparkles size={16} />,
    wheat: <Wheat size={16} />,
    ore: <Mountain size={16} />
};

export function ResourceHand({ state, myPlayerId }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    return (
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Your Resources</h2>

            <div className="flex gap-2 w-full">
                {(Object.entries(me.resources) as [keyof ResourceBundle, number][]).map(([res, count]) => {
                    if (res === "resourceCount" as unknown) return null; // Sanity check

                    return (
                        <div
                            key={res}
                            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg ${RESOURCE_COLORS[res]} shadow-sm border border-black/10`}
                        >
                            <div className="mb-1 opacity-80">{RESOURCE_ICONS[res]}</div>
                            <div className="font-bold text-xl">{count || 0}</div>
                            <div className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{res}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
