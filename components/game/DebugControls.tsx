import React from "react";
import { GameState } from "../../lib/types";
import { Zap, Package, RefreshCw } from "lucide-react";

interface Props {
    state: GameState;
    onDispatch: (action: any) => void;
}

export function DebugControls({ state, onDispatch }: Props) {
    return (
        <div className="glass-dark rounded-3xl p-6 shadow-2xl border-t border-purple-500/30 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-purple-400" />
                <h2 className="font-outfit font-black text-white/90 text-sm uppercase tracking-[0.2em]">Debug Admin</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onDispatch({ type: "DEBUG_ADD_RESOURCES", resources: { wood: 5, brick: 5, wool: 5, wheat: 5, ore: 5 } })}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 rounded-2xl transition-all font-black text-xs"
                >
                    <Package size={14} />
                    +5 ALL RES
                </button>
                <button
                    onClick={() => onDispatch({ type: "ROLL_DICE" })}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-200 rounded-2xl transition-all font-black text-xs"
                >
                    <RefreshCw size={14} />
                    FORCE ROLL
                </button>
            </div>

            <div className="text-[10px] text-white/20 font-mono text-center">
                ADMIN TOOLS ENABLED
            </div>
        </div>
    );
}
