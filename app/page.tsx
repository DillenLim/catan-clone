"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Hexagon } from "lucide-react";

export default function HomePage() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState("");

    const createRoom = () => {
        // Generate a 6-character room code
        const code = nanoid(6).toUpperCase();
        router.push(`/room/${code}`);
    };

    const joinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length > 2) {
            router.push(`/room/${joinCode.toUpperCase()}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
            <div className="max-w-md w-full glass-dark rounded-3xl shadow-2xl overflow-hidden border border-white/10 backdrop-blur-md">
                <div className="bg-slate-900/40 p-8 text-center text-white relative h-40 flex items-center justify-center border-b border-white/5">
                    <Hexagon size={140} className="absolute opacity-5 text-blue-400" />
                    <h1 className="text-4xl font-black tracking-tight relative z-10 drop-shadow-md flex items-center gap-3">
                        <Hexagon size={32} className="text-blue-500" strokeWidth={2.5} />
                        Catan Friends
                    </h1>
                </div>

                <div className="p-8 pb-10 flex flex-col gap-6">
                    <button
                        onClick={createRoom}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] border-b-4 border-blue-800 active:translate-y-1 active:border-b-0 transition-all uppercase tracking-widest"
                    >
                        Create New Game
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-white/30 font-bold uppercase text-xs tracking-widest">OR</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <form onSubmit={joinRoom} className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Room Code"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            maxLength={10}
                            className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-white/20 text-white"
                        />
                        <button
                            type="submit"
                            disabled={joinCode.length < 3}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/50 disabled:text-white/20 text-white font-black rounded-2xl transition-colors uppercase tracking-widest text-sm"
                        >
                            Join
                        </button>
                    </form>
                </div>
            </div>

            <div className="fixed bottom-4 text-slate-400 text-xs font-medium">
                An open-source minimal Catan clone powered by Next.js and PartyKit.
            </div>
        </div>
    );
}
