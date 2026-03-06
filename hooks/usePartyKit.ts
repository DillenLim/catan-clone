import { useEffect, useRef } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "../store/gameStore";
import { ServerMessage, ClientMessage, GameAction } from "../lib/types";

export function usePartyKit(roomCode: string, playerId: string | null) {
    const socketRef = useRef<PartySocket | null>(null);
    const { setGameState, setConnectionStatus, setError, addChatMessage } = useGameStore();

    useEffect(() => {
        if (!playerId || !roomCode) return;

        // Use localhost in dev, or deployed URL in prod
        const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

        const socket = new PartySocket({
            host,
            room: roomCode,
            query: { playerId } // can pass info on connect if needed
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
            setConnectionStatus(true);
            setError(null);
        });

        socket.addEventListener("close", () => {
            setConnectionStatus(false);
        });

        socket.addEventListener("error", () => {
            setError("WebSocket connection error.");
            setConnectionStatus(false);
        });

        socket.addEventListener("message", (event) => {
            try {
                const msg = JSON.parse(event.data) as ServerMessage;

                switch (msg.type) {
                    case "STATE_UPDATE":
                        setGameState(msg.payload);
                        break;
                    case "ERROR":
                        setError(msg.message);
                        // Auto-clear short-lived errors
                        setTimeout(() => setError(null), 3000);
                        break;
                    case "CHAT":
                        addChatMessage({
                            playerId: msg.payload.playerId,
                            text: msg.payload.text,
                            timestamp: msg.payload.timestamp
                        });
                        break;
                }
            } catch (e) {
                console.error("Failed to parse socket message", e);
            }
        });

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [roomCode, playerId, setGameState, setConnectionStatus, setError, addChatMessage]);

    const sendMessage = (msg: import("../lib/types").ClientMessagePayload) => {
        if (socketRef.current && playerId) {
            socketRef.current.send(JSON.stringify({ ...msg, playerId }));
        }
    };

    const dispatchAction = (action: GameAction) => {
        sendMessage({ type: "ACTION", payload: action });
    };

    return { sendMessage, dispatchAction };
}
