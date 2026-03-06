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
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200 flex flex-col items-center justify-center gap-4">

            <div className="flex items-center gap-4 h-16">
                <AnimatePresence mode="popLayout">
                    {state.lastDiceRoll ? (
                        <motion.div
                            key={state.lastDiceRoll.join("-") + Date.now()} // Force re-animation on same roll value
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="flex items-center gap-3"
                        >
                            <Die value={state.lastDiceRoll[0]} />
                            <Die value={state.lastDiceRoll[1]} />
                            <div className="ml-4 text-3xl font-black text-slate-800">
                                {state.lastDiceRoll[0] + state.lastDiceRoll[1]}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-slate-400 italic">No rolls yet</div>
                    )}
                </AnimatePresence>
            </div>

            <button
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${canRoll
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg translate-y-0 active:translate-y-1"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
            >
                <Dices size={20} />
                {canRoll ? "Roll Dice" : isMyTurn ? "Action Phase" : "Waiting for turn"}
            </button>

        </div>
    );
}

function Die({ value }: { value: number }) {
    // Simple SVG or CSS die face
    const dots = {
        1: [[50, 50]],
        2: [[20, 20], [80, 80]],
        3: [[20, 20], [50, 50], [80, 80]],
        4: [[20, 20], [20, 80], [80, 20], [80, 80]],
        5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
        6: [[20, 20], [20, 50], [20, 80], [80, 20], [80, 50], [80, 80]],
    }[value as 1 | 2 | 3 | 4 | 5 | 6] || [];

    return (
        <div className="w-12 h-12 bg-red-500 rounded-xl shadow-inner border-b-4 border-red-700 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                {dots.map((pos, i) => (
                    <circle key={i} cx={pos[0]} cy={pos[1]} r="10" fill="white" />
                ))}
            </svg>
        </div>
    );
}
