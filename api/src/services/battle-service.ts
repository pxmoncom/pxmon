/**
 * Battle resolution service for PXMON API.
 */

import { Monster, MonsterMove } from './agent-service';

export interface TurnLog {
  turn: number;
  attacker: string;
  move: string;
  damage: number;
  effectiveness: number;
  critical: boolean;
  missed: boolean;
  defenderHpAfter: number;
}

export interface BattleOutcome {
  attackerWon: boolean;
  totalTurns: number;
  turns: TurnLog[];
  attackerHpAfter: number;
  defenderHpAfter: number;
}

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
};

function getEffectiveness(attackType: string, defenderTypes: string[]): number {
  let mult = 1;
  for (const dt of defenderTypes) {
    const chart = TYPE_CHART[attackType];
    if (chart && dt in chart) {
      mult *= chart[dt];
    }
  }
  return mult;
}

export class BattleService {
  private rngState: number = 0;

  private nextRandom(): number {
    this.rngState = (this.rngState * 1103515245 + 12345) & 0x7FFFFFFF;
    return (this.rngState >>> 0) / 0x7FFFFFFF;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.nextRandom() * (max - min + 1)) + min;
  }

  resolveBattle(attacker: Monster, defender: Monster): BattleOutcome {
    this.rngState = Date.now() & 0x7FFFFFFF;

    const atkHp = { current: attacker.stats.hp, max: attacker.stats.maxHp };
    const defHp = { current: defender.stats.hp, max: defender.stats.maxHp };
    const turns: TurnLog[] = [];
    let turnCount = 0;
    const maxTurns = 50;

    while (turnCount < maxTurns && atkHp.current > 0 && defHp.current > 0) {
      turnCount++;

      // Attacker's turn
      const atkTurn = this.executeTurn(
        turnCount, attacker, defender, atkHp, defHp, 'attacker'
      );
      turns.push(atkTurn);
      if (defHp.current <= 0) break;

      // Defender's turn
      const defTurn = this.executeTurn(
        turnCount, defender, attacker, defHp, atkHp, 'defender'
      );
      turns.push(defTurn);
      if (atkHp.current <= 0) break;
    }

    // Apply damage back to the actual monster objects
    attacker.stats.hp = Math.max(0, atkHp.current);
    defender.stats.hp = Math.max(0, defHp.current);

    return {
      attackerWon: defHp.current <= 0,
      totalTurns: turnCount,
      turns,
      attackerHpAfter: atkHp.current,
      defenderHpAfter: defHp.current,
    };
  }

  private executeTurn(
    turn: number,
    attacker: Monster,
    defender: Monster,
    atkHp: { current: number; max: number },
    defHp: { current: number; max: number },
    label: string,
  ): TurnLog {
    // Pick best move
    const move = this.pickBestMove(attacker, defender);
    if (!move) {
      // Struggle
      const damage = 10;
      defHp.current = Math.max(0, defHp.current - damage);
      return {
        turn,
        attacker: label,
        move: 'Struggle',
        damage,
        effectiveness: 1,
        critical: false,
        missed: false,
        defenderHpAfter: defHp.current,
      };
    }

    // Accuracy check
    const hitRoll = this.randomInt(1, 100);
    if (hitRoll > move.accuracy) {
      return {
        turn,
        attacker: label,
        move: move.name,
        damage: 0,
        effectiveness: 1,
        critical: false,
        missed: true,
        defenderHpAfter: defHp.current,
      };
    }

    if (move.power === 0) {
      return {
        turn,
        attacker: label,
        move: move.name,
        damage: 0,
        effectiveness: 1,
        critical: false,
        missed: false,
        defenderHpAfter: defHp.current,
      };
    }

    const effectiveness = getEffectiveness(move.type, defender.types);
    const isCritical = this.randomInt(1, 16) === 1;
    const critMult = isCritical ? 1.5 : 1.0;
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
    const atkStat = attacker.stats.attack;
    const defStat = defender.stats.defense;

    const levelFactor = (2 * attacker.level / 5 + 2);
    const baseDamage = (levelFactor * move.power * atkStat / defStat) / 50 + 2;
    const randomFactor = this.randomInt(85, 100) / 100;
    let totalDamage = Math.floor(baseDamage * stab * effectiveness * critMult * randomFactor);
    totalDamage = effectiveness > 0 ? Math.max(1, totalDamage) : 0;

    defHp.current = Math.max(0, defHp.current - totalDamage);

    return {
      turn,
      attacker: label,
      move: move.name,
      damage: totalDamage,
      effectiveness,
      critical: isCritical,
      missed: false,
      defenderHpAfter: defHp.current,
    };
  }

  private pickBestMove(attacker: Monster, defender: Monster): MonsterMove | null {
    let bestMove: MonsterMove | null = null;
    let bestScore = -1;

    for (const move of attacker.moves) {
      if (move.pp <= 0 || move.power === 0) continue;
      const eff = getEffectiveness(move.type, defender.types);
      const score = move.power * eff * (move.accuracy / 100);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    if (!bestMove) {
      const usable = attacker.moves.filter(m => m.pp > 0);
      return usable.length > 0 ? usable[0] : null;
    }

    return bestMove;
  }

  simulateBattle(
    monster1: Monster,
    monster2: Monster,
    iterations: number = 100,
  ): { monster1WinRate: number; avgTurns: number } {
    let m1Wins = 0;
    let totalTurns = 0;

    for (let i = 0; i < iterations; i++) {
      const m1Copy: Monster = JSON.parse(JSON.stringify(monster1));
      const m2Copy: Monster = JSON.parse(JSON.stringify(monster2));
      m1Copy.stats.hp = m1Copy.stats.maxHp;
      m2Copy.stats.hp = m2Copy.stats.maxHp;

      const result = this.resolveBattle(m1Copy, m2Copy);
      if (result.attackerWon) m1Wins++;
      totalTurns += result.totalTurns;
    }

    return {
      monster1WinRate: m1Wins / iterations,
      avgTurns: totalTurns / iterations,
    };
  }
}