import { PublicKey } from "@solana/web3.js";

/** PXMON on-chain program ID */
export const PROGRAM_ID = new PublicKey(
  "PXMNagnt111111111111111111111111111111111111"
);

/** Seed prefixes for PDA derivation */
export const SEEDS = {
  AGENT: Buffer.from("agent"),
  MONSTER: Buffer.from("monster"),
  BATTLE: Buffer.from("battle"),
  GYM: Buffer.from("gym"),
  TRADE: Buffer.from("trade"),
  LEADERBOARD: Buffer.from("leaderboard"),
  CONFIG: Buffer.from("config"),
} as const;

/** Maximum level a monster can reach */
export const MAX_LEVEL = 100;

/** Maximum number of moves a monster can know */
export const MAX_MOVES = 4;

/** Maximum party size */
export const MAX_PARTY_SIZE = 6;

/** Maximum storage box capacity */
export const MAX_STORAGE = 30;

/** Base catch rate denominator */
export const CATCH_RATE_BASE = 255;

/** XP required to reach each level (cumulative) */
export const XP_CURVE: Record<number, number> = {};
for (let level = 1; level <= MAX_LEVEL; level++) {
  XP_CURVE[level] = Math.floor(((level * level * level) * 4) / 5);
}

/** XP needed to go from level N to level N+1 */
export function xpForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return Infinity;
  return XP_CURVE[currentLevel + 1] - XP_CURVE[currentLevel];
}

/** Color palette for monster types (hex) */
export const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A878",
  Fire: "#F08030",
  Water: "#6890F0",
  Electric: "#F8D030",
  Grass: "#78C850",
  Ice: "#98D8D8",
  Fighting: "#C03028",
  Poison: "#A040A0",
  Ground: "#E0C068",
  Flying: "#A890F0",
  Psychic: "#F85888",
  Bug: "#A8B820",
  Rock: "#B8A038",
  Ghost: "#705898",
  Dragon: "#7038F8",
  Dark: "#705848",
  Steel: "#B8B8D0",
};

/** Rarity tiers */
export enum Rarity {
  Common = "Common",
  Uncommon = "Uncommon",
  Rare = "Rare",
  Legendary = "Legendary",
}

/** Battle outcome enumeration */
export enum BattleOutcome {
  Win = "Win",
  Lose = "Lose",
  Draw = "Draw",
  Flee = "Flee",
}

/** Gym badge names */
export const GYM_BADGES = [
  "Boulder",
  "Cascade",
  "Thunder",
  "Rainbow",
  "Soul",
  "Marsh",
  "Volcano",
  "Earth",
] as const;

/** Tick speed presets in milliseconds */
export const TICK_PRESETS = {
  FAST: 1000,
  NORMAL: 3000,
  SLOW: 5000,
  CAUTIOUS: 10000,
} as const;

/** Stat index mapping */
export enum StatIndex {
  HP = 0,
  Attack = 1,
  Defense = 2,
  SpAttack = 3,
  SpDefense = 4,
  Speed = 5,
}

/** Maximum IV value */
export const MAX_IV = 31;

/** Maximum EV per stat */
export const MAX_EV_PER_STAT = 252;

/** Maximum total EVs */
export const MAX_TOTAL_EV = 510;

/** Nature stat modifiers */
export const NATURES: Record<string, { plus: StatIndex | null; minus: StatIndex | null }> = {
  Hardy: { plus: null, minus: null },
  Lonely: { plus: StatIndex.Attack, minus: StatIndex.Defense },
  Brave: { plus: StatIndex.Attack, minus: StatIndex.Speed },
  Adamant: { plus: StatIndex.Attack, minus: StatIndex.SpAttack },
  Naughty: { plus: StatIndex.Attack, minus: StatIndex.SpDefense },
  Bold: { plus: StatIndex.Defense, minus: StatIndex.Attack },
  Docile: { plus: null, minus: null },
  Relaxed: { plus: StatIndex.Defense, minus: StatIndex.Speed },
  Impish: { plus: StatIndex.Defense, minus: StatIndex.SpAttack },
  Lax: { plus: StatIndex.Defense, minus: StatIndex.SpDefense },
  Timid: { plus: StatIndex.Speed, minus: StatIndex.Attack },
  Hasty: { plus: StatIndex.Speed, minus: StatIndex.Defense },
  Serious: { plus: null, minus: null },
  Jolly: { plus: StatIndex.Speed, minus: StatIndex.SpAttack },
  Naive: { plus: StatIndex.Speed, minus: StatIndex.SpDefense },
  Modest: { plus: StatIndex.SpAttack, minus: StatIndex.Attack },
  Mild: { plus: StatIndex.SpAttack, minus: StatIndex.Defense },
  Quiet: { plus: StatIndex.SpAttack, minus: StatIndex.Speed },
  Bashful: { plus: null, minus: null },
  Rash: { plus: StatIndex.SpAttack, minus: StatIndex.SpDefense },
  Calm: { plus: StatIndex.SpDefense, minus: StatIndex.Attack },
  Gentle: { plus: StatIndex.SpDefense, minus: StatIndex.Defense },
  Sassy: { plus: StatIndex.SpDefense, minus: StatIndex.Speed },
  Careful: { plus: StatIndex.SpDefense, minus: StatIndex.SpAttack },
  Quirky: { plus: null, minus: null },
};