import React from "react";
import { GameState, ResourceBundle } from "../../lib/types";
import { TreePine, BrickWall, Sparkles, Wheat, Mountain } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export const RESOURCE_COLORS = {
    wood: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    brick: "bg-orange-600/20 text-orange-400 border-orange-500/30",
    wool: "bg-lime-600/20 text-white border-lime-500/30",
    wheat: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ore: "bg-slate-500/20 text-slate-300 border-slate-500/30"
};

export const RESOURCE_ICONS = {
    wood: <TreePine size={24} strokeWidth={2.5} />,
    brick: <BrickWall size={24} strokeWidth={2.5} />,
    wool: <Sparkles size={24} strokeWidth={2.5} />,
    wheat: <Wheat size={24} strokeWidth={2.5} />,
    ore: <Mountain size={24} strokeWidth={2.5} />
};

export function ResourceHand({ state, myPlayerId }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    const resourceOrder: (keyof ResourceBundle)[] = ["wood", "brick", "wool", "wheat", "ore"];

    return (
        <div className="glass-dark rounded-3xl p-6 shadow-2xl border-t border-white/10 w-full max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-outfit font-black text-white/90 text-lg uppercase tracking-[0.2em]">Inventory</h2>
                <div className="text-xs font-bold text-white/30 tracking-widest uppercase">
                    Total: {Object.values(me.resources).reduce((a, b) => (a || 0) + (b || 0), 0)}
                </div>
            </div>

            <div className="flex gap-4 w-full">
                {resourceOrder.map((res) => {
                    const count = me.resources[res] || 0;
                    return (
                        <div
                            key={res}
                            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${RESOURCE_COLORS[res]} ${count === 0 ? 'grayscale opacity-30 scale-95' : 'shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-105'}`}
                        >
                            <div className="mb-2 transition-transform duration-500 group-hover:rotate-12 translate-y-[-2px] drop-shadow-[0_0_8px_currentColor]">
                                {RESOURCE_ICONS[res]}
                            </div>
                            <div className="font-outfit font-black text-3xl mb-1">{count}</div>
                            <div className="text-[10px] uppercase font-black tracking-widest opacity-60">
                                {res === "wood" ? "LUMBER" : res === "brick" ? "BRICK" : res === "wool" ? "WOOL" : res === "wheat" ? "GRAIN" : "ORE"}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
