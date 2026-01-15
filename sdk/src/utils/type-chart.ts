import { MonsterType } from "../types";

/**
 * Full 17-type effectiveness chart.
 * typeChart[attacker][defender] = multiplier
 * 2.0 = super effective, 0.5 = not very effective, 0.0 = immune, 1.0 = neutral
 */
const typeChart: number[][] = buildTypeChart();

function buildTypeChart(): number[][] {
  const T = MonsterType;
  const chart: number[][] = Array.from({ length: 17 }, () =>
    new Array(17).fill(1.0)
  );

  function se(atk: MonsterType, def: MonsterType): void {
    chart[atk][def] = 2.0;
  }
  function nve(atk: MonsterType, def: MonsterType): void {
    chart[atk][def] = 0.5;
  }
  function imm(atk: MonsterType, def: MonsterType): void {
    chart[atk][def] = 0.0;
  }

  // Normal
  nve(T.Normal, T.Rock);
  nve(T.Normal, T.Steel);
  imm(T.Normal, T.Ghost);

  // Fire
  se(T.Fire, T.Grass);
  se(T.Fire, T.Ice);
  se(T.Fire, T.Bug);
  se(T.Fire, T.Steel);
  nve(T.Fire, T.Fire);
  nve(T.Fire, T.Water);
  nve(T.Fire, T.Rock);
  nve(T.Fire, T.Dragon);

  // Water
  se(T.Water, T.Fire);
  se(T.Water, T.Ground);
  se(T.Water, T.Rock);
  nve(T.Water, T.Water);
  nve(T.Water, T.Grass);
  nve(T.Water, T.Dragon);

  // Electric
  se(T.Electric, T.Water);
  se(T.Electric, T.Flying);
  nve(T.Electric, T.Electric);
  nve(T.Electric, T.Grass);
  nve(T.Electric, T.Dragon);
  imm(T.Electric, T.Ground);

  // Grass
  se(T.Grass, T.Water);
  se(T.Grass, T.Ground);
  se(T.Grass, T.Rock);
  nve(T.Grass, T.Fire);
  nve(T.Grass, T.Grass);
  nve(T.Grass, T.Poison);
  nve(T.Grass, T.Flying);
  nve(T.Grass, T.Bug);
  nve(T.Grass, T.Dragon);
  nve(T.Grass, T.Steel);

  // Ice
  se(T.Ice, T.Grass);
  se(T.Ice, T.Ground);
  se(T.Ice, T.Flying);
  se(T.Ice, T.Dragon);
  nve(T.Ice, T.Fire);
  nve(T.Ice, T.Water);
  nve(T.Ice, T.Ice);
  nve(T.Ice, T.Steel);

  // Fighting
  se(T.Fighting, T.Normal);
  se(T.Fighting, T.Ice);
  se(T.Fighting, T.Rock);
  se(T.Fighting, T.Dark);
  se(T.Fighting, T.Steel);
  nve(T.Fighting, T.Poison);
  nve(T.Fighting, T.Flying);
  nve(T.Fighting, T.Psychic);
  nve(T.Fighting, T.Bug);
  imm(T.Fighting, T.Ghost);

  // Poison
  se(T.Poison, T.Grass);
  nve(T.Poison, T.Poison);
  nve(T.Poison, T.Ground);
  nve(T.Poison, T.Rock);
  nve(T.Poison, T.Ghost);
  imm(T.Poison, T.Steel);

  // Ground
  se(T.Ground, T.Fire);
  se(T.Ground, T.Electric);
  se(T.Ground, T.Poison);
  se(T.Ground, T.Rock);
  se(T.Ground, T.Steel);
  nve(T.Ground, T.Grass);
  nve(T.Ground, T.Bug);
  imm(T.Ground, T.Flying);

  // Flying
  se(T.Flying, T.Grass);
  se(T.Flying, T.Fighting);
  se(T.Flying, T.Bug);
  nve(T.Flying, T.Electric);
  nve(T.Flying, T.Rock);
  nve(T.Flying, T.Steel);

  // Psychic
  se(T.Psychic, T.Fighting);
  se(T.Psychic, T.Poison);
  nve(T.Psychic, T.Psychic);
  nve(T.Psychic, T.Steel);
  imm(T.Psychic, T.Dark);

  // Bug
  se(T.Bug, T.Grass);
  se(T.Bug, T.Psychic);
  se(T.Bug, T.Dark);
  nve(T.Bug, T.Fire);
  nve(T.Bug, T.Fighting);
  nve(T.Bug, T.Poison);
  nve(T.Bug, T.Flying);
  nve(T.Bug, T.Ghost);
  nve(T.Bug, T.Steel);

  // Rock
  se(T.Rock, T.Fire);
  se(T.Rock, T.Ice);
  se(T.Rock, T.Flying);
  se(T.Rock, T.Bug);
  nve(T.Rock, T.Fighting);
  nve(T.Rock, T.Ground);
  nve(T.Rock, T.Steel);

  // Ghost
  se(T.Ghost, T.Psychic);
  se(T.Ghost, T.Ghost);
  nve(T.Ghost, T.Dark);
  imm(T.Ghost, T.Normal);

  // Dragon
  se(T.Dragon, T.Dragon);
  nve(T.Dragon, T.Steel);
  imm(T.Dragon, T.Normal); // Actually neutral, but we keep fairy-less gen logic
  // Correction: Dragon vs Normal is neutral
  chart[T.Dragon][T.Normal] = 1.0;

  // Dark
  se(T.Dark, T.Psychic);
  se(T.Dark, T.Ghost);
  nve(T.Dark, T.Fighting);
  nve(T.Dark, T.Dark);

  // Steel
  se(T.Steel, T.Ice);
  se(T.Steel, T.Rock);
  nve(T.Steel, T.Fire);
  nve(T.Steel, T.Water);
  nve(T.Steel, T.Electric);
  nve(T.Steel, T.Steel);

  return chart;
}

/**
 * Get the type effectiveness multiplier for a single attacking type vs single defending type.
 */
export function getTypeEffectiveness(
  attackType: MonsterType,
  defendType: MonsterType
): number {
  return typeChart[attackType][defendType];
}

/**
 * Get combined effectiveness for an attack type against a dual-typed defender.
 */
export function getCombinedEffectiveness(
  attackType: MonsterType,
  defendTypes: MonsterType[]
): number {
  let multiplier = 1.0;
  for (const defType of defendTypes) {
    multiplier *= typeChart[attackType][defType];
  }
  return multiplier;
}

/**
 * Check if a type matchup is super effective (>1.0).
 */
export function isSuperEffective(
  attackType: MonsterType,
  defendTypes: MonsterType[]
): boolean {
  return getCombinedEffectiveness(attackType, defendTypes) > 1.0;
}

/**
 * Check if a type matchup is not very effective (<1.0 and >0).
 */
export function isNotVeryEffective(
  attackType: MonsterType,
  defendTypes: MonsterType[]
): boolean {
  const eff = getCombinedEffectiveness(attackType, defendTypes);
  return eff < 1.0 && eff > 0;
}

/**
 * Check if a type matchup is immune (0).
 */
export function isImmune(
  attackType: MonsterType,
  defendTypes: MonsterType[]
): boolean {
  return getCombinedEffectiveness(attackType, defendTypes) === 0;
}

/**
 * Get all types that are super effective against the given types.
 */
export function getSuperEffectiveTypes(
  defendTypes: MonsterType[]
): MonsterType[] {
  const result: MonsterType[] = [];
  for (let i = 0; i < 17; i++) {
    if (isSuperEffective(i as MonsterType, defendTypes)) {
      result.push(i as MonsterType);
    }
  }
  return result;
}

/**
 * Get all types that the given types resist.
 */
export function getResistances(defendTypes: MonsterType[]): MonsterType[] {
  const result: MonsterType[] = [];
  for (let i = 0; i < 17; i++) {
    if (isNotVeryEffective(i as MonsterType, defendTypes)) {
      result.push(i as MonsterType);
    }
  }
  return result;
}

/**
 * Get all types that the given types are immune to.
 */
export function getImmunities(defendTypes: MonsterType[]): MonsterType[] {
  const result: MonsterType[] = [];
  for (let i = 0; i < 17; i++) {
    if (isImmune(i as MonsterType, defendTypes)) {
      result.push(i as MonsterType);
    }
  }
  return result;
}

/**
 * Get the best attacking type against the given defending types.
 */
export function getBestAttackingType(
  defendTypes: MonsterType[]
): { type: MonsterType; effectiveness: number } {
  let bestType = MonsterType.Normal;
  let bestEff = 0;
  for (let i = 0; i < 17; i++) {
    const eff = getCombinedEffectiveness(i as MonsterType, defendTypes);
    if (eff > bestEff) {
      bestEff = eff;
      bestType = i as MonsterType;
    }
  }
  return { type: bestType, effectiveness: bestEff };
}

/**
 * Get a human-readable effectiveness description.
 */
export function getEffectivenessText(multiplier: number): string {
  if (multiplier === 0) return "No effect";
  if (multiplier < 0.5) return "Barely effective";
  if (multiplier === 0.5) return "Not very effective";
  if (multiplier === 1.0) return "Neutral";
  if (multiplier === 2.0) return "Super effective";
  if (multiplier >= 4.0) return "Extremely effective";
  return `${multiplier}x effective`;
}

/**
 * Get the full type chart as a 2D array.
 */
export function getFullTypeChart(): ReadonlyArray<ReadonlyArray<number>> {
  return typeChart;
}

/**
 * Get type name from enum value.
 */
export function getTypeName(type: MonsterType): string {
  return MonsterType[type];
}