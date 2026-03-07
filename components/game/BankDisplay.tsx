import React from "react";
import { GameState, ResourceBundle } from "../../lib/types";
import { TreePine, BrickWall, Cloud, Wheat, Mountain } from "lucide-react";

interface Props {
    state: GameState;
}

const BANK_MAX = 19;
const resourceOrder: (keyof ResourceBundle)[] = ["wood", "brick", "wool", "wheat", "ore"];

const RESOURCE_META: Record<string, { icon: React.ReactNode; bar: string; text: string }> = {
    wood: { icon: <TreePine size={14} strokeWidth={2.5} />, bar: "bg-emerald-500", text: "text-emerald-400" },
    brick: { icon: <BrickWall size={14} strokeWidth={2.5} />, bar: "bg-red-500", text: "text-red-400" },
    wool: { icon: <Cloud size={14} strokeWidth={2.5} />, bar: "bg-lime-400", text: "text-lime-400" },
    wheat: { icon: <Wheat size={14} strokeWidth={2.5} />, bar: "bg-amber-400", text: "text-amber-300" },
    ore: { icon: <Mountain size={14} strokeWidth={2.5} />, bar: "bg-slate-400", text: "text-slate-300" },
};

export function BankDisplay({ state }: Props) {
    const held: Record<string, number> = { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 };
    for (const player of state.players) {
        for (const res of resourceOrder) {
            held[res] = (held[res] || 0) + (player.resources[res] || 0);
        }
    }

    return (
        <div className="glass-dark rounded-2xl p-3 border border-white/5 shadow-xl">
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Bank</span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] text-white/20 font-mono">/19</span>
            </div>

            <div className="flex flex-col gap-2">
                {resourceOrder.map((res) => {
                    const remaining = BANK_MAX - (held[res] || 0);
                    const pct = (remaining / BANK_MAX) * 100;
                    const low = remaining <= 4;
                    const critical = remaining <= 1;
                    const { icon, bar, text } = RESOURCE_META[res];

                    return (
                        <div key={res} className="flex items-center gap-2">
                            {/* colored icon */}
                            <span className={`flex-shrink-0 ${text}`}>{icon}</span>

                            {/* progress bar */}
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${critical ? "bg-red-500" : low ? "bg-amber-400" : bar
                                        }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>

                            {/* count */}
                            <span className={`text-[11px] font-black font-mono w-5 text-right flex-shrink-0 ${critical ? "text-red-400" : low ? "text-amber-300" : "text-white/50"
                                }`}>
                                {remaining}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
