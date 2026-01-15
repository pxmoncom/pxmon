// Main entry point for @pxmon/sdk

// Client
export { PxmonClient, PxmonClientConfig } from "./client";

// Types
export {
  MonsterType,
  BaseStats,
  IVs,
  EVs,
  ComputedStats,
  MoveCategory,
  Move,
  MoveSlot,
  StatusCondition,
  RarityTier,
  MonsterSpecies,
  Monster,
  Agent,
  Battle,
  BattleStatus,
  TradeListing,
  Gym,
  GymMonster,
  LeaderboardEntry,
  StrategyConfig,
  CatchFilter,
  BattlePreferences,
  AgentEvent,
  AgentEventType,
  WildEncounter,
  BattleAction,
  BattleMoveSelection,
  DamageResult,
  RegisterAgentParams,
  RunnerState,
  RunnerStats,
} from "./types";

export {
  RegisterAgentArgs,
  CatchMonsterArgs,
  InitBattleArgs,
  SubmitBattleMoveArgs,
  SwitchMonsterArgs,
  GymChallengeArgs,
  CreateTradeArgs,
  ExecuteTradeArgs,
  CancelTradeArgs,
  HealMonsterArgs,
  EvolveMonsterArgs,
  SetNicknameArgs,
  ReorderPartyArgs,
  DepositMonsterArgs,
  WithdrawMonsterArgs,
  UpdateStrategyArgs,
  WildEncounterArgs,
  FleeBattleArgs,
  BallType,
  BALL_MULTIPLIERS,
  INSTRUCTION_DISCRIMINATORS,
  ACCOUNT_SIZES,
} from "./types/instructions";

// Agents
export { AgentRunner, AgentRunnerConfig } from "./agents/agent-runner";
export {
  StrategyEngine,
  AgentAction,
  createDefaultStrategy,
  createAggressiveStrategy,
  createCollectorStrategy,
  createGymRushStrategy,
} from "./agents/strategy";
export {
  BattleSimulator,
  SimMonster,
  SimMove,
  StatStages,
  TurnResult,
  SimulationResult,
  BattlePrediction,
} from "./agents/battle-simulator";

// Utils
export { DeterministicRng, hashToSeed } from "./utils/rng";
export {
  getTypeEffectiveness,
  getCombinedEffectiveness,
  isSuperEffective,
  isNotVeryEffective,
  isImmune,
  getSuperEffectiveTypes,
  getResistances,
  getImmunities,
  getBestAttackingType,
  getEffectivenessText,
  getFullTypeChart,
  getTypeName,
} from "./utils/type-chart";
export {
  SPECIES,
  MOVES,
  getSpecies,
  getSpeciesByRarity,
  getSpeciesByType,
  getEvolutionChain,
  canEvolve,
  getMove,
  getMovesAtLevel,
  getAllMovesUpToLevel,
  calculateStat,
  calculateAllStats,
  getStarterSpecies,
  getSpeciesCountByRarity,
} from "./utils/monster-data";
export {
  Logger,
  LogLevel,
  LogEntry,
  LoggerConfig,
  createSilentLogger,
  createColorOutput,
  createBufferedLogger,
} from "./utils/logger";

// Constants
export {
  PROGRAM_ID,
  SEEDS,
  MAX_LEVEL,
  MAX_MOVES,
  MAX_PARTY_SIZE,
  MAX_STORAGE,
  CATCH_RATE_BASE,
  XP_CURVE,
  xpForNextLevel,
  TYPE_COLORS,
  Rarity,
  BattleOutcome,
  GYM_BADGES,
  TICK_PRESETS,
  StatIndex,
  MAX_IV,
  MAX_EV_PER_STAT,
  MAX_TOTAL_EV,
  NATURES,
} from "./constants";