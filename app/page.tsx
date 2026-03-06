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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-blue-600 p-8 text-center text-white relative h-40 flex items-center justify-center">
                    <Hexagon size={120} className="absolute opacity-10" />
                    <h1 className="text-4xl font-black tracking-tight relative z-10 drop-shadow-md">Catan Friends</h1>
                </div>

                <div className="p-8 pb-10 flex flex-col gap-6">
                    <button
                        onClick={createRoom}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xl rounded-xl shadow border-b-4 border-orange-700 active:translate-y-1 active:border-b-0 transition-all"
                    >
                        Create New Game
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 font-bold uppercase text-xs tracking-wider">OR</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <form onSubmit={joinRoom} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Room Code"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            maxLength={10}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                        />
                        <button
                            type="submit"
                            disabled={joinCode.length < 3}
                            className="px-6 py-3 bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl"
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
