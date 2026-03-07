"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ResourceBundle, GameState } from "../../lib/types";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDiscard: (cards: ResourceBundle) => void;
}

import { RESOURCE_ICONS, RESOURCE_COLORS } from "../game/ResourceHand";

export function DiscardModal({ state, myPlayerId, onDiscard }: Props) {
    const me = state.players.find(p => p.id === myPlayerId);

    const [selected, setSelected] = useState<ResourceBundle>(
        { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 }
    );

    if (!me || !state.pendingDiscarders.includes(myPlayerId)) return null;

    const totalCards = Object.values(me.resources).reduce((s, v) => s + (v || 0), 0);
    const mustDiscard = Math.floor(totalCards / 2);

    const totalSelected = Object.values(selected).reduce((s, v) => s + (v || 0), 0);

    const selectCard = (res: string) => {
        const currentlySelected = selected[res as keyof ResourceBundle] || 0;
        const totalOwned = me.resources[res as keyof ResourceBundle] || 0;
        if (currentlySelected < totalOwned && totalSelected < mustDiscard) {
            setSelected(prev => ({ ...prev, [res]: currentlySelected + 1 }));
        }
    };

    const deselectCard = (res: string) => {
        const currentlySelected = selected[res as keyof ResourceBundle] || 0;
        if (currentlySelected > 0) {
            setSelected(prev => ({ ...prev, [res]: currentlySelected - 1 }));
        }
    };

    const ready = totalSelected === mustDiscard;

    const resourceOrder: (keyof ResourceBundle)[] = ["wood", "brick", "wool", "wheat", "ore"];

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
            <motion.div
                className="bg-slate-900 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)] p-6 lg:p-8 border border-white/10 max-w-2xl w-full mx-4 flex flex-col items-center"
                initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-3 drop-shadow-md">🦹</div>
                    <h2 className="text-3xl font-black text-red-500 tracking-tight uppercase">Robber Attack!</h2>
                    <p className="text-slate-400 mt-2 font-medium">
                        You have <strong className="text-white">{totalCards}</strong> cards over the limit. <br />
                        You must discard <strong className="text-red-400">{mustDiscard}</strong> cards.
                    </p>
                </div>

                {/* Hand Section */}
                <div className="w-full bg-slate-800/50 rounded-2xl p-4 border border-white/5 mb-6">
                    <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        Your Hand <span className="text-slate-500 font-normal text-xs">(Click to discard)</span>
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-start min-h-[64px]">
                        {resourceOrder.map(res => {
                            const have = me.resources[res] || 0;
                            const sel = selected[res] || 0;
                            const remaining = have - sel;
                            if (remaining <= 0) return null;

                            // Render a card for each remaining resource in hand
                            return Array.from({ length: remaining }).map((_, i) => (
                                <motion.div
                                    key={`hand-${res}-${i}`}
                                    layoutId={`card-${res}-${have - i}`}
                                    onClick={() => selectCard(res)}
                                    className={`cursor-pointer flex items-center justify-center w-12 h-16 rounded-lg border transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg ${RESOURCE_COLORS[res]}`}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <div className="scale-75 origin-center">{RESOURCE_ICONS[res]}</div>
                                </motion.div>
                            ));
                        })}
                        {Object.values(me.resources).reduce((s, v) => s + (v || 0), 0) - totalSelected === 0 && (
                            <div className="text-slate-600 font-medium text-sm flex items-center justify-center w-full h-16">
                                Hand is empty.
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="text-center mb-6">
                    <div className={`text-xl font-black flex items-center gap-2 px-6 py-2 rounded-full border ${ready ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                        Selected: {totalSelected} / {mustDiscard}
                    </div>
                </div>

                {/* Discard Pile Section */}
                <div className="w-full bg-black/40 rounded-2xl p-4 border border-red-500/20 mb-8 border-dashed">
                    <h3 className="text-red-400/80 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        Discard Pile <span className="text-slate-500 font-normal text-xs">(Click to return)</span>
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-start min-h-[64px]">
                        {resourceOrder.map(res => {
                            const sel = selected[res] || 0;
                            if (sel <= 0) return null;

                            // Render a card for each selected resource in the discard pile
                            return Array.from({ length: sel }).map((_, i) => (
                                <motion.div
                                    key={`discard-${res}-${i}`}
                                    layoutId={`card-${res}-${i}`}
                                    onClick={() => deselectCard(res)}
                                    className={`cursor-pointer flex items-center justify-center w-12 h-16 rounded-lg border transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg ${RESOURCE_COLORS[res]}`}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <div className="scale-75 origin-center">{RESOURCE_ICONS[res]}</div>
                                </motion.div>
                            ));
                        })}
                        {totalSelected === 0 && (
                            <div className="text-slate-600 font-medium text-sm flex items-center justify-center w-full h-16">
                                None selected yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => ready && onDiscard(selected)}
                    disabled={!ready}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-xl tracking-wide rounded-xl transition-all shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] disabled:shadow-none uppercase"
                >
                    Confirm Discard
                </button>
            </motion.div>
        </motion.div>
    );
}
