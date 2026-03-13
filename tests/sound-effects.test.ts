import { GameState, Player } from '../lib/types';

/**
 * Tests for the sound effects state-diff logic.
 * We extract the detection logic from useSoundEffects and verify that
 * every game event triggers the correct sound name.
 */

// ─── Helpers ───

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
    return {
        id, name: `Player_${id}`, color: 'red',
        resources: { wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 },
        devCards: [], devCardPlayedThisTurn: false, devCardsBoughtThisTurn: [],
        knightsPlayed: 0, roadsBuilt: 0, settlementsBuilt: 0, citiesBuilt: 0,
        hasLongestRoad: false, hasLargestArmy: false, isReady: true, isConnected: true, isHost: false,
        ...overrides,
    };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        roomCode: 'TEST',
        status: 'playing',
        players: [makePlayer('p1', { isHost: true }), makePlayer('p2')],
        turnOrder: ['p1', 'p2'],
        currentPlayerId: 'p1',
        phase: 'action',
        initialPlacementRound: 1,
        initialPlacementIndex: 0,
        hexes: [
            { id: 1, q: 0, r: 0, type: 'forest', numberToken: 6, hasRobber: false },
            { id: 2, q: 1, r: 0, type: 'desert', numberToken: null, hasRobber: true },
        ],
        vertices: [
            { id: 1, x: 0, y: 0, adjacentHexIds: [1], adjacentEdgeIds: [1], adjacentVertexIds: [2], building: null, harbor: null },
            { id: 2, x: 1, y: 0, adjacentHexIds: [1, 2], adjacentEdgeIds: [1, 2], adjacentVertexIds: [1, 3], building: null, harbor: null },
            { id: 3, x: 2, y: 0, adjacentHexIds: [2], adjacentEdgeIds: [2], adjacentVertexIds: [2], building: null, harbor: null },
        ],
        edges: [
            { id: 1, vertexIds: [1, 2], road: null },
            { id: 2, vertexIds: [2, 3], road: null },
        ],
        bank: { wood: 19, brick: 19, wool: 19, wheat: 19, ore: 19 },
        devCardDeckCount: 25,
        freeRoadsRemaining: 0,
        longestRoadPlayerId: null,
        longestRoadLength: 0,
        largestArmyPlayerId: null,
        largestArmyCount: 0,
        lastDiceRoll: null,
        lastDistribution: null,
        pendingDiscarders: [],
        pendingTradeOffer: null,
        log: [],
        winnerId: null,
        settings: { boardLayout: 'random', victoryPoints: 10, maritimeOnly: false, turnTimerSeconds: null, expansionMode: 'base' as const },
        specialBuildPhaseActive: false,
        specialBuildOrder: [],
        specialBuildIndex: 0,
        ...overrides,
    };
}

/**
 * Pure function mirroring useSoundEffects logic.
 * Returns the list of sound names that would be played for a state transition.
 */
function detectSounds(prev: GameState, next: GameState, myPlayerId: string): string[] {
    const played: string[] = [];

    // Game started
    if (prev.status === "lobby" && next.status !== "lobby") {
        played.push("gameStarted");
        return played;
    }

    // Victory
    if (!prev.winnerId && next.winnerId) {
        played.push("victory");
        return played;
    }

    // Dice rolled
    if (next.lastDiceRoll && (!prev.lastDiceRoll || prev.lastDiceRoll[0] !== next.lastDiceRoll[0] || prev.lastDiceRoll[1] !== next.lastDiceRoll[1])) {
        played.push("diceRoll");
    }

    // Your turn started
    if (next.currentPlayerId === myPlayerId && prev.currentPlayerId !== myPlayerId && next.phase === "roll") {
        played.push("yourTurn");
    }

    // Discard notification
    if (next.pendingDiscarders.includes(myPlayerId) && !prev.pendingDiscarders.includes(myPlayerId)) {
        played.push("discardNotify");
    }

    // Robber moved
    const prevRobberHex = prev.hexes.find(h => h.hasRobber)?.id;
    const currRobberHex = next.hexes.find(h => h.hasRobber)?.id;
    if (prevRobberHex !== currRobberHex) {
        played.push("robberPlace");
    }

    // Buildings placed
    const prevBuildings = { settlement: 0, city: 0 };
    const currBuildings = { settlement: 0, city: 0 };
    for (const v of prev.vertices) { if (v.building) prevBuildings[v.building.type]++; }
    for (const v of next.vertices) { if (v.building) currBuildings[v.building.type]++; }
    if (currBuildings.city > prevBuildings.city) {
        played.push("cityPlace");
    } else if (currBuildings.settlement > prevBuildings.settlement) {
        played.push("settlementPlace");
    }

    // Roads placed
    const prevRoads = prev.edges.filter(e => e.road).length;
    const currRoads = next.edges.filter(e => e.road).length;
    if (currRoads > prevRoads) {
        played.push("roadPlace");
    }

    // Dev card bought
    if (next.devCardDeckCount < prev.devCardDeckCount) {
        played.push("devCardBought");
    }

    // Dev card played
    if (next.log.length > prev.log.length) {
        const newEntries = next.log.slice(prev.log.length);
        for (const entry of newEntries) {
            if (entry.text.includes("played") && entry.text.includes("[knight]")) {
                played.push("devCardPlayed"); break;
            }
            if (entry.text.includes("played") && entry.text.includes("[monopoly]")) {
                played.push("monopoly"); break;
            }
            if (entry.text.includes("played") && (entry.text.includes("[road_building]") || entry.text.includes("[year_of_plenty]"))) {
                played.push("devCardPlayed"); break;
            }
        }
    }

    // Trade offer
    if (next.pendingTradeOffer && !prev.pendingTradeOffer) {
        if (next.pendingTradeOffer.fromPlayerId !== myPlayerId) {
            played.push("tradeOffer");
        }
    }

    // Trade resolved
    if (prev.pendingTradeOffer && !next.pendingTradeOffer) {
        const offeringId = prev.pendingTradeOffer.fromPlayerId;
        const prevPlayer = prev.players.find(pl => pl.id === offeringId);
        const currPlayer = next.players.find(pl => pl.id === offeringId);
        if (prevPlayer && currPlayer) {
            const resourcesChanged = Object.keys(prevPlayer.resources).some(
                r => prevPlayer.resources[r as keyof typeof prevPlayer.resources] !== currPlayer.resources[r as keyof typeof currPlayer.resources]
            );
            played.push(resourcesChanged ? "tradeAccepted" : "tradeRejected");
        }
    }

    // Achievements
    if (next.longestRoadPlayerId && next.longestRoadPlayerId !== prev.longestRoadPlayerId) {
        played.push("achievement");
    }
    if (next.largestArmyPlayerId && next.largestArmyPlayerId !== prev.largestArmyPlayerId) {
        played.push("achievement");
    }

    // Player connection changes
    for (const player of next.players) {
        const prevP = prev.players.find(pl => pl.id === player.id);
        if (prevP) {
            if (prevP.isConnected && !player.isConnected) played.push("disconnect");
            if (!prevP.isConnected && player.isConnected) played.push("reconnect");
        }
    }

    // Lobby join/leave
    if (next.status === "lobby" && next.players.length > prev.players.length) {
        played.push("joinRoom");
    }
    if (next.status === "lobby" && next.players.length < prev.players.length) {
        played.push("leaveRoom");
    }

    return played;
}

// ─── Tests ───

describe('Sound Effects: State Diff Detection', () => {

    // ── Dice ──
    test('dice roll triggers diceRoll sound', () => {
        const prev = makeState({ lastDiceRoll: null });
        const next = makeState({ lastDiceRoll: [3, 4] });
        expect(detectSounds(prev, next, 'p1')).toContain('diceRoll');
    });

    test('same dice values do not re-trigger', () => {
        const prev = makeState({ lastDiceRoll: [3, 4] });
        const next = makeState({ lastDiceRoll: [3, 4] });
        expect(detectSounds(prev, next, 'p1')).not.toContain('diceRoll');
    });

    test('different dice values trigger diceRoll', () => {
        const prev = makeState({ lastDiceRoll: [3, 4] });
        const next = makeState({ lastDiceRoll: [5, 2] });
        expect(detectSounds(prev, next, 'p1')).toContain('diceRoll');
    });

    // ── Turn ──
    test('your turn starting triggers yourTurn sound', () => {
        const prev = makeState({ currentPlayerId: 'p2', phase: 'action' });
        const next = makeState({ currentPlayerId: 'p1', phase: 'roll' });
        expect(detectSounds(prev, next, 'p1')).toContain('yourTurn');
    });

    test('other player turn does not trigger yourTurn', () => {
        const prev = makeState({ currentPlayerId: 'p1', phase: 'action' });
        const next = makeState({ currentPlayerId: 'p2', phase: 'roll' });
        expect(detectSounds(prev, next, 'p1')).not.toContain('yourTurn');
    });

    // ── Buildings ──
    test('new settlement triggers settlementPlace', () => {
        const prev = makeState();
        const next = makeState({
            vertices: prev.vertices.map((v, i) =>
                i === 0 ? { ...v, building: { type: 'settlement', playerId: 'p1' } } : v
            ),
        });
        expect(detectSounds(prev, next, 'p1')).toContain('settlementPlace');
    });

    test('new city triggers cityPlace (not settlementPlace)', () => {
        const withSettlement = makeState({
            vertices: makeState().vertices.map((v, i) =>
                i === 0 ? { ...v, building: { type: 'settlement', playerId: 'p1' } } : v
            ),
        });
        const withCity = makeState({
            vertices: makeState().vertices.map((v, i) =>
                i === 0 ? { ...v, building: { type: 'city', playerId: 'p1' } } : v
            ),
        });
        const sounds = detectSounds(withSettlement, withCity, 'p1');
        expect(sounds).toContain('cityPlace');
        expect(sounds).not.toContain('settlementPlace');
    });

    test('new road triggers roadPlace', () => {
        const prev = makeState();
        const next = makeState({
            edges: prev.edges.map((e, i) =>
                i === 0 ? { ...e, road: { playerId: 'p1' } } : e
            ),
        });
        expect(detectSounds(prev, next, 'p1')).toContain('roadPlace');
    });

    // ── Robber ──
    test('robber moving triggers robberPlace', () => {
        const prev = makeState(); // robber on hex 2
        const next = makeState({
            hexes: [
                { id: 1, q: 0, r: 0, type: 'forest', numberToken: 6, hasRobber: true },
                { id: 2, q: 1, r: 0, type: 'desert', numberToken: null, hasRobber: false },
            ],
        });
        expect(detectSounds(prev, next, 'p1')).toContain('robberPlace');
    });

    test('robber staying triggers nothing', () => {
        const prev = makeState();
        const next = makeState();
        expect(detectSounds(prev, next, 'p1')).not.toContain('robberPlace');
    });

    // ── Dev cards ──
    test('dev card bought triggers devCardBought', () => {
        const prev = makeState({ devCardDeckCount: 25 });
        const next = makeState({ devCardDeckCount: 24 });
        expect(detectSounds(prev, next, 'p1')).toContain('devCardBought');
    });

    test('knight played triggers devCardPlayed', () => {
        const prev = makeState({ log: [] });
        const next = makeState({ log: [{ timestamp: 1, text: 'played [knight]', playerId: 'p1' }] });
        expect(detectSounds(prev, next, 'p1')).toContain('devCardPlayed');
    });

    test('monopoly played triggers monopoly sound', () => {
        const prev = makeState({ log: [] });
        const next = makeState({ log: [{ timestamp: 1, text: 'played [monopoly]', playerId: 'p1' }] });
        expect(detectSounds(prev, next, 'p1')).toContain('monopoly');
    });

    test('road_building played triggers devCardPlayed', () => {
        const prev = makeState({ log: [] });
        const next = makeState({ log: [{ timestamp: 1, text: 'played [road_building]', playerId: 'p1' }] });
        expect(detectSounds(prev, next, 'p1')).toContain('devCardPlayed');
    });

    test('year_of_plenty played triggers devCardPlayed', () => {
        const prev = makeState({ log: [] });
        const next = makeState({ log: [{ timestamp: 1, text: 'played [year_of_plenty]', playerId: 'p1' }] });
        expect(detectSounds(prev, next, 'p1')).toContain('devCardPlayed');
    });

    // ── Discard ──
    test('being added to pendingDiscarders triggers discardNotify', () => {
        const prev = makeState({ pendingDiscarders: [] });
        const next = makeState({ pendingDiscarders: ['p1'] });
        expect(detectSounds(prev, next, 'p1')).toContain('discardNotify');
    });

    test('other player needing to discard does not trigger for me', () => {
        const prev = makeState({ pendingDiscarders: [] });
        const next = makeState({ pendingDiscarders: ['p2'] });
        expect(detectSounds(prev, next, 'p1')).not.toContain('discardNotify');
    });

    // ── Trade ──
    test('incoming trade offer triggers tradeOffer', () => {
        const prev = makeState({ pendingTradeOffer: null });
        const next = makeState({
            pendingTradeOffer: { id: 't1', fromPlayerId: 'p2', offer: { wood: 1 }, request: { brick: 1 } },
        });
        expect(detectSounds(prev, next, 'p1')).toContain('tradeOffer');
    });

    test('own trade offer does not trigger tradeOffer sound', () => {
        const prev = makeState({ pendingTradeOffer: null });
        const next = makeState({
            pendingTradeOffer: { id: 't1', fromPlayerId: 'p1', offer: { wood: 1 }, request: { brick: 1 } },
        });
        expect(detectSounds(prev, next, 'p1')).not.toContain('tradeOffer');
    });

    test('trade accepted triggers tradeAccepted', () => {
        const prev = makeState({
            pendingTradeOffer: { id: 't1', fromPlayerId: 'p1', offer: { wood: 1 }, request: { brick: 1 } },
            players: [
                makePlayer('p1', { isHost: true, resources: { wood: 5, brick: 0, wool: 0, wheat: 0, ore: 0 } }),
                makePlayer('p2'),
            ],
        });
        const next = makeState({
            pendingTradeOffer: null,
            players: [
                makePlayer('p1', { isHost: true, resources: { wood: 4, brick: 1, wool: 0, wheat: 0, ore: 0 } }),
                makePlayer('p2'),
            ],
        });
        expect(detectSounds(prev, next, 'p1')).toContain('tradeAccepted');
    });

    test('trade cancelled triggers tradeRejected', () => {
        const prev = makeState({
            pendingTradeOffer: { id: 't1', fromPlayerId: 'p1', offer: { wood: 1 }, request: { brick: 1 } },
        });
        const next = makeState({ pendingTradeOffer: null });
        expect(detectSounds(prev, next, 'p1')).toContain('tradeRejected');
    });

    // ── Achievements ──
    test('longest road awarded triggers achievement', () => {
        const prev = makeState({ longestRoadPlayerId: null });
        const next = makeState({ longestRoadPlayerId: 'p1' });
        expect(detectSounds(prev, next, 'p1')).toContain('achievement');
    });

    test('largest army awarded triggers achievement', () => {
        const prev = makeState({ largestArmyPlayerId: null });
        const next = makeState({ largestArmyPlayerId: 'p2' });
        expect(detectSounds(prev, next, 'p1')).toContain('achievement');
    });

    test('longest road changing players triggers achievement', () => {
        const prev = makeState({ longestRoadPlayerId: 'p1' });
        const next = makeState({ longestRoadPlayerId: 'p2' });
        expect(detectSounds(prev, next, 'p1')).toContain('achievement');
    });

    // ── Game lifecycle ──
    test('game starting triggers gameStarted', () => {
        const prev = makeState({ status: 'lobby' });
        const next = makeState({ status: 'initial_placement' });
        const sounds = detectSounds(prev, next, 'p1');
        expect(sounds).toContain('gameStarted');
        // Should early-return, no other sounds
        expect(sounds).toEqual(['gameStarted']);
    });

    test('victory triggers victory and early-returns', () => {
        const prev = makeState({ winnerId: null });
        const next = makeState({ winnerId: 'p1' });
        const sounds = detectSounds(prev, next, 'p1');
        expect(sounds).toContain('victory');
        expect(sounds).toEqual(['victory']);
    });

    // ── Connection ──
    test('player disconnecting triggers disconnect', () => {
        const prev = makeState();
        const next = makeState({
            players: [makePlayer('p1', { isHost: true }), makePlayer('p2', { isConnected: false })],
        });
        expect(detectSounds(prev, next, 'p1')).toContain('disconnect');
    });

    test('player reconnecting triggers reconnect', () => {
        const prev = makeState({
            players: [makePlayer('p1', { isHost: true }), makePlayer('p2', { isConnected: false })],
        });
        const next = makeState();
        expect(detectSounds(prev, next, 'p1')).toContain('reconnect');
    });

    // ── Lobby ──
    test('player joining lobby triggers joinRoom', () => {
        const prev = makeState({ status: 'lobby', players: [makePlayer('p1', { isHost: true })] });
        const next = makeState({ status: 'lobby', players: [makePlayer('p1', { isHost: true }), makePlayer('p2')] });
        expect(detectSounds(prev, next, 'p1')).toContain('joinRoom');
    });

    test('player leaving lobby triggers leaveRoom', () => {
        const prev = makeState({ status: 'lobby', players: [makePlayer('p1', { isHost: true }), makePlayer('p2')] });
        const next = makeState({ status: 'lobby', players: [makePlayer('p1', { isHost: true })] });
        expect(detectSounds(prev, next, 'p1')).toContain('leaveRoom');
    });

    // ── No false positives ──
    test('identical states trigger no sounds', () => {
        const state = makeState();
        expect(detectSounds(state, state, 'p1')).toEqual([]);
    });

    test('multiple events in one state diff all fire', () => {
        const prev = makeState({ lastDiceRoll: null, longestRoadPlayerId: null });
        const next = makeState({
            lastDiceRoll: [6, 1],
            longestRoadPlayerId: 'p1',
            edges: [
                { id: 1, vertexIds: [1, 2], road: { playerId: 'p1' } },
                { id: 2, vertexIds: [2, 3], road: null },
            ],
        });
        const sounds = detectSounds(prev, next, 'p1');
        expect(sounds).toContain('diceRoll');
        expect(sounds).toContain('roadPlace');
        expect(sounds).toContain('achievement');
    });
});
