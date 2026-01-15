import {
  Monster,
  MonsterType,
  MoveCategory,
  MoveSlot,
  StatusCondition,
  DamageResult,
  Move,
  BaseStats,
} from "../types";
import { DeterministicRng } from "../utils/rng";
import {
  getCombinedEffectiveness,
  getEffectivenessText,
} from "../utils/type-chart";
import { getSpecies, calculateAllStats, MOVES } from "../utils/monster-data";
import { MAX_LEVEL } from "../constants";

/** Simulated monster state during battle */
export interface SimMonster {
  speciesId: number;
  name: string;
  types: MonsterType[];
  level: number;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  moves: SimMove[];
  status: StatusCondition;
  statStages: StatStages;
  isAlive: boolean;
}

/** Simulated move with PP tracking */
export interface SimMove {
  move: Move;
  currentPp: number;
}

/** Stat modifier stages (-6 to +6) */
export interface StatStages {
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
}

/** Result of a single turn */
export interface TurnResult {
  turn: number;
  firstAttacker: string;
  secondAttacker: string;
  firstMove: string;
  secondMove: string;
  firstDamage: DamageResult;
  secondDamage: DamageResult;
  firstHpAfter: number;
  secondHpAfter: number;
  firstFainted: boolean;
  secondFainted: boolean;
  log: string[];
}

/** Result of a full battle simulation */
export interface SimulationResult {
  winner: "challenger" | "defender" | "draw";
  turns: TurnResult[];
  challengerHpRemaining: number;
  defenderHpRemaining: number;
  totalTurns: number;
  log: string[];
}

/** Prediction for battle outcome */
export interface BattlePrediction {
  winProbability: number;
  expectedTurns: number;
  bestLeadIndex: number;
  typeMatchupScore: number;
  recommendedMoves: number[];
}

function defaultStatStages(): StatStages {
  return { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0, accuracy: 0, evasion: 0 };
}

function stageMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

/**
 * Off-chain battle simulator for strategy planning.
 */
export class BattleSimulator {
  private rng: DeterministicRng;
  private maxTurns: number;

  constructor(seed?: number, maxTurns?: number) {
    this.rng = DeterministicRng.fromSeed(seed ?? Date.now());
    this.maxTurns = maxTurns ?? 100;
  }

  /**
   * Create a SimMonster from an on-chain Monster.
   */
  createSimMonster(monster: Monster): SimMonster {
    const species = getSpecies(monster.speciesId);
    if (!species) {
      throw new Error(`Unknown species: ${monster.speciesId}`);
    }

    return {
      speciesId: monster.speciesId,
      name: monster.nickname ?? species.name,
      types: [...species.types],
      level: monster.level,
      maxHp: monster.maxHp,
      currentHp: monster.currentHp,
      attack: calculateStatFromMonster(monster, "attack"),
      defense: calculateStatFromMonster(monster, "defense"),
      spAttack: calculateStatFromMonster(monster, "spAttack"),
      spDefense: calculateStatFromMonster(monster, "spDefense"),
      speed: calculateStatFromMonster(monster, "speed"),
      moves: monster.moves.map((m) => ({ move: m.move, currentPp: m.currentPp })),
      status: monster.status,
      statStages: defaultStatStages(),
      isAlive: monster.currentHp > 0,
    };
  }

  /**
   * Create a SimMonster from raw species data (for gym/NPC battles).
   */
  createSimMonsterFromSpecies(
    speciesId: number,
    level: number,
    moveIds: number[],
    nature: string = "Hardy"
  ): SimMonster {
    const species = getSpecies(speciesId);
    if (!species) {
      throw new Error(`Unknown species: ${speciesId}`);
    }

    const ivs = { hp: 15, attack: 15, defense: 15, spAttack: 15, spDefense: 15, speed: 15 };
    const evs = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const stats = calculateAllStats(species.baseStats, ivs, evs, level, null, null);

    const moves: SimMove[] = moveIds
      .map((id) => MOVES[id])
      .filter((m): m is Move => m !== undefined)
      .map((m) => ({ move: m, currentPp: m.pp }));

    return {
      speciesId,
      name: species.name,
      types: [...species.types],
      level,
      maxHp: stats.hp,
      currentHp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      spAttack: stats.spAttack,
      spDefense: stats.spDefense,
      speed: stats.speed,
      moves,
      status: StatusCondition.None,
      statStages: defaultStatStages(),
      isAlive: true,
    };
  }

  /**
   * Simulate a full 1v1 battle.
   */
  simulate(challenger: SimMonster, defender: SimMonster): SimulationResult {
    const log: string[] = [];
    const turns: TurnResult[] = [];

    log.push(`Battle: ${challenger.name} (Lv${challenger.level}) vs ${defender.name} (Lv${defender.level})`);

    let turnCount = 0;

    while (
      challenger.isAlive &&
      defender.isAlive &&
      turnCount < this.maxTurns
    ) {
      turnCount++;
      const turnResult = this.simulateTurn(challenger, defender, turnCount);
      turns.push(turnResult);
      log.push(...turnResult.log);

      if (turnResult.firstFainted || turnResult.secondFainted) break;
    }

    let winner: "challenger" | "defender" | "draw";
    if (!challenger.isAlive && !defender.isAlive) {
      winner = "draw";
    } else if (!challenger.isAlive) {
      winner = "defender";
    } else if (!defender.isAlive) {
      winner = "challenger";
    } else {
      winner = challenger.currentHp >= defender.currentHp ? "challenger" : "defender";
    }

    log.push(`Winner: ${winner} (${turnCount} turns)`);

    return {
      winner,
      turns,
      challengerHpRemaining: Math.max(0, challenger.currentHp),
      defenderHpRemaining: Math.max(0, defender.currentHp),
      totalTurns: turnCount,
      log,
    };
  }

  /**
   * Simulate a single turn of battle.
   */
  private simulateTurn(
    a: SimMonster,
    b: SimMonster,
    turnNum: number
  ): TurnResult {
    const log: string[] = [];
    log.push(`--- Turn ${turnNum} ---`);

    // Determine move selection (pick best available)
    const aMoveIdx = this.pickBestMove(a, b);
    const bMoveIdx = this.pickBestMove(b, a);
    const aMove = a.moves[aMoveIdx];
    const bMove = b.moves[bMoveIdx];

    // Determine order
    const aSpeed = this.getEffectiveSpeed(a);
    const bSpeed = this.getEffectiveSpeed(b);
    const aPriority = aMove.move.priority;
    const bPriority = bMove.move.priority;

    let first: SimMonster, second: SimMonster;
    let firstMove: SimMove, secondMove: SimMove;

    if (aPriority !== bPriority) {
      if (aPriority > bPriority) {
        first = a; second = b; firstMove = aMove; secondMove = bMove;
      } else {
        first = b; second = a; firstMove = bMove; secondMove = aMove;
      }
    } else if (aSpeed !== bSpeed) {
      if (aSpeed > bSpeed) {
        first = a; second = b; firstMove = aMove; secondMove = bMove;
      } else {
        first = b; second = a; firstMove = bMove; secondMove = aMove;
      }
    } else {
      // Speed tie — random
      if (this.rng.nextBool()) {
        first = a; second = b; firstMove = aMove; secondMove = bMove;
      } else {
        first = b; second = a; firstMove = bMove; secondMove = aMove;
      }
    }

    // First attack
    const firstDamage = this.executeMove(first, second, firstMove, log);
    const secondFaintedByFirst = !second.isAlive;

    // Second attack (only if alive)
    let secondDamage: DamageResult = { damage: 0, effectiveness: 1, isCritical: false, isStab: false };
    if (second.isAlive) {
      secondDamage = this.executeMove(second, first, secondMove, log);
    }

    // Apply status damage
    this.applyStatusDamage(first, log);
    this.applyStatusDamage(second, log);

    return {
      turn: turnNum,
      firstAttacker: first.name,
      secondAttacker: second.name,
      firstMove: firstMove.move.name,
      secondMove: secondMove.move.name,
      firstDamage,
      secondDamage,
      firstHpAfter: first.currentHp,
      secondHpAfter: second.currentHp,
      firstFainted: !first.isAlive,
      secondFainted: !second.isAlive,
      log,
    };
  }

  /**
   * Execute a move from attacker to defender.
   */
  private executeMove(
    attacker: SimMonster,
    defender: SimMonster,
    moveSlot: SimMove,
    log: string[]
  ): DamageResult {
    const move = moveSlot.move;
    moveSlot.currentPp = Math.max(0, moveSlot.currentPp - 1);

    log.push(`${attacker.name} used ${move.name}!`);

    // Status moves
    if (move.category === MoveCategory.Status) {
      log.push(`${move.name} had its effect!`);
      return { damage: 0, effectiveness: 1, isCritical: false, isStab: false };
    }

    // Accuracy check
    if (!this.rng.rollAccuracy(move.accuracy)) {
      log.push(`${attacker.name}'s attack missed!`);
      return { damage: 0, effectiveness: 1, isCritical: false, isStab: false };
    }

    // Calculate damage
    const result = this.calculateDamage(attacker, defender, move);

    // Apply damage
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    if (defender.currentHp <= 0) {
      defender.isAlive = false;
      log.push(`${defender.name} fainted!`);
    }

    // Log effectiveness
    if (result.effectiveness > 1) {
      log.push("It's super effective!");
    } else if (result.effectiveness < 1 && result.effectiveness > 0) {
      log.push("It's not very effective...");
    } else if (result.effectiveness === 0) {
      log.push("It had no effect...");
    }
    if (result.isCritical) {
      log.push("A critical hit!");
    }

    log.push(`${move.name} dealt ${result.damage} damage. ${defender.name} HP: ${defender.currentHp}/${defender.maxHp}`);

    return result;
  }

  /**
   * Calculate damage for a move.
   */
  calculateDamage(attacker: SimMonster, defender: SimMonster, move: Move): DamageResult {
    if (move.power === 0) {
      return { damage: 0, effectiveness: 1, isCritical: false, isStab: false };
    }

    const effectiveness = getCombinedEffectiveness(move.type, defender.types);
    if (effectiveness === 0) {
      return { damage: 0, effectiveness: 0, isCritical: false, isStab: false };
    }

    const isPhysical = move.category === MoveCategory.Physical;
    let atk = isPhysical
      ? attacker.attack * stageMultiplier(attacker.statStages.attack)
      : attacker.spAttack * stageMultiplier(attacker.statStages.spAttack);
    let def = isPhysical
      ? defender.defense * stageMultiplier(defender.statStages.defense)
      : defender.spDefense * stageMultiplier(defender.statStages.spDefense);

    // STAB
    const isStab = attacker.types.includes(move.type);
    const stabMod = isStab ? 1.5 : 1.0;

    // Critical hit
    const isCritical = this.rng.rollCritical();
    const critMod = isCritical ? 1.5 : 1.0;
    if (isCritical) {
      // Crits ignore negative attack stages and positive defense stages
      if (attacker.statStages.attack < 0) atk = isPhysical ? attacker.attack : attacker.spAttack;
      if (defender.statStages.defense > 0) def = isPhysical ? defender.defense : defender.spDefense;
    }

    // Damage variance
    const variance = this.rng.rollDamageVariance() / 100;

    // Burn penalty (physical moves only)
    const burnMod = attacker.status === StatusCondition.Burn && isPhysical ? 0.5 : 1.0;

    // Formula
    const baseDamage = Math.floor(
      (((2 * attacker.level / 5 + 2) * move.power * atk) / def / 50 + 2)
    );
    const totalDamage = Math.max(
      1,
      Math.floor(baseDamage * stabMod * effectiveness * critMod * variance * burnMod)
    );

    return { damage: totalDamage, effectiveness, isCritical, isStab };
  }

  /**
   * Pick the best move index for an attacker against a defender.
   */
  private pickBestMove(attacker: SimMonster, defender: SimMonster): number {
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < attacker.moves.length; i++) {
      const slot = attacker.moves[i];
      if (slot.currentPp <= 0) continue;
      if (slot.move.category === MoveCategory.Status) {
        if (bestScore < 0) {
          bestIdx = i;
          bestScore = 0;
        }
        continue;
      }

      const eff = getCombinedEffectiveness(slot.move.type, defender.types);
      const stab = attacker.types.includes(slot.move.type) ? 1.5 : 1.0;
      const score = slot.move.power * eff * stab * (slot.move.accuracy / 100);

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  /**
   * Get effective speed including stat stages and paralysis.
   */
  private getEffectiveSpeed(mon: SimMonster): number {
    let speed = mon.speed * stageMultiplier(mon.statStages.speed);
    if (mon.status === StatusCondition.Paralysis) speed *= 0.5;
    return Math.floor(speed);
  }

  /**
   * Apply end-of-turn status damage.
   */
  private applyStatusDamage(mon: SimMonster, log: string[]): void {
    if (!mon.isAlive) return;

    switch (mon.status) {
      case StatusCondition.Burn:
      case StatusCondition.Poison: {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.currentHp = Math.max(0, mon.currentHp - dmg);
        log.push(`${mon.name} took ${dmg} damage from ${mon.status}!`);
        if (mon.currentHp <= 0) {
          mon.isAlive = false;
          log.push(`${mon.name} fainted from ${mon.status}!`);
        }
        break;
      }
      case StatusCondition.BadPoison: {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 6));
        mon.currentHp = Math.max(0, mon.currentHp - dmg);
        log.push(`${mon.name} took ${dmg} damage from bad poison!`);
        if (mon.currentHp <= 0) {
          mon.isAlive = false;
          log.push(`${mon.name} fainted from bad poison!`);
        }
        break;
      }
    }
  }

  /**
   * Run multiple simulations and return win probability.
   */
  runMonteCarlo(
    challenger: SimMonster,
    defender: SimMonster,
    iterations: number = 100
  ): { winRate: number; avgTurns: number; results: SimulationResult[] } {
    let wins = 0;
    let totalTurns = 0;
    const results: SimulationResult[] = [];

    for (let i = 0; i < iterations; i++) {
      // Clone monsters for each iteration
      const c = cloneSimMonster(challenger);
      const d = cloneSimMonster(defender);
      this.rng = DeterministicRng.fromSeed(Date.now() + i);

      const result = this.simulate(c, d);
      results.push(result);

      if (result.winner === "challenger") wins++;
      totalTurns += result.totalTurns;
    }

    return {
      winRate: wins / iterations,
      avgTurns: totalTurns / iterations,
      results,
    };
  }

  /**
   * Predict battle outcome for strategy planning.
   */
  predictBattle(
    party: Monster[],
    opponentTypes: MonsterType[],
    opponentLevel: number
  ): BattlePrediction {
    // Simple heuristic prediction without full simulation
    let bestLeadIdx = 0;
    let bestTypeScore = -Infinity;
    const recommendedMoves: number[] = [];

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      if (mon.currentHp <= 0) continue;
      const species = getSpecies(mon.speciesId);
      if (!species) continue;

      let typeScore = 0;
      // Offensive advantage
      for (const move of mon.moves) {
        if (move.move.category === MoveCategory.Status) continue;
        const eff = getCombinedEffectiveness(move.move.type, opponentTypes);
        typeScore += (eff - 1) * move.move.power;
      }
      // Defensive advantage
      for (const oppType of opponentTypes) {
        const defEff = getCombinedEffectiveness(oppType, species.types);
        typeScore -= (defEff - 1) * 40;
      }

      if (typeScore > bestTypeScore) {
        bestTypeScore = typeScore;
        bestLeadIdx = i;
      }
    }

    // Estimate win probability based on level difference and type matchup
    const leadMon = party[bestLeadIdx];
    const levelRatio = leadMon ? leadMon.level / Math.max(1, opponentLevel) : 0.5;
    const typeBonus = Math.max(-0.3, Math.min(0.3, bestTypeScore / 300));
    const winProb = Math.max(0, Math.min(1, 0.5 * levelRatio + typeBonus));

    // Pick recommended moves for the lead
    if (leadMon) {
      for (let i = 0; i < leadMon.moves.length; i++) {
        const move = leadMon.moves[i];
        if (move.currentPp > 0 && move.move.category !== MoveCategory.Status) {
          const eff = getCombinedEffectiveness(move.move.type, opponentTypes);
          if (eff >= 1) recommendedMoves.push(i);
        }
      }
    }

    return {
      winProbability: winProb,
      expectedTurns: Math.round(5 + (1 - winProb) * 10),
      bestLeadIndex: bestLeadIdx,
      typeMatchupScore: bestTypeScore,
      recommendedMoves:
        recommendedMoves.length > 0
          ? recommendedMoves
          : leadMon ? [0] : [],
    };
  }
}

function cloneSimMonster(mon: SimMonster): SimMonster {
  return {
    ...mon,
    types: [...mon.types],
    moves: mon.moves.map((m) => ({ move: m.move, currentPp: m.currentPp })),
    statStages: { ...mon.statStages },
  };
}

function calculateStatFromMonster(monster: Monster, stat: "attack" | "defense" | "spAttack" | "spDefense" | "speed"): number {
  const species = getSpecies(monster.speciesId);
  if (!species) return 10;
  const base = species.baseStats[stat];
  const iv = monster.ivs[stat];
  const ev = monster.evs[stat];
  return Math.floor(
    (Math.floor(((2 * base + iv + Math.floor(ev / 4)) * monster.level) / 100) + 5)
  );
}