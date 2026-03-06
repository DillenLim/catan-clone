// Wait, zustand doesn't export useState/useEffect. It's from React!
import { useState as useReactState, useEffect as useReactEffect } from "react";
import { nanoid } from "nanoid";

export function usePlayerSession() {
    const [playerId, setPlayerId] = useReactState<string | null>(null);

    useReactEffect(() => {
        // Check localStorage
        const stored = localStorage.getItem("catan_player_id");
        if (stored) {
            setPlayerId(stored);
        } else {
            const newId = nanoid(10);
            localStorage.setItem("catan_player_id", newId);
            setPlayerId(newId);
        }
    }, []);

    return playerId;
}
