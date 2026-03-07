import React from "react";
import { GameState, ResourceBundle } from "../../lib/types";
import { TreePine, BrickWall, Wheat, Mountain, Cloud } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
}

export const RESOURCE_COLORS = {
    wood: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    brick: "bg-red-600/20 text-red-400 border-red-500/30",
    wool: "bg-lime-600/20 text-white border-lime-500/30",
    wheat: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ore: "bg-slate-500/20 text-slate-300 border-slate-500/30"
};

export const RESOURCE_ICONS: Record<string, React.ReactNode> = {
    wood: <TreePine size={24} strokeWidth={2.5} />,
    brick: <BrickWall size={24} strokeWidth={2.5} />,
    wool: <Cloud size={24} strokeWidth={2.5} />,
    wheat: <Wheat size={24} strokeWidth={2.5} />,
    ore: <Mountain size={24} strokeWidth={2.5} />
};

export function ResourceHand({ state, myPlayerId }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    const resourceOrder: (keyof ResourceBundle)[] = ["wood", "brick", "wool", "wheat", "ore"];

    return (
        <div className="glass-dark rounded-2xl p-2 px-4 shadow-xl border border-white/5 w-fit mx-auto">
            <div className="flex gap-2 items-center">
                <div className="flex flex-col mr-4 pr-4 border-r border-white/10 justify-center">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-tight">Your</span>
                    <span className="text-[12px] font-black text-white/80 uppercase tracking-tight leading-tight">Hand</span>
                </div>

                <div className="flex gap-2">
                    {resourceOrder.map((res) => {
                        const count = me.resources[res] || 0;
                        return (
                            <div
                                key={res}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${RESOURCE_COLORS[res]} ${count === 0 ? 'grayscale opacity-20 scale-95' : 'shadow-lg hover:scale-105'}`}
                            >
                                <div className="scale-75 origin-center">
                                    {RESOURCE_ICONS[res]}
                                </div>
                                <div className="font-outfit font-black text-xl leading-none">{count}</div>
                            </div>
                        );
                    })}
                </div>


            </div>
        </div>
    );
}

