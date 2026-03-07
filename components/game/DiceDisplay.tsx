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
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <AnimatePresence mode="popLayout">
                    {state.lastDiceRoll ? (
                        <motion.div
                            key={state.lastDiceRoll.join("-") + Date.now()}
                            initial={{ scale: 0.8, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-2xl"
                        >
                            <div className="flex gap-1">
                                <Die value={state.lastDiceRoll[0]} isRed />
                                <Die value={state.lastDiceRoll[1]} />
                            </div>
                            <div className="text-2xl font-outfit font-black text-white px-1 drop-shadow-md">
                                {state.lastDiceRoll[0] + state.lastDiceRoll[1]}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="bg-black/20 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2 opacity-40">
                            <Dices size={14} className="text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ready</span>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {canRoll && (
                <button
                    onClick={onRoll}
                    className="group relative px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-outfit font-black rounded-xl transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-blue-900/40 uppercase tracking-widest text-xs flex items-center gap-2 animate-bounce"
                >
                    <Dices size={14} />
                    Roll
                </button>
            )}
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
        <div className={`w-8 h-8 rounded-lg shadow-md flex items-center justify-center border-b ${isRed
            ? "bg-red-600 border-red-800"
            : "bg-white border-slate-300"
            }`}>
            <svg viewBox="0 0 100 100" className="w-5 h-5">
                {dots.map((pos, i) => (
                    <circle
                        key={i}
                        cx={pos[0]}
                        cy={pos[1]}
                        r="12"
                        fill={isRed ? "white" : "#1e293b"}
                    />
                ))}
            </svg>
        </div>
    );
}
