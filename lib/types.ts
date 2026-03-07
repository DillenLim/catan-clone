export type ResourceType = "wood" | "brick" | "wool" | "wheat" | "ore";
export type ResourceBundle = Partial<Record<ResourceType, number>>;
export type HexType = "forest" | "field" | "mountain" | "pasture" | "hill" | "desert";
export type DevCardType = "knight" | "road_building" | "year_of_plenty" | "monopoly" | "victory_point";

export type TurnPhase =
  | "initial_settlement"
  | "initial_road"
  | "roll"
  | "action"
  | "discard"
  | "move_robber"
  | "steal";

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
  newDevCardThisTurn: boolean;
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
  offer: ResourceBundle;
  request: ResourceBundle;
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
}

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
  longestRoadPlayerId: string | null;
  longestRoadLength: number;
  largestArmyPlayerId: string | null;
  largestArmyCount: number;
  lastDiceRoll: [number, number] | null;
  lastDistribution: { hexId: number; playerId: string; resource: ResourceType; amount: number }[] | null;
  pendingDiscarders: string[];
  pendingTradeOffer: TradeOffer | null;
  log: GameLogEntry[];
  winnerId: string | null;
  settings: GameSettings;
}

// Client -> Server Messages
export type GameAction =
  | { type: "ROLL_DICE"; forcedRoll?: [number, number] }
  | { type: "MOVE_ROBBER"; hexId: number; stealFromPlayerId?: string }
  | { type: "DISCARD_CARDS"; cards: ResourceBundle }
  | { type: "BUILD_ROAD"; edgeId: number }
  | { type: "BUILD_SETTLEMENT"; vertexId: number }
  | { type: "BUILD_CITY"; vertexId: number }
  | { type: "BUY_DEV_CARD" }
  | { type: "PLAY_KNIGHT"; hexId: number; stealFromPlayerId?: string }
  | { type: "PLAY_ROAD_BUILDING"; edgeId1: number; edgeId2?: number }
  | { type: "PLAY_YEAR_OF_PLENTY"; resources: Partial<Record<ResourceType, number>> }
  | { type: "PLAY_MONOPOLY"; resource: ResourceType }
  | { type: "BANK_TRADE"; offer: ResourceBundle; request: ResourceBundle }
  | { type: "OFFER_TRADE"; offer: ResourceBundle; request: ResourceBundle }
  | { type: "ACCEPT_TRADE"; offerId: string }
  | { type: "CANCEL_TRADE" }
  | { type: "END_TURN" }
  | { type: "PLACE_INITIAL_SETTLEMENT"; vertexId: number }
  | { type: "PLACE_INITIAL_ROAD"; edgeId: number }
  | { type: "DEBUG_ADD_RESOURCES"; resources: ResourceBundle };

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
