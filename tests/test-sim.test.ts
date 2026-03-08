import { GameState } from '../lib/types';
import CatanRoom from '../party/index';

describe('Server Action Simulation', () => {
    it('Should clear lastDistribution on End Turn', () => {
        const connections: any[] = [];
        const mockRoom = {
            id: "test",
            connections: new Map(),
            getConnection: (id: string) => mockRoom.connections.get(id),
            getConnections: () => mockRoom.connections.values(),
            broadcast: (msg: string) => connections.forEach(c => c.send(msg)),
        } as any;

        const room = new CatanRoom(mockRoom);

        let lastState: GameState;

        function connect(id: string) {
            const conn = {
                id,
                send: (msg: string) => {
                    const data = JSON.parse(msg);
                    if (data.type === "STATE_UPDATE") {
                        lastState = data.payload;
                        console.log(`[>> ${id} received] STATE_UPDATE, lastDistribution:`, JSON.stringify(data.payload.lastDistribution));
                    }
                }
            } as any;
            mockRoom.connections.set(id, conn);
            connections.push(conn);
            room.onConnect(conn, {} as any);
            return conn;
        }

        const alice = connect("p1");
        const bob = connect("p2");

        room.onMessage(JSON.stringify({ type: "JOIN", playerId: "p1", player: { name: "Alice", color: "red" } }), alice);
        room.onMessage(JSON.stringify({ type: "JOIN", playerId: "p2", player: { name: "Bob", color: "blue" } }), bob);

        room.onMessage(JSON.stringify({ type: "READY", playerId: "p1" }), alice);
        room.onMessage(JSON.stringify({ type: "READY", playerId: "p2" }), bob);

        room.onMessage(JSON.stringify({ type: "START_GAME", playerId: "p1" }), alice);

        // Force to playing phase for testing
        room.gameState.status = "playing";
        room.gameState.phase = "roll";
        room.gameState.currentPlayerId = "p1";
        room.broadcastState();

        console.log("\n--- ROLLING DICE ---");
        room.onMessage(JSON.stringify({ type: "ACTION", playerId: "p1", payload: { type: "ROLL_DICE" } }), alice);

        console.log("\n--- BUILDING ROAD ---");
        room.onMessage(JSON.stringify({ type: "ACTION", playerId: "p1", payload: { type: "BUILD_ROAD", edgeId: 1 } }), alice);

        console.log("\n--- ENDING TURN ---");
        room.onMessage(JSON.stringify({ type: "ACTION", playerId: "p1", payload: { type: "END_TURN" } }), alice);

        expect(lastState!.lastDistribution).toBeNull();
    });
});
