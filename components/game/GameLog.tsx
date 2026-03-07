import React, { useEffect, useRef } from "react";
import { GameLogEntry } from "../../lib/types";
import { RESOURCE_ICONS, RESOURCE_COLORS } from "./ResourceHand";
import { Home, Castle, Minus, Sword, ScrollText } from "lucide-react";

interface Props {
    log: GameLogEntry[];
    players: import("../../lib/types").Player[];
}

const parseLogText = (text: string) => {
    const parts = text.split(/(\[[^[\]]+\])/g);
    return parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
            const inner = part.slice(1, -1).trim();
            const segments = inner.split(" ");
            let amt = "";
            let type = "";
            if (segments.length > 1 && !isNaN(parseInt(segments[0]))) {
                amt = segments[0];
                type = segments[1];
            } else {
                type = segments[0];
            }

            type = type.toLowerCase();

            let icon = null;
            let bgColor = "bg-white/10 text-white border-white/20";

            if (RESOURCE_ICONS[type]) {
                icon = RESOURCE_ICONS[type];
                bgColor = RESOURCE_COLORS[type as keyof typeof RESOURCE_COLORS];
            } else if (type === "road" || type === "road_building") {
                icon = <Minus size={14} strokeWidth={4} />;
                bgColor = "bg-stone-600/50 text-stone-200 border-stone-500/30";
            } else if (type === "settlement") {
                icon = <Home size={14} strokeWidth={2.5} />;
                bgColor = "bg-stone-600/50 text-stone-200 border-stone-500/30";
            } else if (type === "city") {
                icon = <Castle size={14} strokeWidth={2.5} />;
                bgColor = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
            } else if (type === "knight") {
                icon = <Sword size={14} strokeWidth={2.5} />;
                bgColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
            } else if (type === "monopoly" || type === "year_of_plenty") {
                icon = <ScrollText size={14} strokeWidth={2.5} />;
                bgColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
            }

            if (icon) {
                return (
                    <span key={i} className={`inline-flex items-center gap-1 mx-0.5 px-1 py-0 rounded border text-[10px] uppercase font-black tracking-tight ${bgColor} align-text-bottom leading-none`}>
                        <span className="scale-[0.5] origin-center -mx-1 -my-1">{icon}</span>
                        {amt && <span className="mr-0.5">{amt}</span>}
                    </span>
                );
            }
            return <span key={i} className="font-bold text-white/90">{inner}</span>;
        }
        return <span key={i}>{part}</span>;
    });
};

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
            <div className="px-3 py-1 border-b border-white/5 bg-white/5 rounded-t-2xl font-outfit font-black text-white/40 text-[8px] tracking-widest uppercase flex-shrink-0">
                Game Log
            </div>
            <div
                ref={containerRef}
                className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5 text-[12px] font-medium scrollbar-thin scrollbar-thumb-white/10 break-words"
            >
                {log.map((entry, idx) => {
                    const p = players.find(x => x.id === entry.playerId);
                    return (
                        <div key={idx} className="flex gap-1.5 leading-snug items-start">
                            {p ? (
                                <>
                                    <span style={{ color: p.color }} className="font-black flex-shrink-0 opacity-90">{p.name}</span>
                                    <span className="text-white/70 inline-block">{parseLogText(entry.text)}</span>
                                </>
                            ) : (
                                <span className="text-white/40 italic inline-block">Game: {parseLogText(entry.text)}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
