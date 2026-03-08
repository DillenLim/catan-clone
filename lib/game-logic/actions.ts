import { GameState, GameAction, ResourceBundle, ResourceType, ResourceInput } from "../types";
import { isValidPhase, isPlayerTurn, isValidSettlementPlacement, isValidRoadPlacement, isValidCityPlacement, canAfford, isValidRobberPlacement } from "./validation";
import { distributeResources, getHarborRates } from "./resources";
import { updateLongestRoad, updateLargestArmy } from "./roads";
import { checkWinCondition } from "./victory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult = { valid: true; newState: GameState } | { valid: false; error: string };

/** Remove a dev card from a player's hand and adjust the devCardsBoughtThisTurn index array. */
function removeDevCard(player: GameState["players"][0], cardIndex: number): void {
    player.devCards.splice(cardIndex, 1);
    player.devCardsBoughtThisTurn = player.devCardsBoughtThisTurn
        .filter(i => i !== cardIndex)
        .map(i => i > cardIndex ? i - 1 : i);
}

/** Find the first playable dev card of a given type (not bought this turn). */
function findPlayableDevCard(player: GameState["players"][0], cardType: string): number {
    return player.devCards.findIndex((c, i) => c === cardType && !player.devCardsBoughtThisTurn.includes(i));
}

/** Format a resource bundle for log display: "[2 wood] [1 ore]" */
function formatResources(bundle: ResourceInput): string {
    return Object.entries(bundle).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

function handleRollDice(newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const roll = die1 + die2;
    newState.lastDiceRoll = [die1, die2];

    newState.log.push({ timestamp: Date.now(), text: `rolled a ${roll}`, playerId });

    if (roll === 7) {
        const discarders = newState.players.filter(p => {
            const total = Object.values(p.resources).reduce((sum, val) => sum + val, 0);
            return total > 7;
        }).map(p => p.id);

        if (discarders.length > 0) {
            newState.phase = "discard";
            newState.pendingDiscarders = discarders;
        } else {
            newState.phase = "move_robber";
        }
    } else {
        distributeResources(roll, newState);
        newState.phase = "action";
    }
    return { valid: true, newState };
}

function handleDiscardCards(action: Extract<GameAction, { type: "DISCARD_CARDS" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!newState.pendingDiscarders.includes(playerId)) {
        return { valid: false, error: "You don't need to discard." };
    }

    const totalCost = Object.values(action.cards).reduce((a, b) => a + (b || 0), 0);
    const totalHand = Object.values(newPlayer.resources).reduce((sum, val) => sum + val, 0);
    const requiredToDiscard = Math.floor(totalHand / 2);

    if (totalCost !== requiredToDiscard) {
        return { valid: false, error: `Must discard exactly ${requiredToDiscard} cards.` };
    }
    if (!canAfford(action.cards, newPlayer)) {
        return { valid: false, error: "Don't have these resources." };
    }

    for (const [res, amt] of Object.entries(action.cards)) {
        if (amt && amt > 0) {
            newPlayer.resources[res as ResourceType] -= amt;
            newState.bank[res as ResourceType] += amt;
        }
    }

    newState.pendingDiscarders = newState.pendingDiscarders.filter(id => id !== playerId);
    newState.log.push({ timestamp: Date.now(), text: `discarded ${requiredToDiscard} cards`, playerId });

    if (newState.pendingDiscarders.length === 0) {
        newState.phase = "move_robber";
    }
    return { valid: true, newState };
}

function handleMoveRobber(action: Extract<GameAction, { type: "MOVE_ROBBER" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!isValidRobberPlacement(action.hexId, newState)) {
        return { valid: false, error: "Invalid hex for robber." };
    }

    const prevHex = newState.hexes.find(h => h.hasRobber);
    if (prevHex) prevHex.hasRobber = false;
    newState.hexes.find(h => h.id === action.hexId)!.hasRobber = true;

    // Mandatory steal when targets exist
    const adjVertices = newState.vertices.filter(v => v.adjacentHexIds.includes(action.hexId) && v.building && v.building.playerId !== playerId);
    if (adjVertices.length > 0) {
        if (!action.stealFromPlayerId || !adjVertices.some(v => v.building?.playerId === action.stealFromPlayerId)) {
            return { valid: false, error: "Must specify a valid player to steal from." };
        }
        stealRandomResource(newState, playerId, action.stealFromPlayerId, newPlayer);
    }

    newState.phase = "action";
    return { valid: true, newState };
}

function stealRandomResource(state: GameState, thiefId: string, victimId: string, thief: GameState["players"][0]): void {
    const victim = state.players.find(p => p.id === victimId)!;
    const available = Object.entries(victim.resources).flatMap(([res, amt]) =>
        Array(amt).fill(res)
    ) as ResourceType[];
    if (available.length > 0) {
        const stolen = available[Math.floor(Math.random() * available.length)];
        victim.resources[stolen] -= 1;
        thief.resources[stolen] += 1;
        state.log.push({ timestamp: Date.now(), text: "stole a card", playerId: thiefId });
    }
}

function handleBuildRoad(action: Extract<GameAction, { type: "BUILD_ROAD" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newPlayer.roadsBuilt >= 15) return { valid: false, error: "Max roads built." };
    if (!isValidRoadPlacement(action.edgeId, newState, playerId)) return { valid: false, error: "Invalid road placement." };

    if (newState.freeRoadsRemaining > 0) {
        newState.freeRoadsRemaining -= 1;
    } else {
        if (!canAfford({ wood: 1, brick: 1 }, newPlayer)) return { valid: false, error: "Cannot afford road." };
        newPlayer.resources.wood -= 1;
        newPlayer.resources.brick -= 1;
        newState.bank.wood += 1;
        newState.bank.brick += 1;
    }

    newState.edges.find(e => e.id === action.edgeId)!.road = { playerId };
    newPlayer.roadsBuilt += 1;
    newState.log.push({ timestamp: Date.now(), text: "built a [road]", playerId });
    updateLongestRoad(newState);
    return { valid: true, newState };
}

function handleBuildSettlement(action: Extract<GameAction, { type: "BUILD_SETTLEMENT" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!canAfford({ wood: 1, brick: 1, wool: 1, wheat: 1 }, newPlayer)) return { valid: false, error: "Cannot afford settlement." };
    if (newPlayer.settlementsBuilt >= 5) return { valid: false, error: "Max settlements built." };
    if (!isValidSettlementPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Invalid placement." };

    newPlayer.resources.wood -= 1;
    newPlayer.resources.brick -= 1;
    newPlayer.resources.wool -= 1;
    newPlayer.resources.wheat -= 1;
    newState.bank.wood += 1;
    newState.bank.brick += 1;
    newState.bank.wool += 1;
    newState.bank.wheat += 1;

    newState.vertices.find(v => v.id === action.vertexId)!.building = { type: "settlement", playerId };
    newPlayer.settlementsBuilt += 1;
    newState.log.push({ timestamp: Date.now(), text: "built a [settlement]", playerId });
    updateLongestRoad(newState); // Opponent settlement can break road
    return { valid: true, newState };
}

function handleBuildCity(action: Extract<GameAction, { type: "BUILD_CITY" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!canAfford({ wheat: 2, ore: 3 }, newPlayer)) return { valid: false, error: "Cannot afford city." };
    if (newPlayer.citiesBuilt >= 4) return { valid: false, error: "Max cities built." };
    if (!isValidCityPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Must upgrade own settlement." };

    newPlayer.resources.wheat -= 2;
    newPlayer.resources.ore -= 3;
    newState.bank.wheat += 2;
    newState.bank.ore += 3;

    newState.vertices.find(v => v.id === action.vertexId)!.building = { type: "city", playerId };
    newPlayer.settlementsBuilt -= 1;
    newPlayer.citiesBuilt += 1;
    newState.log.push({ timestamp: Date.now(), text: "built a [city]", playerId });
    return { valid: true, newState };
}

function handleBankTrade(action: Extract<GameAction, { type: "BANK_TRADE" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!canAfford(action.offer, newPlayer)) return { valid: false, error: "Cannot afford offer." };

    let totalEffectiveOffers = 0;
    const rates = getHarborRates(playerId, newState.vertices);

    for (const [res, amt] of Object.entries(action.offer)) {
        if (!amt || amt <= 0) continue;
        const rate = rates[res as ResourceType] || 4;
        if (amt % rate !== 0) {
            return { valid: false, error: `Offered amount for ${res} must be a multiple of ${rate}.` };
        }
        totalEffectiveOffers += (amt / rate);
    }

    let totalRequestedAmt = 0;
    for (const [, amt] of Object.entries(action.request)) {
        if (!amt || amt <= 0) continue;
        totalRequestedAmt += amt;
    }

    if (totalRequestedAmt === 0 || totalEffectiveOffers !== totalRequestedAmt) {
        return { valid: false, error: `Invalid exchange match (Give: ${totalEffectiveOffers}, Get: ${totalRequestedAmt}).` };
    }

    // Check bank has enough
    for (const [res, amt] of Object.entries(action.request)) {
        if (!amt || amt <= 0) continue;
        if (newState.bank[res as ResourceType] < amt) {
            return { valid: false, error: `Bank does not have enough ${res}.` };
        }
    }

    // Apply
    for (const [res, amt] of Object.entries(action.offer)) {
        if (!amt || amt <= 0) continue;
        newPlayer.resources[res as ResourceType] -= amt;
        newState.bank[res as ResourceType] += amt;
    }
    for (const [res, amt] of Object.entries(action.request)) {
        if (!amt || amt <= 0) continue;
        newPlayer.resources[res as ResourceType] += amt;
        newState.bank[res as ResourceType] -= amt;
    }

    newState.log.push({ timestamp: Date.now(), text: `traded ${formatResources(action.offer)} for ${formatResources(action.request)} with bank`, playerId });
    return { valid: true, newState };
}

function handleEndTurn(newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    newPlayer.devCardPlayedThisTurn = false;
    newPlayer.devCardsBoughtThisTurn = [];
    newState.freeRoadsRemaining = 0;

    const winner = checkWinCondition(newState);
    if (winner) {
        newState.status = "finished";
        newState.winnerId = winner;
        newState.log.push({ timestamp: Date.now(), text: `won the game!`, playerId: winner });
    } else {
        const pIdx = newState.turnOrder.indexOf(playerId);
        newState.currentPlayerId = newState.turnOrder[(pIdx + 1) % newState.turnOrder.length];
        newState.phase = "roll";
        const nextName = newState.players.find(p => p.id === newState.currentPlayerId)?.name;
        newState.log.push({ timestamp: Date.now(), text: `turn ended. It's now ${nextName}'s turn.`, playerId });
    }
    return { valid: true, newState };
}

function handlePlaceInitialSettlement(action: Extract<GameAction, { type: "PLACE_INITIAL_SETTLEMENT" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!isValidSettlementPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Invalid start placement." };

    const vertex = newState.vertices.find(v => v.id === action.vertexId)!;
    vertex.building = { type: "settlement", playerId };
    newPlayer.settlementsBuilt += 1;

    if (newState.initialPlacementRound === 2) {
        const hexes = newState.hexes.filter(h => vertex.adjacentHexIds.includes(h.id) && h.type !== "desert");
        for (const hex of hexes) {
            const resType: ResourceType = hex.type === "forest" ? "wood" : hex.type === "field" ? "wheat" : hex.type === "mountain" ? "ore" : hex.type === "pasture" ? "wool" : "brick";
            newPlayer.resources[resType] += 1;
            newState.bank[resType] -= 1;
        }
    }

    newState.phase = "initial_road";
    newState.log.push({ timestamp: Date.now(), text: "placed starting settlement", playerId });
    return { valid: true, newState };
}

function handlePlaceInitialRoad(action: Extract<GameAction, { type: "PLACE_INITIAL_ROAD" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (!isValidRoadPlacement(action.edgeId, newState, playerId)) return { valid: false, error: "Invalid road placement." };

    newState.edges.find(e => e.id === action.edgeId)!.road = { playerId };
    newPlayer.roadsBuilt += 1;

    if (newState.initialPlacementRound === 1) {
        newState.initialPlacementIndex += 1;
        if (newState.initialPlacementIndex >= newState.turnOrder.length) {
            newState.initialPlacementRound = 2;
            newState.initialPlacementIndex = newState.turnOrder.length - 1;
        }
    } else {
        newState.initialPlacementIndex -= 1;
        if (newState.initialPlacementIndex < 0) {
            newState.status = "playing";
            newState.currentPlayerId = newState.turnOrder[0];
            newState.phase = "roll";
            return { valid: true, newState };
        }
    }

    newState.currentPlayerId = newState.turnOrder[newState.initialPlacementIndex];
    newState.phase = "initial_settlement";
    newState.log.push({ timestamp: Date.now(), text: "placed starting road", playerId });
    return { valid: true, newState };
}

function handlePlayKnight(action: Extract<GameAction, { type: "PLAY_KNIGHT" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newPlayer.devCardPlayedThisTurn) return { valid: false, error: "Already played a dev card this turn." };

    const knightIdx = findPlayableDevCard(newPlayer, "knight");
    if (knightIdx === -1) return { valid: false, error: "No playable knight card (cards bought this turn cannot be played)." };

    if (!isValidRobberPlacement(action.hexId, newState)) {
        return { valid: false, error: "Invalid hex for robber." };
    }

    // Enforce mandatory steal when targets exist
    const adjVertices = newState.vertices.filter(v => v.adjacentHexIds.includes(action.hexId) && v.building && v.building.playerId !== playerId);
    if (adjVertices.length > 0) {
        if (!action.stealFromPlayerId || !adjVertices.some(v => v.building?.playerId === action.stealFromPlayerId)) {
            return { valid: false, error: "Must specify a valid player to steal from." };
        }
    }

    // Mutate
    removeDevCard(newPlayer, knightIdx);
    newPlayer.knightsPlayed += 1;
    newPlayer.devCardPlayedThisTurn = true;

    // Move robber
    const prevHex = newState.hexes.find(h => h.hasRobber);
    if (prevHex) prevHex.hasRobber = false;
    newState.hexes.find(h => h.id === action.hexId)!.hasRobber = true;

    if (action.stealFromPlayerId) {
        stealRandomResource(newState, playerId, action.stealFromPlayerId, newPlayer);
        newState.log.push({ timestamp: Date.now(), text: "played a Knight and stole a card", playerId });
    } else {
        newState.log.push({ timestamp: Date.now(), text: "played a [knight]", playerId });
    }

    if (newState.phase === "roll") {
        newState.phase = "action";
    }

    updateLargestArmy(newState);
    return { valid: true, newState };
}

function handlePlayMonopoly(action: Extract<GameAction, { type: "PLAY_MONOPOLY" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newPlayer.devCardPlayedThisTurn) return { valid: false, error: "Already played a dev card this turn." };

    const idx = findPlayableDevCard(newPlayer, "monopoly");
    if (idx === -1) return { valid: false, error: "No playable monopoly card." };
    removeDevCard(newPlayer, idx);
    newPlayer.devCardPlayedThisTurn = true;

    let stolen = 0;
    for (const p of newState.players) {
        if (p.id === playerId) continue;
        const amt = p.resources[action.resource];
        if (amt > 0) {
            p.resources[action.resource] = 0;
            newPlayer.resources[action.resource] += amt;
            stolen += amt;
        }
    }

    newState.log.push({ timestamp: Date.now(), text: `played [monopoly] and stole [${stolen} ${action.resource}]`, playerId });
    return { valid: true, newState };
}

function handlePlayYearOfPlenty(action: Extract<GameAction, { type: "PLAY_YEAR_OF_PLENTY" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newPlayer.devCardPlayedThisTurn) return { valid: false, error: "Already played a dev card this turn." };

    const yopIdx = findPlayableDevCard(newPlayer, "year_of_plenty");
    if (yopIdx === -1) return { valid: false, error: "No playable Year of Plenty card." };

    let totalRequested = 0;
    for (const [, amt] of Object.entries(action.resources)) {
        if (!amt || amt <= 0) continue;
        totalRequested += amt;
    }
    if (totalRequested !== 2) return { valid: false, error: "Must take exactly 2 resources." };

    // Check bank availability
    for (const [res, amt] of Object.entries(action.resources)) {
        if (!amt || amt <= 0) continue;
        if (newState.bank[res as ResourceType] < amt) {
            return { valid: false, error: `Bank does not have enough ${res}.` };
        }
    }

    removeDevCard(newPlayer, yopIdx);
    newPlayer.devCardPlayedThisTurn = true;

    for (const [res, amt] of Object.entries(action.resources)) {
        if (!amt || amt <= 0) continue;
        newPlayer.resources[res as ResourceType] += amt;
        newState.bank[res as ResourceType] -= amt;
    }

    newState.log.push({ timestamp: Date.now(), text: `played [year_of_plenty] and took ${formatResources(action.resources)}`, playerId });
    return { valid: true, newState };
}

function handlePlayRoadBuilding(newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newPlayer.devCardPlayedThisTurn) return { valid: false, error: "Already played a dev card this turn." };

    const rbIdx = findPlayableDevCard(newPlayer, "road_building");
    if (rbIdx === -1) return { valid: false, error: "No playable Road Building card." };
    removeDevCard(newPlayer, rbIdx);
    newPlayer.devCardPlayedThisTurn = true;
    newState.freeRoadsRemaining = 2;
    newState.log.push({ timestamp: Date.now(), text: "played [road_building]", playerId });
    return { valid: true, newState };
}

function handleOfferTrade(action: Extract<GameAction, { type: "OFFER_TRADE" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (newState.settings.maritimeOnly) return { valid: false, error: "Player trading is disabled (maritime only)." };

    const hasOffer = Object.entries(action.offer).some(([, v]) => (v || 0) > 0);
    const hasRequest = Object.entries(action.request).some(([, v]) => (v || 0) > 0);
    if (!hasOffer || !hasRequest) return { valid: false, error: "Must specify at least one resource to give and receive." };
    if (!canAfford(action.offer, newPlayer)) return { valid: false, error: "Cannot afford to offer these resources." };

    newState.pendingTradeOffer = {
        id: `trade_${Date.now()}`,
        fromPlayerId: playerId,
        offer: action.offer,
        request: action.request,
    };
    newState.log.push({ timestamp: Date.now(), text: "proposed a trade", playerId });
    return { valid: true, newState };
}

function handleAcceptTrade(action: Extract<GameAction, { type: "ACCEPT_TRADE" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    const pending = newState.pendingTradeOffer;
    if (!pending) return { valid: false, error: "No trade offer pending." };
    if (pending.id !== action.offerId) return { valid: false, error: "Trade offer mismatch." };
    if (pending.fromPlayerId === playerId) return { valid: false, error: "Cannot accept your own trade offer." };

    const offeror = newState.players.find(p => p.id === pending.fromPlayerId);
    if (!offeror) return { valid: false, error: "Offeror not found." };
    if (!canAfford(pending.request, newPlayer)) return { valid: false, error: "You do not have the requested resources." };
    if (!canAfford(pending.offer, offeror)) return { valid: false, error: "Offeror no longer has the offered resources." };

    for (const [res, amt] of Object.entries(pending.offer)) {
        if (!amt || amt <= 0) continue;
        offeror.resources[res as ResourceType] -= amt;
        newPlayer.resources[res as ResourceType] += amt;
    }
    for (const [res, amt] of Object.entries(pending.request)) {
        if (!amt || amt <= 0) continue;
        newPlayer.resources[res as ResourceType] -= amt;
        offeror.resources[res as ResourceType] += amt;
    }

    newState.pendingTradeOffer = null;
    newState.log.push({ timestamp: Date.now(), text: `traded ${formatResources(pending.request)} for ${formatResources(pending.offer)} with ${offeror.name}`, playerId });
    return { valid: true, newState };
}

function handleRejectTrade(action: Extract<GameAction, { type: "REJECT_TRADE" }>, newState: GameState, playerId: string): ActionResult {
    const pendingTrade = newState.pendingTradeOffer;
    if (!pendingTrade) return { valid: false, error: "No trade offer pending." };
    if (pendingTrade.id !== action.offerId) return { valid: false, error: "Trade offer mismatch." };
    if (pendingTrade.fromPlayerId === playerId) return { valid: false, error: "Cannot reject your own trade offer." };

    newState.pendingTradeOffer = null;
    newState.log.push({ timestamp: Date.now(), text: `rejected the trade offer`, playerId });
    return { valid: true, newState };
}

function handleCancelTrade(newState: GameState, playerId: string): ActionResult {
    if (!newState.pendingTradeOffer || newState.pendingTradeOffer.fromPlayerId !== playerId) {
        return { valid: false, error: "Only the offerer can cancel their trade." };
    }
    newState.pendingTradeOffer = null;
    newState.log.push({ timestamp: Date.now(), text: "cancelled their trade offer", playerId });
    return { valid: true, newState };
}

function handleDebugAddResources(action: Extract<GameAction, { type: "DEBUG_ADD_RESOURCES" }>, newState: GameState, newPlayer: GameState["players"][0], playerId: string): ActionResult {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        return { valid: false, error: "Debug commands disabled in production." };
    }
    for (const [res, amt] of Object.entries(action.resources)) {
        if (amt && amt > 0) {
            newPlayer.resources[res as ResourceType] += amt;
            newState.bank[res as ResourceType] -= amt;
        }
    }
    newState.log.push({ timestamp: Date.now(), text: "used admin tools to add resources", playerId });
    return { valid: true, newState };
}

// ─── Main Dispatch ───────────────────────────────────────────────────────────

export function applyAction(
    action: GameAction,
    playerId: string,
    state: GameState
): ActionResult {

    if (state.status !== "playing" && state.status !== "initial_placement") {
        return { valid: false, error: "Game holds inactive status." };
    }

    // Certain actions don't require it to be your strict turn
    const requiresTurn = action.type !== "DISCARD_CARDS" && action.type !== "ACCEPT_TRADE" && action.type !== "REJECT_TRADE";
    if (requiresTurn && !isPlayerTurn(playerId, state)) {
        return { valid: false, error: "Not your turn." };
    }

    if (!isValidPhase(action, state.phase)) {
        return { valid: false, error: `Cannot perform ${action.type} during ${state.phase} phase.` };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) return { valid: false, error: "Player not found." };

    const newState = JSON.parse(JSON.stringify(state)) as GameState;
    const newPlayer = newState.players.find(p => p.id === playerId)!;

    // Clear distribution payload to prevent animation replay
    newState.lastDistribution = null;

    let result: ActionResult;
    switch (action.type) {
        case "ROLL_DICE": result = handleRollDice(newState, newPlayer, playerId); break;
        case "DISCARD_CARDS": result = handleDiscardCards(action, newState, newPlayer, playerId); break;
        case "MOVE_ROBBER": result = handleMoveRobber(action, newState, newPlayer, playerId); break;
        case "BUILD_ROAD": result = handleBuildRoad(action, newState, newPlayer, playerId); break;
        case "BUILD_SETTLEMENT": result = handleBuildSettlement(action, newState, newPlayer, playerId); break;
        case "BUILD_CITY": result = handleBuildCity(action, newState, newPlayer, playerId); break;
        case "BANK_TRADE": result = handleBankTrade(action, newState, newPlayer, playerId); break;
        case "END_TURN": result = handleEndTurn(newState, newPlayer, playerId); break;
        case "PLACE_INITIAL_SETTLEMENT": result = handlePlaceInitialSettlement(action, newState, newPlayer, playerId); break;
        case "PLACE_INITIAL_ROAD": result = handlePlaceInitialRoad(action, newState, newPlayer, playerId); break;
        case "PLAY_KNIGHT": result = handlePlayKnight(action, newState, newPlayer, playerId); break;
        case "PLAY_MONOPOLY": result = handlePlayMonopoly(action, newState, newPlayer, playerId); break;
        case "PLAY_YEAR_OF_PLENTY": result = handlePlayYearOfPlenty(action, newState, newPlayer, playerId); break;
        case "PLAY_ROAD_BUILDING": result = handlePlayRoadBuilding(newState, newPlayer, playerId); break;
        case "OFFER_TRADE": result = handleOfferTrade(action, newState, newPlayer, playerId); break;
        case "ACCEPT_TRADE": result = handleAcceptTrade(action, newState, newPlayer, playerId); break;
        case "REJECT_TRADE": result = handleRejectTrade(action, newState, playerId); break;
        case "CANCEL_TRADE": result = handleCancelTrade(newState, playerId); break;
        case "DEBUG_ADD_RESOURCES": result = handleDebugAddResources(action, newState, newPlayer, playerId); break;
        default: return { valid: false, error: "Action not recognized." };
    }

    if (!result.valid) return result;

    // Post-action win check
    const immediateWinner = checkWinCondition(newState);
    if (immediateWinner && newState.status === "playing") {
        newState.status = "finished";
        newState.winnerId = immediateWinner;
        newState.log.push({ timestamp: Date.now(), text: `won the game!`, playerId: immediateWinner });
    }

    // Cap log growth
    if (newState.log.length > 200) {
        newState.log = newState.log.slice(-200);
    }

    return { valid: true, newState };
}
