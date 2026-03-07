import React, { useEffect, useRef } from "react";
import { GameLogEntry } from "../../lib/types";

interface Props {
    log: GameLogEntry[];
    players: import("../../lib/types").Player[];
}

export function GameLog({ log, players }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [log.length]);

    return (
        <div className="glass-dark rounded-2xl shadow-xl border border-white/5 flex flex-col h-full min-h-[150px]">
            <div className="px-3 py-1 border-b border-white/5 bg-white/5 rounded-t-2xl font-outfit font-black text-white/40 text-[8px] tracking-widest uppercase">
                Game Log
            </div>
            <div
                ref={containerRef}
                className="flex-1 p-3 overflow-y-auto flex flex-col gap-1 text-[11px] font-medium scrollbar-thin scrollbar-thumb-white/10"
            >
                {log.map((entry, idx) => {
                    const p = players.find(x => x.id === entry.playerId);
                    return (
                        <div key={idx} className="flex gap-1.5 leading-tight">
                            {p ? (
                                <>
                                    <span style={{ color: p.color }} className="font-black flex-shrink-0 opacity-90">{p.name}</span>
                                    <span className="text-white/70">{entry.text}</span>
                                </>
                            ) : (
                                <span className="text-white/40 italic">Game: {entry.text}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
