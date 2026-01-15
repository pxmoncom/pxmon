import {
  StrategyConfig,
  Monster,
  MonsterType,
  RarityTier,
  BattlePreferences,
  CatchFilter,
  WildEncounter,
  BattleMoveSelection,
  BattleAction,
  MoveCategory,
  Agent,
} from "../types";
import { TICK_PRESETS } from "../constants";
import {
  getCombinedEffectiveness,
  isSuperEffective,
  getBestAttackingType,
} from "../utils/type-chart";
import { getSpecies, calculateAllStats, SPECIES } from "../utils/monster-data";

/**
 * Default strategy configuration.
 */
export function createDefaultStrategy(): StrategyConfig {
  return {
    catchFilter: {
      minRarity: RarityTier.Common,
      preferShiny: true,
      preferredSpecies: [],
      minCatchRate: 0,
      maxAttempts: 3,
    },
    battlePreferences: {
      aggressiveness: 0.7,
      switchThreshold: 0.25,
      useTypeAdvantage: true,
      fleeThreshold: 0.1,
      targetWeakerOpponents: true,
    },
    healThreshold: 0.3,
    autoGym: true,
    autoTrade: false,
    preferredTypes: [],
    avoidTypes: [],
    minCatchLevel: 1,
    maxPartyLevel: 100,
    tickSpeed: TICK_PRESETS.NORMAL,
  };
}

/**
 * Create an aggressive strategy focused on battling.
 */
export function createAggressiveStrategy(): StrategyConfig {
  return {
    ...createDefaultStrategy(),
    battlePreferences: {
      aggressiveness: 0.95,
      switchThreshold: 0.1,
      useTypeAdvantage: true,
      fleeThreshold: 0.0,
      targetWeakerOpponents: false,
    },
    healThreshold: 0.15,
    tickSpeed: TICK_PRESETS.FAST,
  };
}

/**
 * Create a collector strategy focused on catching.
 */
export function createCollectorStrategy(): StrategyConfig {
  return {
    ...createDefaultStrategy(),
    catchFilter: {
      minRarity: RarityTier.Common,
      preferShiny: true,
      preferredSpecies: [],
      minCatchRate: 0,
      maxAttempts: 5,
    },
    battlePreferences: {
      aggressiveness: 0.3,
      switchThreshold: 0.4,
      useTypeAdvantage: true,
      fleeThreshold: 0.3,
      targetWeakerOpponents: true,
    },
    healThreshold: 0.5,
    autoGym: false,
    tickSpeed: TICK_PRESETS.NORMAL,
  };
}

/**
 * Create a gym-rush strategy.
 */
export function createGymRushStrategy(): StrategyConfig {
  return {
    ...createDefaultStrategy(),
    battlePreferences: {
      aggressiveness: 0.8,
      switchThreshold: 0.2,
      useTypeAdvantage: true,
      fleeThreshold: 0.05,
      targetWeakerOpponents: false,
    },
    healThreshold: 0.4,
    autoGym: true,
    tickSpeed: TICK_PRESETS.FAST,
  };
}

/**
 * Strategy engine that makes decisions for an automated agent.
 */
export class StrategyEngine {
  private config: StrategyConfig;

  constructor(config?: Partial<StrategyConfig>) {
    this.config = { ...createDefaultStrategy(), ...config };
  }

  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Decide whether to attempt catching a wild encounter.
   */
  shouldCatch(encounter: WildEncounter, currentPartySize: number): boolean {
    const species = getSpecies(encounter.speciesId);
    if (!species) return false;

    // Always try to catch shinies if preferred
    if (encounter.isShiny && this.config.catchFilter.preferShiny) return true;

    // Check level filter
    if (encounter.level < this.config.minCatchLevel) return false;

    // Check rarity filter
    const rarityOrder = [RarityTier.Common, RarityTier.Uncommon, RarityTier.Rare, RarityTier.Legendary];
    const minIdx = rarityOrder.indexOf(this.config.catchFilter.minRarity);
    const speciesIdx = rarityOrder.indexOf(species.rarity);
    if (speciesIdx < minIdx) return false;

    // Check preferred species
    if (
      this.config.catchFilter.preferredSpecies.length > 0 &&
      !this.config.catchFilter.preferredSpecies.includes(encounter.speciesId)
    ) {
      // Still catch if rare+
      if (speciesIdx < 2) return false;
    }

    // Check if we have room (party or storage)
    if (currentPartySize >= 6) {
      // Still catch for storage
      return true;
    }

    // Check preferred types
    if (this.config.preferredTypes.length > 0) {
      const hasPreferred = species.types.some((t) =>
        this.config.preferredTypes.includes(t)
      );
      if (!hasPreferred && speciesIdx < 1) return false;
    }

    // Check avoided types
    if (this.config.avoidTypes.length > 0) {
      const hasAvoided = species.types.some((t) =>
        this.config.avoidTypes.includes(t)
      );
      if (hasAvoided && speciesIdx < 2) return false;
    }

    return true;
  }

  /**
   * Decide whether the party needs healing.
   */
  needsHealing(party: Monster[]): boolean {
    if (party.length === 0) return false;
    const totalHpRatio =
      party.reduce((sum, m) => sum + m.currentHp / m.maxHp, 0) / party.length;
    return totalHpRatio < this.config.healThreshold;
  }

  /**
   * Decide whether to challenge a gym.
   */
  shouldChallengeGym(agent: Agent, party: Monster[], gymId: number): boolean {
    if (!this.config.autoGym) return false;
    if (agent.badges[gymId]) return false;

    // Check prerequisite badges
    if (gymId > 0 && !agent.badges[gymId - 1]) return false;

    // Check party strength — average level should be at least gymId * 10 + 10
    const avgLevel = party.reduce((s, m) => s + m.level, 0) / party.length;
    const minLevel = gymId * 10 + 10;
    return avgLevel >= minLevel;
  }

  /**
   * Decide whether to initiate a battle with another agent.
   */
  shouldBattle(ownParty: Monster[], opponentInfo: { avgLevel: number; totalWins: number }): boolean {
    if (ownParty.length === 0) return false;

    const ownAvgLevel = ownParty.reduce((s, m) => s + m.level, 0) / ownParty.length;
    const hpRatio = ownParty.reduce((s, m) => s + m.currentHp / m.maxHp, 0) / ownParty.length;

    // Don't battle if too injured
    if (hpRatio < this.config.battlePreferences.fleeThreshold + 0.2) return false;

    // Check if we target weaker opponents
    if (this.config.battlePreferences.targetWeakerOpponents) {
      return opponentInfo.avgLevel <= ownAvgLevel * 1.1;
    }

    // Aggressiveness determines willingness to fight stronger foes
    const levelDiff = opponentInfo.avgLevel - ownAvgLevel;
    const threshold = (1 - this.config.battlePreferences.aggressiveness) * 20;
    return levelDiff < threshold;
  }

  /**
   * Select the best move for a battle turn.
   */
  selectBattleMove(
    attacker: Monster,
    defenderTypes: MonsterType[],
    defenderHpRatio: number
  ): BattleMoveSelection {
    // Check if we should flee
    const attackerHpRatio = attacker.currentHp / attacker.maxHp;
    if (attackerHpRatio < this.config.battlePreferences.fleeThreshold) {
      return { action: BattleAction.Flee };
    }

    // Find the best damaging move
    let bestMoveIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < attacker.moves.length; i++) {
      const slot = attacker.moves[i];
      if (slot.currentPp <= 0) continue;
      if (slot.move.category === MoveCategory.Status) continue;

      const effectiveness = getCombinedEffectiveness(slot.move.type, defenderTypes);
      const stab = attacker.moves[i].move.type === getSpecies(attacker.speciesId)?.types[0] ||
                   attacker.moves[i].move.type === getSpecies(attacker.speciesId)?.types[1]
        ? 1.5 : 1.0;

      const score = slot.move.power * effectiveness * stab * (slot.move.accuracy / 100);

      // Prefer finishing moves when defender is low
      const finishBonus = defenderHpRatio < 0.2 && slot.move.power >= 80 ? 1.3 : 1.0;

      const finalScore = score * finishBonus;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMoveIdx = i;
      }
    }

    // If no damaging move has PP, try status
    if (bestScore === -Infinity) {
      for (let i = 0; i < attacker.moves.length; i++) {
        if (attacker.moves[i].currentPp > 0) {
          return { action: BattleAction.Attack, moveIndex: i };
        }
      }
      // Completely out of PP — flee
      return { action: BattleAction.Flee };
    }

    return { action: BattleAction.Attack, moveIndex: bestMoveIdx };
  }

  /**
   * Select the best monster to send out.
   */
  selectBestMonster(party: Monster[], opponentTypes: MonsterType[]): number {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      if (mon.currentHp <= 0) continue;

      const species = getSpecies(mon.speciesId);
      if (!species) continue;

      let score = mon.currentHp / mon.maxHp * 100; // HP bonus

      // Type advantage bonus
      if (this.config.battlePreferences.useTypeAdvantage) {
        for (const move of mon.moves) {
          if (move.currentPp <= 0) continue;
          if (move.move.category === MoveCategory.Status) continue;
          const eff = getCombinedEffectiveness(move.move.type, opponentTypes);
          if (eff > 1) score += eff * 50;
        }

        // Defensive type advantage
        for (const oppType of opponentTypes) {
          const defEff = getCombinedEffectiveness(oppType, species.types);
          if (defEff < 1) score += 20;
          if (defEff > 1) score -= 30;
        }
      }

      // Level bonus
      score += mon.level * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  /**
   * Decide whether to switch monsters in battle.
   */
  shouldSwitch(
    currentMonster: Monster,
    opponentTypes: MonsterType[],
    party: Monster[]
  ): { shouldSwitch: boolean; switchTo: number } {
    const hpRatio = currentMonster.currentHp / currentMonster.maxHp;

    // Check if current monster is at switch threshold
    if (hpRatio > this.config.battlePreferences.switchThreshold) {
      return { shouldSwitch: false, switchTo: 0 };
    }

    // Find a better alternative
    const currentSpecies = getSpecies(currentMonster.speciesId);
    if (!currentSpecies) return { shouldSwitch: false, switchTo: 0 };

    const bestIdx = this.selectBestMonster(party, opponentTypes);
    const bestMon = party[bestIdx];

    // Only switch if the alternative is meaningfully better
    if (bestMon && bestMon.currentHp > currentMonster.currentHp * 2) {
      return { shouldSwitch: true, switchTo: bestIdx };
    }

    return { shouldSwitch: false, switchTo: 0 };
  }

  /**
   * Rank party monsters by overall strength.
   */
  rankParty(party: Monster[]): number[] {
    const indices = party.map((_, i) => i);
    indices.sort((a, b) => {
      const ma = party[a];
      const mb = party[b];
      const scoreA = ma.level * 10 + ma.currentHp;
      const scoreB = mb.level * 10 + mb.currentHp;
      return scoreB - scoreA;
    });
    return indices;
  }

  /**
   * Evaluate the overall strength of a party.
   */
  evaluatePartyStrength(party: Monster[]): number {
    if (party.length === 0) return 0;
    let totalScore = 0;
    for (const mon of party) {
      const species = getSpecies(mon.speciesId);
      if (!species) continue;
      const bst = species.baseStats.hp + species.baseStats.attack + species.baseStats.defense +
                  species.baseStats.spAttack + species.baseStats.spDefense + species.baseStats.speed;
      const levelFactor = mon.level / 100;
      const hpFactor = mon.currentHp / mon.maxHp;
      totalScore += bst * levelFactor * hpFactor;
    }
    return totalScore;
  }

  /**
   * Get the recommended next action for the agent.
   */
  getRecommendedAction(agent: Agent, party: Monster[]): AgentAction {
    // Priority 1: Heal if needed
    if (this.needsHealing(party)) {
      return AgentAction.Heal;
    }

    // Priority 2: Evolve any eligible monsters
    for (const mon of party) {
      const species = getSpecies(mon.speciesId);
      if (species && species.evolvesTo && species.evolutionLevel && mon.level >= species.evolutionLevel) {
        return AgentAction.Evolve;
      }
    }

    // Priority 3: Gym challenge
    for (let i = 0; i < 8; i++) {
      if (this.shouldChallengeGym(agent, party, i)) {
        return AgentAction.Gym;
      }
    }

    // Priority 4: Explore / catch
    if (party.length < 6) {
      return AgentAction.Explore;
    }

    // Priority 5: Battle
    return AgentAction.Battle;
  }
}

export enum AgentAction {
  Heal = "Heal",
  Evolve = "Evolve",
  Gym = "Gym",
  Explore = "Explore",
  Battle = "Battle",
  Trade = "Trade",
  Wait = "Wait",
}