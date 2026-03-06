import { create } from "zustand";
import { GameState, GameAction, GameLogEntry } from "../lib/types";

interface GameStore {
    gameState: GameState | null;
    playerId: string | null;
    isConnected: boolean;
    error: string | null;
    chatMessages: GameLogEntry[];

    setGameState: (state: GameState) => void;
    setPlayerId: (id: string) => void;
    setConnectionStatus: (status: boolean) => void;
    setError: (error: string | null) => void;
    addChatMessage: (msg: GameLogEntry) => void;
}

export const useGameStore = create<GameStore>((set) => ({
    gameState: null,
    playerId: null,
    isConnected: false,
    error: null,
    chatMessages: [],

    setGameState: (state) => set({ gameState: state, error: null }),
    setPlayerId: (id) => set({ playerId: id }),
    setConnectionStatus: (status) => set({ isConnected: status }),
    setError: (error) => set({ error }),
    addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
}));
