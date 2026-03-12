import { GameState, Player } from '../lib/types';
import { applyAction } from '../lib/game-logic/actions';
import { isValidPhase } from '../lib/game-logic/validation';
import { checkWinCondition } from '../lib/game-logic/victory';

// ─── Helper ──────────────────────────────────────────────────────────────────

function create5PlayerState(): GameState {
    const makePlayer = (id: string, name: string, color: string, isHost: boolean): Player => ({
        id, name, color,
        resources: { wood: 5, brick: 5, wool: 5, wheat: 5, ore: 5 },
        devCards: [], devCardPlayedThisTurn: false, devCardsBoughtThisTurn: [],
        knightsPlayed: 0, roadsBuilt: 0, settlementsBuilt: 0, citiesBuilt: 0,
        hasLongestRoad: false, hasLargestArmy: false, isReady: true, isConnected: true, isHost
    });

    return {
        roomCode: 'TEST5P',
        status: 'playing',
        players: [
            makePlayer('p1', 'Alice', '#ef4444', true),
            makePlayer('p2', 'Bob', '#3b82f6', false),
            makePlayer('p3', 'Charlie', '#e2e8f0', false),
            makePlayer('p4', 'Diana', '#f97316', false),
            makePlayer('p5', 'Eve', '#22c55e', false),
        ],
        turnOrder: ['p1', 'p2', 'p3', 'p4', 'p5'],
        currentPlayerId: 'p1',
        phase: 'action',
        initialPlacementRound: 1,
        initialPlacementIndex: 0,
        hexes: [{ id: 1, q: 0, r: 0, type: 'forest', numberToken: 6, hasRobber: false }],
        vertices: [],
        edges: [],
        bank: { wood: 24, brick: 24, wool: 24, wheat: 24, ore: 24 },
        devCardDeckCount: 34,
        freeRoadsRemaining: 0,
        longestRoadPlayerId: null,
        longestRoadLength: 0,
        largestArmyPlayerId: null,
        largestArmyCount: 0,
        lastDiceRoll: [3, 3],
        lastDistribution: null,
        pendingDiscarders: [],
        pendingTradeOffer: null,
        log: [],
        winnerId: null,
        settings: { boardLayout: 'random', victoryPoints: 10, maritimeOnly: false, turnTimerSeconds: null, expansionMode: '5-6' as const },
        specialBuildPhaseActive: false,
        specialBuildOrder: [],
        specialBuildIndex: 0
    };
}

/** Helper: put the state into special_building with p2 as the first builder */
function enterSpecialBuild(state: GameState): GameState {
    state.phase = 'special_building';
    state.specialBuildPhaseActive = true;
    state.specialBuildOrder = ['p2', 'p3', 'p4', 'p5'];
    state.specialBuildIndex = 0;
    return state;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Special Building Phase', () => {

    // ── Entering Special Build Phase ─────────────────────────────────────────

    describe('Entering Special Build Phase', () => {

        it('END_TURN with 5 players enters special build', () => {
            const state = create5PlayerState();
            // p1 is current, action phase, 5-6 expansion
            const result = applyAction({ type: 'END_TURN' }, 'p1', state);

            expect(result.valid).toBe(true);
            if (!result.valid) return;

            const ns = result.newState;
            expect(ns.phase).toBe('special_building');
            expect(ns.specialBuildPhaseActive).toBe(true);
            expect(ns.specialBuildOrder).toEqual(['p2', 'p3', 'p4', 'p5']);
            expect(ns.specialBuildIndex).toBe(0);
        });

        it('END_TURN with base game does NOT enter special build', () => {
            const state = create5PlayerState();
            // Override to base game with 2 players
            state.players = state.players.slice(0, 2);
            state.turnOrder = ['p1', 'p2'];
            state.settings.expansionMode = 'base';

            const result = applyAction({ type: 'END_TURN' }, 'p1', state);

            expect(result.valid).toBe(true);
            if (!result.valid) return;

            const ns = result.newState;
            expect(ns.phase).toBe('roll');
            expect(ns.specialBuildPhaseActive).toBe(false);
            expect(ns.currentPlayerId).toBe('p2');
        });
    });

    // ── Actions During Special Build ─────────────────────────────────────────

    describe('Actions During Special Build', () => {

        it('PASS_SPECIAL_BUILD advances to next builder', () => {
            const state = enterSpecialBuild(create5PlayerState());

            const result = applyAction({ type: 'PASS_SPECIAL_BUILD' }, 'p2', state);

            expect(result.valid).toBe(true);
            if (!result.valid) return;

            expect(result.newState.specialBuildIndex).toBe(1);
            expect(result.newState.specialBuildPhaseActive).toBe(true);
            expect(result.newState.phase).toBe('special_building');
        });

        it('PASS_SPECIAL_BUILD by wrong player fails', () => {
            const state = enterSpecialBuild(create5PlayerState());
            // p3 tries to pass when index 0 -> p2 should go

            const result = applyAction({ type: 'PASS_SPECIAL_BUILD' }, 'p3', state);

            expect(result.valid).toBe(false);
            if (result.valid) return;
            expect(result.error).toContain('Not your special build turn');
        });

        it('Last player PASS_SPECIAL_BUILD exits special build', () => {
            const state = enterSpecialBuild(create5PlayerState());
            // Advance index to last player (p5, index 3)
            state.specialBuildIndex = 3;

            const result = applyAction({ type: 'PASS_SPECIAL_BUILD' }, 'p5', state);

            expect(result.valid).toBe(true);
            if (!result.valid) return;

            const ns = result.newState;
            expect(ns.specialBuildPhaseActive).toBe(false);
            expect(ns.specialBuildOrder).toEqual([]);
            expect(ns.specialBuildIndex).toBe(0);
            expect(ns.phase).toBe('roll');
            // p1 was current turn player, next should be p2
            expect(ns.currentPlayerId).toBe('p2');
        });

        it('BUILD_ROAD action allowed during special build with valid edge', () => {
            const state = enterSpecialBuild(create5PlayerState());

            // Set up minimal board for p2 to build a road:
            // vertex 10 has p2's settlement, vertex 11 is adjacent
            // edge 100 connects vertex 10 and 11
            state.vertices = [
                {
                    id: 10, x: 0, y: 0,
                    adjacentHexIds: [1],
                    adjacentEdgeIds: [100],
                    adjacentVertexIds: [11],
                    building: { type: 'settlement', playerId: 'p2' },
                    harbor: null
                },
                {
                    id: 11, x: 1, y: 0,
                    adjacentHexIds: [1],
                    adjacentEdgeIds: [100],
                    adjacentVertexIds: [10],
                    building: null,
                    harbor: null
                }
            ];
            state.edges = [
                { id: 100, vertexIds: [10, 11], road: null }
            ];

            const result = applyAction({ type: 'BUILD_ROAD', edgeId: 100 }, 'p2', state);

            expect(result.valid).toBe(true);
            if (!result.valid) return;

            expect(result.newState.edges.find(e => e.id === 100)!.road).toEqual({ playerId: 'p2' });
            // Resources should be deducted
            const p2 = result.newState.players.find(p => p.id === 'p2')!;
            expect(p2.resources.wood).toBe(4);
            expect(p2.resources.brick).toBe(4);
        });
    });

    // ── Blocked Actions During Special Build ─────────────────────────────────

    describe('Blocked Actions During Special Build', () => {

        it('BANK_TRADE blocked during special build', () => {
            const state = enterSpecialBuild(create5PlayerState());

            const result = applyAction(
                { type: 'BANK_TRADE', offer: { wood: 4 }, request: { ore: 1 } },
                'p2',
                state
            );

            expect(result.valid).toBe(false);
            if (result.valid) return;
            expect(result.error).toContain('Cannot perform BANK_TRADE');
        });

        it('OFFER_TRADE blocked during special build', () => {
            const state = enterSpecialBuild(create5PlayerState());

            const result = applyAction(
                { type: 'OFFER_TRADE', offer: { wood: 1 }, request: { ore: 1 } },
                'p2',
                state
            );

            expect(result.valid).toBe(false);
            if (result.valid) return;
            expect(result.error).toContain('Cannot perform OFFER_TRADE');
        });

        it('PLAY_KNIGHT blocked during special build', () => {
            expect(isValidPhase({ type: 'PLAY_KNIGHT', hexId: 1 }, 'special_building')).toBe(false);
        });

        it('PLAY_MONOPOLY blocked during special build', () => {
            expect(isValidPhase({ type: 'PLAY_MONOPOLY', resource: 'wood' }, 'special_building')).toBe(false);
        });

        it('ROLL_DICE blocked during special build', () => {
            expect(isValidPhase({ type: 'ROLL_DICE' }, 'special_building')).toBe(false);
        });

        it('END_TURN blocked during special build', () => {
            expect(isValidPhase({ type: 'END_TURN' }, 'special_building')).toBe(false);
        });
    });

    // ── Victory Blocking ─────────────────────────────────────────────────────

    describe('Victory Blocking', () => {

        it('Cannot win during special build phase', () => {
            const state = enterSpecialBuild(create5PlayerState());
            // Give p1 enough VP to win: 2 settlements + 3 cities + longest road = 2 + 6 + 2 = 10
            const p1 = state.players.find(p => p.id === 'p1')!;
            p1.settlementsBuilt = 2;
            p1.citiesBuilt = 3;
            p1.hasLongestRoad = true;
            state.longestRoadPlayerId = 'p1';

            const winner = checkWinCondition(state);
            expect(winner).toBeNull();
        });

        it('Can win during normal turn', () => {
            const state = create5PlayerState();
            state.phase = 'action';
            // Give p1 (current player) enough VP: 2 settlements + 3 cities + longest road = 10
            const p1 = state.players.find(p => p.id === 'p1')!;
            p1.settlementsBuilt = 2;
            p1.citiesBuilt = 3;
            p1.hasLongestRoad = true;
            state.longestRoadPlayerId = 'p1';

            const winner = checkWinCondition(state);
            expect(winner).toBe('p1');
        });
    });

    // ── isValidPhase Checks ──────────────────────────────────────────────────

    describe('isValidPhase checks', () => {

        it('BUILD_ROAD allowed during special_building', () => {
            expect(isValidPhase({ type: 'BUILD_ROAD', edgeId: 1 }, 'special_building')).toBe(true);
        });

        it('BUILD_SETTLEMENT allowed during special_building', () => {
            expect(isValidPhase({ type: 'BUILD_SETTLEMENT', vertexId: 1 }, 'special_building')).toBe(true);
        });

        it('BUILD_CITY allowed during special_building', () => {
            expect(isValidPhase({ type: 'BUILD_CITY', vertexId: 1 }, 'special_building')).toBe(true);
        });

        it('BUY_DEV_CARD allowed during special_building', () => {
            expect(isValidPhase({ type: 'BUY_DEV_CARD' }, 'special_building')).toBe(true);
        });

        it('PASS_SPECIAL_BUILD only allowed during special_building', () => {
            expect(isValidPhase({ type: 'PASS_SPECIAL_BUILD' }, 'special_building')).toBe(true);
            expect(isValidPhase({ type: 'PASS_SPECIAL_BUILD' }, 'action')).toBe(false);
        });
    });

    // ── Special Build Turn Check ─────────────────────────────────────────────

    describe('Special Build Turn Check', () => {

        it('Non-special-builder cannot act during special build', () => {
            const state = enterSpecialBuild(create5PlayerState());
            // specialBuildOrder[0] is p2, so p3 cannot act

            // Set up a minimal edge so BUILD_ROAD itself is structurally valid
            state.vertices = [
                {
                    id: 10, x: 0, y: 0,
                    adjacentHexIds: [1],
                    adjacentEdgeIds: [100],
                    adjacentVertexIds: [11],
                    building: { type: 'settlement', playerId: 'p3' },
                    harbor: null
                },
                {
                    id: 11, x: 1, y: 0,
                    adjacentHexIds: [1],
                    adjacentEdgeIds: [100],
                    adjacentVertexIds: [10],
                    building: null,
                    harbor: null
                }
            ];
            state.edges = [
                { id: 100, vertexIds: [10, 11], road: null }
            ];

            const result = applyAction({ type: 'BUILD_ROAD', edgeId: 100 }, 'p3', state);

            expect(result.valid).toBe(false);
            if (result.valid) return;
            expect(result.error).toContain('Not your special build turn');
        });
    });
});
