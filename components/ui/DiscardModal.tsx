"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ResourceBundle, GameState } from "../../lib/types";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDiscard: (cards: ResourceBundle) => void;
}

const RESOURCES = ["wood", "brick", "wool", "wheat", "ore"] as const;
const RESOURCE_COLORS: Record<string, string> = {
    wood: "bg-emerald-700 text-white",
    brick: "bg-[#d6512b] text-white",
    wool: "bg-green-400 text-green-950",
    wheat: "bg-yellow-400 text-yellow-950",
    ore: "bg-slate-500 text-white",
};
const RESOURCE_LABELS: Record<string, string> = {
    wood: "Wood", brick: "Brick", wool: "Wool", wheat: "Wheat", ore: "Ore",
};

export function DiscardModal({ state, myPlayerId, onDiscard }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);

    // Hooks MUST be called unconditionally — before any early returns
    const [selected, setSelected] = useState<ResourceBundle>(
        { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 }
    );

    if (!me || !state.pendingDiscarders.includes(myPlayerId)) return null;

    const totalCards = Object.values(me.resources).reduce((s, v) => s + (v || 0), 0);
    const mustDiscard = Math.floor(totalCards / 2);

    const totalSelected = Object.values(selected).reduce((s, v) => s + (v || 0), 0);

    const adjust = (res: string, delta: number) => {
        const current = selected[res as keyof ResourceBundle] || 0;
        const have = me.resources[res as keyof ResourceBundle] || 0;
        const newVal = Math.max(0, Math.min(have, current + delta));
        setSelected(prev => ({ ...prev, [res]: newVal }));
    };

    const ready = totalSelected === mustDiscard;

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
            <motion.div
                className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-red-500 max-w-md w-full mx-4"
                initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
            >
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🦹</div>
                    <h2 className="text-2xl font-black text-red-600">Robber Alert!</h2>
                    <p className="text-slate-600 mt-1">
                        You have <strong>{totalCards}</strong> cards — discard{" "}
                        <strong>{mustDiscard}</strong>.
                    </p>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-6">
                    {RESOURCES.map(res => {
                        const have = me.resources[res] || 0;
                        const sel = selected[res] || 0;
                        if (have === 0) return null;
                        return (
                            <div key={res} className="flex flex-col items-center gap-1">
                                <div className={`w-full text-center py-2 rounded-lg font-bold text-sm ${RESOURCE_COLORS[res]}`}>
                                    {RESOURCE_LABELS[res].slice(0, 2).toUpperCase()}
                                </div>
                                <div className="text-xs text-slate-500">{have} total</div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => adjust(res, -1)}
                                        className="w-6 h-6 bg-slate-200 rounded font-bold text-sm leading-none"
                                    >−</button>
                                    <span className={`font-bold text-lg min-w-[1.5rem] text-center ${sel > 0 ? "text-red-600" : "text-slate-400"}`}>
                                        {sel}
                                    </span>
                                    <button
                                        onClick={() => adjust(res, +1)}
                                        disabled={totalSelected >= mustDiscard || sel >= have}
                                        className="w-6 h-6 bg-slate-200 disabled:opacity-40 rounded font-bold text-sm leading-none"
                                    >+</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center text-sm text-slate-500 mb-4">
                    Selected: <span className={`font-bold ${ready ? "text-green-600" : "text-red-500"}`}>{totalSelected}</span> / {mustDiscard}
                </div>

                <button
                    onClick={() => ready && onDiscard(selected)}
                    disabled={!ready}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-black text-lg rounded-xl transition-colors shadow"
                >
                    Discard Cards
                </button>
            </motion.div>
        </motion.div>
    );
}
