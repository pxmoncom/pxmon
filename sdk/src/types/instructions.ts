import { PublicKey } from "@solana/web3.js";
import { MonsterType } from "./index";

/** Arguments for the register_agent instruction */
export interface RegisterAgentArgs {
  name: string;
  starterSpeciesId: number;
}

/** Arguments for the catch_monster instruction */
export interface CatchMonsterArgs {
  encounterSeed: number[];
  ballType: BallType;
}

/** Ball types available for catching */
export enum BallType {
  PxBall = 0,
  GreatBall = 1,
  UltraBall = 2,
  MasterBall = 3,
}

/** Ball catch rate multipliers */
export const BALL_MULTIPLIERS: Record<BallType, number> = {
  [BallType.PxBall]: 1.0,
  [BallType.GreatBall]: 1.5,
  [BallType.UltraBall]: 2.0,
  [BallType.MasterBall]: 255.0,
};

/** Arguments for the battle instruction */
export interface InitBattleArgs {
  defenderAgent: PublicKey;
  challengerMonsterIndex: number;
}

/** Arguments for submitting a battle move */
export interface SubmitBattleMoveArgs {
  battlePubkey: PublicKey;
  moveIndex: number;
}

/** Arguments for switching monster in battle */
export interface SwitchMonsterArgs {
  battlePubkey: PublicKey;
  newMonsterIndex: number;
}

/** Arguments for the gym_challenge instruction */
export interface GymChallengeArgs {
  gymId: number;
  monsterIndices: number[];
}

/** Arguments for the create_trade instruction */
export interface CreateTradeArgs {
  offeredMonsterIndex: number;
  wantedSpeciesId: number | null;
  wantedMinLevel: number;
}

/** Arguments for executing a trade */
export interface ExecuteTradeArgs {
  tradePubkey: PublicKey;
  offeredMonsterIndex: number;
}

/** Arguments for cancelling a trade */
export interface CancelTradeArgs {
  tradePubkey: PublicKey;
}

/** Arguments for healing a monster */
export interface HealMonsterArgs {
  monsterIndex: number;
}

/** Arguments for healing the entire party */
export interface HealPartyArgs {}

/** Arguments for teaching a move */
export interface TeachMoveArgs {
  monsterIndex: number;
  moveId: number;
  replaceSlot: number;
}

/** Arguments for evolving a monster */
export interface EvolveMonsterArgs {
  monsterIndex: number;
}

/** Arguments for setting a nickname */
export interface SetNicknameArgs {
  monsterIndex: number;
  nickname: string;
}

/** Arguments for reordering party */
export interface ReorderPartyArgs {
  newOrder: number[];
}

/** Arguments for depositing a monster to storage */
export interface DepositMonsterArgs {
  partyIndex: number;
}

/** Arguments for withdrawing a monster from storage */
export interface WithdrawMonsterArgs {
  storageIndex: number;
}

/** Arguments for updating strategy hash */
export interface UpdateStrategyArgs {
  strategyHash: number[];
}

/** Arguments for wild encounter */
export interface WildEncounterArgs {
  areaSeed: number[];
}

/** Arguments for fleeing battle */
export interface FleeBattleArgs {
  battlePubkey: PublicKey;
}

/** Instruction discriminators (first 8 bytes of sha256("global:<name>")) */
export const INSTRUCTION_DISCRIMINATORS = {
  registerAgent: Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  catchMonster: Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  initBattle: Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  submitBattleMove: Buffer.from([0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  switchMonster: Buffer.from([0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  gymChallenge: Buffer.from([0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  createTrade: Buffer.from([0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  executeTrade: Buffer.from([0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  cancelTrade: Buffer.from([0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  healMonster: Buffer.from([0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  healParty: Buffer.from([0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  teachMove: Buffer.from([0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  evolveMonster: Buffer.from([0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  setNickname: Buffer.from([0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  reorderParty: Buffer.from([0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  depositMonster: Buffer.from([0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  withdrawMonster: Buffer.from([0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  updateStrategy: Buffer.from([0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  wildEncounter: Buffer.from([0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  fleeBattle: Buffer.from([0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
} as const;

/** Account sizes for space allocation */
export const ACCOUNT_SIZES = {
  AGENT: 1024,
  MONSTER: 512,
  BATTLE: 384,
  TRADE: 256,
  LEADERBOARD: 4096,
  CONFIG: 128,
} as const;