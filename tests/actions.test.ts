import { GameState, Player } from '../lib/types';
import { applyAction } from '../lib/game-logic/actions';

describe('Game Actions: lastDistribution Clearing', () => {

    const createDummyState = (): GameState => {
        const p1: Player = {
            id: 'p1', name: 'Alice', color: 'red',
            resources: { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 },
            devCards: [], devCardPlayedThisTurn: false, devCardsBoughtThisTurn: [],
            knightsPlayed: 0, roadsBuilt: 0, settlementsBuilt: 0, citiesBuilt: 0,
            hasLongestRoad: false, hasLargestArmy: false, isReady: true, isConnected: true, isHost: true
        };

        const p2: Player = {
            id: 'p2', name: 'Bob', color: 'blue',
            resources: { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 },
            devCards: [], devCardPlayedThisTurn: false, devCardsBoughtThisTurn: [],
            knightsPlayed: 0, roadsBuilt: 0, settlementsBuilt: 0, citiesBuilt: 0,
            hasLongestRoad: false, hasLargestArmy: false, isReady: true, isConnected: true, isHost: false
        };

        return {
            roomCode: 'TEST',
            status: 'playing',
            players: [p1, p2],
            turnOrder: ['p1', 'p2'],
            currentPlayerId: 'p1',
            phase: 'action',
            initialPlacementRound: 1,
            initialPlacementIndex: 0,
            hexes: [
                { id: 1, q: 0, r: 0, type: 'forest', numberToken: 6, hasRobber: false }
            ],
            vertices: [],
            edges: [],
            bank: { wood: 19, brick: 19, wool: 19, wheat: 19, ore: 19 },
            devCardDeckCount: 25,
            freeRoadsRemaining: 0,
            longestRoadPlayerId: null,
            longestRoadLength: 0,
            largestArmyPlayerId: null,
            largestArmyCount: 0,
            lastDiceRoll: [3, 3],
            // Pre-populate some old distribution data to ensure it gets wiped!
            lastDistribution: [
                { playerId: 'p1', hexId: 1, resource: 'wood', amount: 1 }
            ],
            pendingDiscarders: [],
            pendingTradeOffer: null,
            log: [],
            winnerId: null,
            settings: { boardLayout: 'random', victoryPoints: 10, maritimeOnly: false, turnTimerSeconds: null }
        };
    };

    it('should explicitly clear lastDistribution when ending a turn', () => {
        const state = createDummyState();

        const result = applyAction({ type: 'END_TURN' }, 'p1', state);

        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.newState.lastDistribution).toBeNull();
            expect(result.newState.currentPlayerId).toBe('p2');
        }
    });

    it('should explicitly clear lastDistribution when moving the robber', () => {
        const state = createDummyState();
        state.phase = 'move_robber';

        const result = applyAction({ type: 'MOVE_ROBBER', hexId: 1 }, 'p1', state);

        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.newState.lastDistribution).toBeNull();
        }
    });

});
