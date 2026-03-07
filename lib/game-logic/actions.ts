import { GameState, GameAction, ResourceBundle, ResourceType } from "../types";
import { isValidPhase, isPlayerTurn, isValidSettlementPlacement, isValidRoadPlacement, isValidCityPlacement, canAfford, isValidRobberPlacement } from "./validation";
import { distributeResources, getHarborRates } from "./resources";
import { updateLongestRoad, updateLargestArmy } from "./roads";
import { checkWinCondition } from "./victory";

export function applyAction(
    action: GameAction,
    playerId: string,
    state: GameState
): { valid: true; newState: GameState } | { valid: false; error: string } {

    if (state.status !== "playing" && state.status !== "initial_placement") {
        return { valid: false, error: "Game holds inactive status." };
    }

    // Certain actions don't require it to be your strict turn (e.g., discarding half cards, accepting trades)
    const requiresTurn = action.type !== "DISCARD_CARDS" && action.type !== "ACCEPT_TRADE";
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

    switch (action.type) {
        case "ROLL_DICE": {
            let die1, die2;
            if ("forcedRoll" in action && action.forcedRoll) {
                [die1, die2] = action.forcedRoll;
            } else {
                die1 = Math.floor(Math.random() * 6) + 1;
                die2 = Math.floor(Math.random() * 6) + 1;
            }
            const roll = die1 + die2;
            newState.lastDiceRoll = [die1, die2];

            newState.log.push({ timestamp: Date.now(), text: `rolled a ${roll}`, playerId });

            if (roll === 7) {
                // Find players with > 7 cards
                const discarders = newState.players.filter(p => {
                    const total = Object.values(p.resources).reduce((sum, val) => sum + (val || 0), 0);
                    return total > 7;
                }).map(p => p.id);

                if (discarders.length > 0) {
                    newState.phase = "discard";
                    newState.pendingDiscarders = discarders;
                } else {
                    newState.phase = "move_robber";
                }
            } else {
                const distributedState = distributeResources(roll, newState);
                distributedState.phase = "action";
                return { valid: true, newState: distributedState };
            }
            break;
        }

        case "DISCARD_CARDS": {
            if (!newState.pendingDiscarders.includes(playerId)) {
                return { valid: false, error: "You don't need to discard." };
            }

            const totalCost = Object.values(action.cards).reduce((a, b) => a + (b || 0), 0);
            const totalHand = Object.values(newPlayer.resources).reduce((sum, val) => sum + (val || 0), 0);
            const requiredToDiscard = Math.floor(totalHand / 2);

            if (totalCost !== requiredToDiscard) {
                return { valid: false, error: `Must discard exactly ${requiredToDiscard} cards.` };
            }
            if (!canAfford(action.cards, newPlayer)) {
                return { valid: false, error: "Don't have these resources." };
            }

            // Deduct
            for (const [res, amt] of Object.entries(action.cards)) {
                if (amt) {
                    newPlayer.resources[res as keyof ResourceBundle]! -= amt;
                    newState.bank[res as keyof ResourceBundle] = (newState.bank[res as keyof ResourceBundle] || 0) + amt;
                }
            }

            newState.pendingDiscarders = newState.pendingDiscarders.filter(id => id !== playerId);
            newState.log.push({ timestamp: Date.now(), text: `discarded ${requiredToDiscard} cards`, playerId });

            if (newState.pendingDiscarders.length === 0) {
                newState.phase = "move_robber";
            }
            break;
        }

        case "MOVE_ROBBER": {
            if (!isValidRobberPlacement(action.hexId, newState)) {
                return { valid: false, error: "Invalid hex for robber." };
            }

            const prevHex = newState.hexes.find(h => h.hasRobber);
            if (prevHex) prevHex.hasRobber = false;

            const targetHex = newState.hexes.find(h => h.id === action.hexId)!;
            targetHex.hasRobber = true;

            // Determine if steal is possible
            const adjVertices = newState.vertices.filter(v => v.adjacentHexIds.includes(action.hexId) && v.building && v.building.playerId !== playerId);
            if (adjVertices.length > 0) {
                if (!action.stealFromPlayerId || !adjVertices.some(v => v.building?.playerId === action.stealFromPlayerId)) {
                    return { valid: false, error: "Must specify a valid player to steal from." };
                }

                const victim = newState.players.find(p => p.id === action.stealFromPlayerId)!;
                const availableSteals = Object.entries(victim.resources).flatMap(([res, amt]) => Array(amt).fill(res)) as (keyof ResourceBundle)[];

                if (availableSteals.length > 0) {
                    const stolen = availableSteals[Math.floor(Math.random() * availableSteals.length)];
                    victim.resources[stolen]! -= 1;
                    newPlayer.resources[stolen] = (newPlayer.resources[stolen] || 0) + 1;
                    newState.log.push({ timestamp: Date.now(), text: `stole a card`, playerId });
                }
            }

            newState.phase = "action";
            break;
        }

        case "BUILD_ROAD": {
            const cost: ResourceBundle = { wood: 1, brick: 1 };
            if (!canAfford(cost, newPlayer)) return { valid: false, error: "Cannot afford road." };
            if (newPlayer.roadsBuilt >= 15) return { valid: false, error: "Max roads built." };
            if (!isValidRoadPlacement(action.edgeId, newState, playerId)) return { valid: false, error: "Invalid road placement." };

            newPlayer.resources.wood! -= 1;
            newPlayer.resources.brick! -= 1;
            newState.bank.wood! += 1;
            newState.bank.brick! += 1;

            const edge = newState.edges.find(e => e.id === action.edgeId)!;
            edge.road = { playerId };
            newPlayer.roadsBuilt += 1;

            newState.log.push({ timestamp: Date.now(), text: "built a [road]", playerId });
            updateLongestRoad(newState);
            break;
        }

        case "BUILD_SETTLEMENT": {
            const cost: ResourceBundle = { wood: 1, brick: 1, wool: 1, wheat: 1 };
            if (!canAfford(cost, newPlayer)) return { valid: false, error: "Cannot afford settlement." };
            if (newPlayer.settlementsBuilt >= 5) return { valid: false, error: "Max settlements built." };
            if (!isValidSettlementPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Invalid placement." };

            newPlayer.resources.wood! -= 1;
            newPlayer.resources.brick! -= 1;
            newPlayer.resources.wool! -= 1;
            newPlayer.resources.wheat! -= 1;
            newState.bank.wood! += 1;
            newState.bank.brick! += 1;
            newState.bank.wool! += 1;
            newState.bank.wheat! += 1;

            const vertex = newState.vertices.find(v => v.id === action.vertexId)!;
            vertex.building = { type: "settlement", playerId };
            newPlayer.settlementsBuilt += 1;

            newState.log.push({ timestamp: Date.now(), text: "built a [settlement]", playerId });
            updateLongestRoad(newState); // Opponent settlement can break your road
            break;
        }

        case "BUILD_CITY": {
            const cost: ResourceBundle = { wheat: 2, ore: 3 };
            if (!canAfford(cost, newPlayer)) return { valid: false, error: "Cannot afford city." };
            if (newPlayer.citiesBuilt >= 4) return { valid: false, error: "Max cities built." };
            if (!isValidCityPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Must upgrade own settlement." };

            newPlayer.resources.wheat! -= 2;
            newPlayer.resources.ore! -= 3;
            newState.bank.wheat! += 2;
            newState.bank.ore! += 3;

            const vertex = newState.vertices.find(v => v.id === action.vertexId)!;
            vertex.building = { type: "city", playerId };
            newPlayer.settlementsBuilt -= 1;
            newPlayer.citiesBuilt += 1;

            newState.log.push({ timestamp: Date.now(), text: "built a [city]", playerId });
            break;
        }

        case "BANK_TRADE": {
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
            for (const [res, amt] of Object.entries(action.request)) {
                if (!amt || amt <= 0) continue;
                totalRequestedAmt += amt;
            }

            if (totalRequestedAmt === 0 || totalEffectiveOffers !== totalRequestedAmt) {
                return { valid: false, error: `Invalid exchange match (Give equivalent: ${totalEffectiveOffers}, Get: ${totalRequestedAmt}).` };
            }

            // Apply trade deductions and grants
            for (const [res, amt] of Object.entries(action.offer)) {
                if (!amt || amt <= 0) continue;
                newPlayer.resources[res as keyof ResourceBundle]! -= amt;
                newState.bank[res as keyof ResourceBundle]! += amt;
            }

            for (const [res, amt] of Object.entries(action.request)) {
                if (!amt || amt <= 0) continue;
                newPlayer.resources[res as keyof ResourceBundle] = (newPlayer.resources[res as keyof ResourceBundle] || 0) + (amt as number);
                newState.bank[res as keyof ResourceBundle]! -= (amt as number);
            }

            const offerStr = Object.entries(action.offer).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
            const reqStr = Object.entries(action.request).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
            newState.log.push({ timestamp: Date.now(), text: `traded ${offerStr} for ${reqStr} with bank`, playerId });
            break;
        }

        case "END_TURN": {
            newPlayer.newDevCardThisTurn = false; // Reset lock

            // Check win exactly at the end of action phase
            const winner = checkWinCondition(newState);
            if (winner) {
                newState.status = "finished";
                newState.winnerId = winner;
                newState.log.push({ timestamp: Date.now(), text: `won the game!`, playerId: winner });
            } else {
                // Next player
                const pIdx = newState.turnOrder.indexOf(playerId);
                newState.currentPlayerId = newState.turnOrder[(pIdx + 1) % newState.turnOrder.length];
                newState.phase = "roll";
                newState.log.push({ timestamp: Date.now(), text: `turn ended. It's now ${newState.players.find(p => p.id === newState.currentPlayerId)?.name}'s turn.`, playerId });
            }
            break;
        }

        case "PLACE_INITIAL_SETTLEMENT": {
            if (!isValidSettlementPlacement(action.vertexId, newState, playerId)) return { valid: false, error: "Invalid start placement." };

            const vertex = newState.vertices.find(v => v.id === action.vertexId)!;
            vertex.building = { type: "settlement", playerId };
            newPlayer.settlementsBuilt += 1;

            if (newState.initialPlacementRound === 2) {
                // Round 2 collects adjacent hex resources immediately
                const hexes = newState.hexes.filter(h => vertex.adjacentHexIds.includes(h.id) && h.type !== "desert");
                for (const hex of hexes) {
                    const resType = hex.type === "forest" ? "wood" : hex.type === "field" ? "wheat" : hex.type === "mountain" ? "ore" : hex.type === "pasture" ? "wool" : "brick";
                    newPlayer.resources[resType] = (newPlayer.resources[resType] || 0) + 1;
                    newState.bank[resType]! -= 1;
                }
            }

            newState.phase = "initial_road";
            newState.log.push({ timestamp: Date.now(), text: "placed starting settlement", playerId });
            break;
        }

        case "PLACE_INITIAL_ROAD": {
            if (!isValidRoadPlacement(action.edgeId, newState, playerId)) return { valid: false, error: "Invalid road placement." };

            const edge = newState.edges.find(e => e.id === action.edgeId)!;
            edge.road = { playerId };
            newPlayer.roadsBuilt += 1;

            // Next player
            if (newState.initialPlacementRound === 1) {
                newState.initialPlacementIndex += 1;
                if (newState.initialPlacementIndex >= newState.turnOrder.length) {
                    // Move to round 2
                    newState.initialPlacementRound = 2;
                    newState.initialPlacementIndex = newState.turnOrder.length - 1;
                }
            } else {
                newState.initialPlacementIndex -= 1;
                if (newState.initialPlacementIndex < 0) {
                    // Initial placement done!
                    newState.status = "playing";
                    newState.currentPlayerId = newState.turnOrder[0];
                    newState.phase = "roll";
                    return { valid: true, newState };
                }
            }

            newState.currentPlayerId = newState.turnOrder[newState.initialPlacementIndex];
            newState.phase = "initial_settlement";
            newState.log.push({ timestamp: Date.now(), text: "placed starting road", playerId });
            break;
        }

        case "PLAY_KNIGHT": {
            // Remove knight from hand
            const knightIdx = newPlayer.devCards.indexOf("knight");
            if (knightIdx === -1) return { valid: false, error: "No knight card." };
            newPlayer.devCards.splice(knightIdx, 1);
            newPlayer.knightsPlayed += 1;

            // Move robber
            if (!isValidRobberPlacement(action.hexId, newState)) {
                return { valid: false, error: "Invalid hex for robber." };
            }
            const prevHex = newState.hexes.find(h => h.hasRobber);
            if (prevHex) prevHex.hasRobber = false;
            const targetHex = newState.hexes.find(h => h.id === action.hexId)!;
            targetHex.hasRobber = true;

            // Steal
            if (action.stealFromPlayerId) {
                const victim = newState.players.find(p => p.id === action.stealFromPlayerId)!;
                const available = Object.entries(victim.resources).flatMap(([res, amt]) =>
                    Array(amt || 0).fill(res)
                ) as (keyof ResourceBundle)[];
                if (available.length > 0) {
                    const stolen = available[Math.floor(Math.random() * available.length)];
                    victim.resources[stolen]! -= 1;
                    newPlayer.resources[stolen] = (newPlayer.resources[stolen] || 0) + 1;
                    newState.log.push({ timestamp: Date.now(), text: "played a Knight and stole a card", playerId });
                }
            } else {
                newState.log.push({ timestamp: Date.now(), text: "played a [knight]", playerId });
            }

            updateLargestArmy(newState);
            break;
        }

        case "PLAY_MONOPOLY": {
            const idx = newPlayer.devCards.indexOf("monopoly");
            if (idx === -1) return { valid: false, error: "No monopoly card." };
            newPlayer.devCards.splice(idx, 1);

            let stolen = 0;
            for (const p of newState.players) {
                if (p.id === playerId) continue;
                const amt = p.resources[action.resource] || 0;
                if (amt > 0) {
                    p.resources[action.resource] = 0;
                    newPlayer.resources[action.resource] = (newPlayer.resources[action.resource] || 0) + amt;
                    stolen += amt;
                }
            }

            newState.log.push({ timestamp: Date.now(), text: `played [monopoly] and stole [${stolen} ${action.resource}]`, playerId });
            break;
        }

        case "PLAY_YEAR_OF_PLENTY": {
            const idx = newPlayer.devCards.indexOf("year_of_plenty");
            if (idx === -1) return { valid: false, error: "No Year of Plenty card." };
            newPlayer.devCards.splice(idx, 1);

            let totalRequested = 0;
            for (const [res, amt] of Object.entries(action.resources)) {
                if (!amt || amt <= 0) continue;
                totalRequested += amt;
                newPlayer.resources[res as keyof ResourceBundle] = (newPlayer.resources[res as keyof ResourceBundle] || 0) + amt;
                newState.bank[res as keyof ResourceBundle] = Math.max(0, (newState.bank[res as keyof ResourceBundle] || 0) - amt);
            }

            if (totalRequested !== 2) return { valid: false, error: "Must take exactly 2 resources." };
            const resStrs = Object.entries(action.resources).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
            newState.log.push({ timestamp: Date.now(), text: `played [year_of_plenty] and took ${resStrs}`, playerId });
            break;
        }

        case "PLAY_ROAD_BUILDING": {
            // Road Building allows 2 free roads — we handle it as BUILD_ROAD called twice from the
            // client side (after this action sets the phase). In this simpler impl, the client
            // does free-roads via normal BUILD_ROAD but skip the affordability check.
            // We use a server-side flag approach: just remove the card and let normal road placement follow.
            const idx = newPlayer.devCards.indexOf("road_building");
            if (idx === -1) return { valid: false, error: "No Road Building card." };
            newPlayer.devCards.splice(idx, 1);
            newState.log.push({ timestamp: Date.now(), text: "played [road_building]", playerId });
            break;
        }

        case "PLACE_INITIAL_ROAD":
        case "PLACE_INITIAL_SETTLEMENT":
            // Handled by specialized logic above
            break;

        case "OFFER_TRADE": {
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
            break;
        }

        case "ACCEPT_TRADE": {
            const pending = newState.pendingTradeOffer;
            if (!pending) return { valid: false, error: "No trade offer pending." };
            if (pending.id !== action.offerId) return { valid: false, error: "Trade offer mismatch." };
            if (pending.fromPlayerId === playerId) return { valid: false, error: "Cannot accept your own trade offer." };

            const offeror = newState.players.find(p => p.id === pending.fromPlayerId);
            if (!offeror) return { valid: false, error: "Offeror not found." };

            // Check acceptor has what offeror requested
            if (!canAfford(pending.request, newPlayer)) return { valid: false, error: "You do not have the requested resources." };
            // Check offeror still has what they offered
            if (!canAfford(pending.offer, offeror)) return { valid: false, error: "Offeror no longer has the offered resources." };

            // Execute swap
            for (const [res, amt] of Object.entries(pending.offer)) {
                if (!amt || amt <= 0) continue;
                offeror.resources[res as keyof ResourceBundle]! -= amt;
                newPlayer.resources[res as keyof ResourceBundle] = (newPlayer.resources[res as keyof ResourceBundle] || 0) + amt;
            }
            for (const [res, amt] of Object.entries(pending.request)) {
                if (!amt || amt <= 0) continue;
                newPlayer.resources[res as keyof ResourceBundle]! -= amt;
                offeror.resources[res as keyof ResourceBundle] = (offeror.resources[res as keyof ResourceBundle] || 0) + amt;
            }

            const offerStr = Object.entries(pending.offer).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
            const reqStr = Object.entries(pending.request).filter(([_, amt]) => (amt || 0) > 0).map(([res, amt]) => `[${amt} ${res}]`).join(" ");
            newState.pendingTradeOffer = null;
            newState.log.push({ timestamp: Date.now(), text: `traded ${reqStr} for ${offerStr} with ${offeror.name}`, playerId });
            break;
        }

        case "CANCEL_TRADE": {
            newState.pendingTradeOffer = null;
            newState.log.push({ timestamp: Date.now(), text: "cancelled their trade offer", playerId });
            break;
        }

        case "DEBUG_ADD_RESOURCES": {
            for (const [res, amt] of Object.entries(action.resources)) {
                if (amt && amt > 0) {
                    const r = res as keyof ResourceBundle;
                    newPlayer.resources[r] = (newPlayer.resources[r] || 0) + amt;
                    if (newState.bank[r]) {
                        newState.bank[r]! -= amt;
                    }
                }
            }
            newState.log.push({ timestamp: Date.now(), text: "used admin tools to add resources", playerId });
            break;
        }

        default:
            return { valid: false, error: "Action not recognized." };
    }

    // Double check win condition just in case (like after building)
    const immediateWinner = checkWinCondition(newState);
    if (immediateWinner && newState.status === "playing") {
        newState.status = "finished";
        newState.winnerId = immediateWinner;
        newState.log.push({ timestamp: Date.now(), text: `won the game!`, playerId: immediateWinner });
    }

    return { valid: true, newState };
}
