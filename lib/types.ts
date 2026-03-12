export type ResourceType = "wood" | "brick" | "wool" | "wheat" | "ore";
export const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "wool", "wheat", "ore"];
export type ResourceBundle = Record<ResourceType, number>;
export type ResourceInput = Partial<Record<ResourceType, number>>; // For action payloads where not all resources are specified
export type HexType = "forest" | "field" | "mountain" | "pasture" | "hill" | "desert";
export type DevCardType = "knight" | "road_building" | "year_of_plenty" | "monopoly" | "victory_point";

export type TurnPhase =
  | "initial_settlement"
  | "initial_road"
  | "roll"
  | "action"
  | "discard"
  | "move_robber"
  | "special_building";

export interface Hex {
  id: number;
  type: HexType;
  numberToken: number | null; // null for desert
  hasRobber: boolean;
  q: number; // axial coordinate
  r: number;
}

export interface Vertex {
  id: number;
  x: number;
  y: number;
  adjacentHexIds: number[];
  adjacentEdgeIds: number[];
  adjacentVertexIds: number[];
  building: null | { type: "settlement" | "city"; playerId: string };
  harbor: null | { type: ResourceType | "generic" };
}

export interface Edge {
  id: number;
  vertexIds: [number, number];
  road: null | { playerId: string };
}

export interface Player {
  id: string;
  name: string;
  color: string;
  resources: ResourceBundle;
  devCards: DevCardType[];
  devCardPlayedThisTurn: boolean;
  devCardsBoughtThisTurn: number[]; // indices into devCards of cards bought this turn (can't be played same turn)
  knightsPlayed: number;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  offer: ResourceInput;
  request: ResourceInput;
}

export interface GameLogEntry {
  timestamp: number;
  text: string;
  playerId?: string;
}

export interface GameSettings {
  boardLayout: "random" | "standard";
  victoryPoints: number;
  maritimeOnly: boolean;
  turnTimerSeconds: number | null;
  expansionMode: "base" | "5-6" | "7-8";
}

// Expansion configuration derived from settings
export function getExpansionConfig(mode: GameSettings["expansionMode"]) {
  switch (mode) {
    case "5-6":
      return {
        maxPlayers: 6,
        bankPerResource: 24,
        boardRadius: 3,
        hexCount: 30,
        terrainCounts: { forest: 6, field: 6, mountain: 5, pasture: 6, hill: 5, desert: 2 } as Record<HexType, number>,
        numberTokens: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
        harborTypes: ["generic", "generic", "generic", "generic", "generic", "generic", "wood", "brick", "wool", "wheat", "ore"] as (ResourceType | "generic")[],
        devCards: { knight: 20, victory_point: 5, road_building: 3, year_of_plenty: 3, monopoly: 3 },
        specialBuildPhase: true,
      };
    case "7-8":
      return {
        maxPlayers: 8,
        bankPerResource: 29,
        boardRadius: 3,
        hexCount: 37,
        terrainCounts: { forest: 7, field: 7, mountain: 7, pasture: 7, hill: 7, desert: 2 } as Record<HexType, number>,
        numberTokens: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 2, 3, 4, 5, 6, 8, 9, 10],
        harborTypes: ["generic", "generic", "generic", "generic", "generic", "generic", "generic", "generic", "wood", "brick", "wool", "wheat", "ore"] as (ResourceType | "generic")[],
        devCards: { knight: 26, victory_point: 5, road_building: 4, year_of_plenty: 4, monopoly: 4 },
        specialBuildPhase: true,
      };
    default:
      return {
        maxPlayers: 4,
        bankPerResource: 19,
        boardRadius: 2,
        hexCount: 19,
        terrainCounts: { forest: 4, field: 4, mountain: 3, pasture: 4, hill: 3, desert: 1 } as Record<HexType, number>,
        numberTokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
        harborTypes: ["generic", "generic", "generic", "generic", "wood", "brick", "wool", "wheat", "ore"] as (ResourceType | "generic")[],
        devCards: { knight: 14, victory_point: 5, road_building: 2, year_of_plenty: 2, monopoly: 2 },
        specialBuildPhase: false,
      };
  }
}

export const PLAYER_COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "White", hex: "#e2e8f0" },
  { name: "Orange", hex: "#f97316" },
  { name: "Green", hex: "#22c55e" },
  { name: "Brown", hex: "#a16207" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Teal", hex: "#14b8a6" },
];

export interface GameState {
  roomCode: string;
  status: "lobby" | "initial_placement" | "playing" | "finished";
  players: Player[];
  turnOrder: string[];
  currentPlayerId: string;
  phase: TurnPhase;
  initialPlacementRound: 1 | 2;
  initialPlacementIndex: number;
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  bank: ResourceBundle;
  devCardDeckCount: number;
  freeRoadsRemaining: number;
  longestRoadPlayerId: string | null;
  longestRoadLength: number;
  largestArmyPlayerId: string | null;
  largestArmyCount: number;
  lastDiceRoll: [number, number] | null;
  lastDistribution: { id: string; resources: { hexId: number; playerId: string; resource: ResourceType; amount: number }[] } | null;
  pendingDiscarders: string[];
  pendingTradeOffer: TradeOffer | null;
  log: GameLogEntry[];
  winnerId: string | null;
  settings: GameSettings;
  // Special Building Phase (5-6 / 7-8 player expansion)
  specialBuildPhaseActive: boolean;
  specialBuildOrder: string[];      // player IDs in clockwise order (excludes turn player)
  specialBuildIndex: number;        // which player in specialBuildOrder is currently building
}

// Client -> Server Messages
export type GameAction =
  | { type: "ROLL_DICE" }
  | { type: "MOVE_ROBBER"; hexId: number; stealFromPlayerId?: string }
  | { type: "DISCARD_CARDS"; cards: ResourceInput }
  | { type: "BUILD_ROAD"; edgeId: number }
  | { type: "BUILD_SETTLEMENT"; vertexId: number }
  | { type: "BUILD_CITY"; vertexId: number }
  | { type: "BUY_DEV_CARD" }
  | { type: "PLAY_KNIGHT"; hexId: number; stealFromPlayerId?: string }
  | { type: "PLAY_ROAD_BUILDING" }
  | { type: "PLAY_YEAR_OF_PLENTY"; resources: ResourceInput }
  | { type: "PLAY_MONOPOLY"; resource: ResourceType }
  | { type: "BANK_TRADE"; offer: ResourceInput; request: ResourceInput }
  | { type: "OFFER_TRADE"; offer: ResourceInput; request: ResourceInput }
  | { type: "ACCEPT_TRADE"; offerId: string }
  | { type: "REJECT_TRADE"; offerId: string }
  | { type: "CANCEL_TRADE" }
  | { type: "END_TURN" }
  | { type: "PASS_SPECIAL_BUILD" }
  | { type: "PLACE_INITIAL_SETTLEMENT"; vertexId: number }
  | { type: "PLACE_INITIAL_ROAD"; edgeId: number }
  | { type: "DEBUG_ADD_RESOURCES"; resources: ResourceInput };

export type ClientMessagePayload =
  | { type: "JOIN"; player: { name: string; color: string } }
  | { type: "ACTION"; payload: GameAction }
  | { type: "CHAT"; payload: { text: string } }
  | { type: "READY" }
  | { type: "START_GAME" }
  | { type: "SETTINGS_UPDATE"; settings: Partial<GameSettings> };

export type ClientMessage = ClientMessagePayload & { playerId: string };

// Server -> Client Messages
export type ServerMessage =
  | { type: "STATE_UPDATE"; payload: GameState }
  | { type: "ERROR"; message: string }
  | { type: "CHAT"; payload: { playerId: string; name: string; text: string; timestamp: number } };
