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
        <div className="bg-white rounded-xl shadow border border-slate-200 flex flex-col h-48">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl font-bold text-slate-800 text-sm tracking-wider uppercase">
                Game Log
            </div>
            <div
                ref={containerRef}
                className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 text-sm font-medium"
            >
                {log.map((entry, idx) => {
                    const p = players.find(x => x.id === entry.playerId);
                    return (
                        <div key={idx} className="flex gap-2 leading-tight">
                            {p ? (
                                <>
                                    <span style={{ color: p.color }} className="font-bold flex-shrink-0">{p.name}</span>
                                    <span className="text-slate-600">{entry.text}</span>
                                </>
                            ) : (
                                <span className="text-slate-500 italic">Game: {entry.text}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
