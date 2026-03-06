import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState } from "../../lib/types";
import { Dices } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
    onRoll: () => void;
}

export function DiceDisplay({ state, myPlayerId, onRoll }: Props) {
    const isMyTurn = state.currentPlayerId === myPlayerId;
    const canRoll = isMyTurn && state.phase === "roll";

    return (
        <div className="glass-dark rounded-3xl p-6 shadow-2xl border-t border-white/10 flex flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-4 h-20">
                <AnimatePresence mode="popLayout">
                    {state.lastDiceRoll ? (
                        <motion.div
                            key={state.lastDiceRoll.join("-") + Date.now()}
                            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            className="flex items-center gap-6"
                        >
                            <div className="flex gap-4">
                                <Die value={state.lastDiceRoll[0]} isRed />
                                <Die value={state.lastDiceRoll[1]} />
                            </div>
                            <div className="text-5xl font-outfit font-black text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {state.lastDiceRoll[0] + state.lastDiceRoll[1]}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-white/20 font-black tracking-widest uppercase text-xs flex flex-col items-center gap-2">
                            <Dices size={32} strokeWidth={1} className="opacity-20 translate-y-2" />
                            NOT ROLLED
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <button
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-full group relative py-4 rounded-2xl font-outfit font-black text-lg uppercase tracking-widest transition-all duration-300 border-2 overflow-hidden ${canRoll
                        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95"
                        : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                    }`}
            >
                <div className="flex items-center justify-center gap-3 z-10 relative">
                    <Dices size={22} className={canRoll ? "animate-bounce" : ""} />
                    {canRoll ? "Roll Dice" : isMyTurn ? "Action Phase" : "Waiting"}
                </div>
                {canRoll && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
            </button>
        </div>
    );
}

function Die({ value, isRed }: { value: number; isRed?: boolean }) {
    const dots = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [25, 75], [75, 25], [75, 75]],
        5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
        6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
    }[value as 1 | 2 | 3 | 4 | 5 | 6] || [];

    return (
        <div className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center border-b-4 ${isRed
                ? "bg-red-600 border-red-800 shadow-red-900/40"
                : "bg-white border-slate-300 shadow-black/40"
            }`}>
            <svg viewBox="0 0 100 100" className="w-10 h-10">
                {dots.map((pos, i) => (
                    <circle
                        key={i}
                        cx={pos[0]}
                        cy={pos[1]}
                        r="9"
                        fill={isRed ? "white" : "#1e293b"}
                        className="drop-shadow-sm"
                    />
                ))}
            </svg>
        </div>
    );
}
