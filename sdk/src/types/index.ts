import { PublicKey } from "@solana/web3.js";

/** All 17 monster types */
export enum MonsterType {
  Normal = 0,
  Fire = 1,
  Water = 2,
  Electric = 3,
  Grass = 4,
  Ice = 5,
  Fighting = 6,
  Poison = 7,
  Ground = 8,
  Flying = 9,
  Psychic = 10,
  Bug = 11,
  Rock = 12,
  Ghost = 13,
  Dragon = 14,
  Dark = 15,
  Steel = 16,
}

/** Base stats for a monster species */
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Individual Values (IVs) */
export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Effort Values (EVs) */
export interface EVs {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Computed stats at a given level */
export interface ComputedStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Move category */
export enum MoveCategory {
  Physical = "Physical",
  Special = "Special",
  Status = "Status",
}

/** A move definition */
export interface Move {
  id: number;
  name: string;
  type: MonsterType;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  priority: number;
  description: string;
}

/** A move slot on a monster (tracks current PP) */
export interface MoveSlot {
  move: Move;
  currentPp: number;
}

/** Status conditions */
export enum StatusCondition {
  None = "None",
  Burn = "Burn",
  Freeze = "Freeze",
  Paralysis = "Paralysis",
  Poison = "Poison",
  BadPoison = "BadPoison",
  Sleep = "Sleep",
}

/** Rarity tier */
export enum RarityTier {
  Common = "Common",
  Uncommon = "Uncommon",
  Rare = "Rare",
  Legendary = "Legendary",
}

/** Monster species definition */
export interface MonsterSpecies {
  id: number;
  name: string;
  types: [MonsterType] | [MonsterType, MonsterType];
  baseStats: BaseStats;
  catchRate: number;
  baseXpYield: number;
  rarity: RarityTier;
  evolvesFrom: number | null;
  evolvesTo: number | null;
  evolutionLevel: number | null;
  movePool: number[];
  learnset: Record<number, number[]>;
  description: string;
}

/** An individual monster instance owned by an agent */
export interface Monster {
  pubkey: PublicKey;
  owner: PublicKey;
  speciesId: number;
  nickname: string | null;
  level: number;
  xp: number;
  nature: string;
  ivs: IVs;
  evs: EVs;
  currentHp: number;
  maxHp: number;
  moves: MoveSlot[];
  status: StatusCondition;
  friendship: number;
  isShiny: boolean;
  caughtAt: number;
  battleCount: number;
  winCount: number;
}

/** Agent account on-chain data */
export interface Agent {
  pubkey: PublicKey;
  authority: PublicKey;
  name: string;
  party: PublicKey[];
  storage: PublicKey[];
  badges: boolean[];
  money: number;
  totalBattles: number;
  totalWins: number;
  totalCatches: number;
  totalTrades: number;
  registeredAt: number;
  lastActionSlot: number;
  strategyHash: number[];
  isActive: boolean;
}

/** Battle state */
export interface Battle {
  pubkey: PublicKey;
  challenger: PublicKey;
  defender: PublicKey;
  challengerMonster: PublicKey;
  defenderMonster: PublicKey;
  turn: number;
  challengerHp: number;
  defenderHp: number;
  status: BattleStatus;
  winner: PublicKey | null;
  seed: number[];
  startedAt: number;
  lastMoveSlot: number;
}

/** Battle status */
export enum BattleStatus {
  Pending = "Pending",
  Active = "Active",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

/** Trade listing */
export interface TradeListing {
  pubkey: PublicKey;
  owner: PublicKey;
  offeredMonster: PublicKey;
  wantedSpeciesId: number | null;
  wantedMinLevel: number;
  createdAt: number;
  isActive: boolean;
}

/** Gym definition */
export interface Gym {
  id: number;
  name: string;
  badgeIndex: number;
  leaderName: string;
  type: MonsterType;
  party: GymMonster[];
  requiredBadges: number;
}

/** Gym leader monster */
export interface GymMonster {
  speciesId: number;
  level: number;
  moves: number[];
  nature: string;
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  rank: number;
  agent: PublicKey;
  name: string;
  totalWins: number;
  totalCatches: number;
  badges: number;
  score: number;
}

/** Strategy configuration for an agent */
export interface StrategyConfig {
  catchFilter: CatchFilter;
  battlePreferences: BattlePreferences;
  healThreshold: number;
  autoGym: boolean;
  autoTrade: boolean;
  preferredTypes: MonsterType[];
  avoidTypes: MonsterType[];
  minCatchLevel: number;
  maxPartyLevel: number;
  tickSpeed: number;
}

/** Catch filter configuration */
export interface CatchFilter {
  minRarity: RarityTier;
  preferShiny: boolean;
  preferredSpecies: number[];
  minCatchRate: number;
  maxAttempts: number;
}

/** Battle preferences */
export interface BattlePreferences {
  aggressiveness: number;
  switchThreshold: number;
  useTypeAdvantage: boolean;
  fleeThreshold: number;
  targetWeakerOpponents: boolean;
}

/** Event emitted by the agent runner */
export interface AgentEvent {
  type: AgentEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/** Agent event types */
export enum AgentEventType {
  Tick = "Tick",
  BattleStarted = "BattleStarted",
  BattleEnded = "BattleEnded",
  MonsterCaught = "MonsterCaught",
  MonsterEvolved = "MonsterEvolved",
  GymChallenge = "GymChallenge",
  GymVictory = "GymVictory",
  GymDefeat = "GymDefeat",
  TradeCreated = "TradeCreated",
  TradeCompleted = "TradeCompleted",
  Healed = "Healed",
  LevelUp = "LevelUp",
  Error = "Error",
}

/** Wild encounter data */
export interface WildEncounter {
  speciesId: number;
  level: number;
  isShiny: boolean;
  nature: string;
  ivs: IVs;
}

/** Battle action choices */
export enum BattleAction {
  Attack = "Attack",
  Switch = "Switch",
  UseItem = "UseItem",
  Flee = "Flee",
}

/** Battle move selection */
export interface BattleMoveSelection {
  action: BattleAction;
  moveIndex?: number;
  switchIndex?: number;
}

/** Damage calculation result */
export interface DamageResult {
  damage: number;
  effectiveness: number;
  isCritical: boolean;
  isStab: boolean;
}

/** Agent registration parameters */
export interface RegisterAgentParams {
  name: string;
  starterSpeciesId: number;
}

/** Agent runner state */
export enum RunnerState {
  Idle = "Idle",
  Running = "Running",
  Paused = "Paused",
  Stopped = "Stopped",
  Error = "Error",
}

/** Agent runner statistics */
export interface RunnerStats {
  ticksProcessed: number;
  battlesInitiated: number;
  monstersCaught: number;
  gymsAttempted: number;
  tradesCreated: number;
  errors: number;
  startedAt: number;
  uptimeMs: number;
}