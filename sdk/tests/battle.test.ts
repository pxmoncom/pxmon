import {
  BattleSimulator,
  SimMonster,
  SimulationResult,
} from "../src/agents/battle-simulator";
import { MonsterType, MoveCategory, StatusCondition, Move } from "../src/types";
import { DeterministicRng } from "../src/utils/rng";
import {
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
} from "../src/utils/type-chart";
import {
  SPECIES,
  MOVES,
  getSpecies,
  getSpeciesByRarity,
  getSpeciesByType,
  getEvolutionChain,
  canEvolve,
  calculateStat,
  calculateAllStats,
  getStarterSpecies,
  getSpeciesCountByRarity,
} from "../src/utils/monster-data";
import { RarityTier } from "../src/types";

// ============================================================
// TYPE CHART TESTS
// ============================================================

describe("TypeChart", () => {
  it("should have 17x17 entries", () => {
    const chart = getFullTypeChart();
    expect(chart.length).toBe(17);
    for (const row of chart) {
      expect(row.length).toBe(17);
    }
  });

  it("Fire should be super effective vs Grass", () => {
    expect(getTypeEffectiveness(MonsterType.Fire, MonsterType.Grass)).toBe(2.0);
  });

  it("Water should be super effective vs Fire", () => {
    expect(getTypeEffectiveness(MonsterType.Water, MonsterType.Fire)).toBe(2.0);
  });

  it("Grass should be super effective vs Water", () => {
    expect(getTypeEffectiveness(MonsterType.Grass, MonsterType.Water)).toBe(2.0);
  });

  it("Normal should not affect Ghost", () => {
    expect(getTypeEffectiveness(MonsterType.Normal, MonsterType.Ghost)).toBe(0.0);
  });

  it("Electric should not affect Ground", () => {
    expect(getTypeEffectiveness(MonsterType.Electric, MonsterType.Ground)).toBe(0.0);
  });

  it("Ghost should not affect Normal", () => {
    expect(getTypeEffectiveness(MonsterType.Ghost, MonsterType.Normal)).toBe(0.0);
  });

  it("Fighting should not affect Ghost", () => {
    expect(getTypeEffectiveness(MonsterType.Fighting, MonsterType.Ghost)).toBe(0.0);
  });

  it("Psychic should not affect Dark", () => {
    expect(getTypeEffectiveness(MonsterType.Psychic, MonsterType.Dark)).toBe(0.0);
  });

  it("Poison should not affect Steel", () => {
    expect(getTypeEffectiveness(MonsterType.Poison, MonsterType.Steel)).toBe(0.0);
  });

  it("Ground should not affect Flying", () => {
    expect(getTypeEffectiveness(MonsterType.Ground, MonsterType.Flying)).toBe(0.0);
  });

  it("Dragon should be super effective vs Dragon", () => {
    expect(getTypeEffectiveness(MonsterType.Dragon, MonsterType.Dragon)).toBe(2.0);
  });

  it("Steel should be not very effective vs Water", () => {
    expect(getTypeEffectiveness(MonsterType.Steel, MonsterType.Water)).toBe(0.5);
  });

  it("combined effectiveness for dual type", () => {
    // Fire vs Water/Rock = 0.5 * 2.0 = 1.0
    const eff = getCombinedEffectiveness(MonsterType.Fire, [MonsterType.Water, MonsterType.Rock]);
    expect(eff).toBe(1.0);
  });

  it("combined effectiveness 4x for dual weakness", () => {
    // Ground vs Fire/Rock = 2.0 * 2.0 = 4.0
    const eff = getCombinedEffectiveness(MonsterType.Ground, [MonsterType.Fire, MonsterType.Rock]);
    expect(eff).toBe(4.0);
  });

  it("isSuperEffective should return true for SE matchups", () => {
    expect(isSuperEffective(MonsterType.Fire, [MonsterType.Grass])).toBe(true);
  });

  it("isNotVeryEffective should return true for NVE matchups", () => {
    expect(isNotVeryEffective(MonsterType.Fire, [MonsterType.Water])).toBe(true);
  });

  it("isImmune should return true for immune matchups", () => {
    expect(isImmune(MonsterType.Normal, [MonsterType.Ghost])).toBe(true);
  });

  it("getSuperEffectiveTypes should find weaknesses", () => {
    const weaknesses = getSuperEffectiveTypes([MonsterType.Fire]);
    expect(weaknesses).toContain(MonsterType.Water);
    expect(weaknesses).toContain(MonsterType.Ground);
    expect(weaknesses).toContain(MonsterType.Rock);
  });

  it("getResistances should find resistances", () => {
    const resists = getResistances([MonsterType.Fire]);
    expect(resists).toContain(MonsterType.Fire);
    expect(resists).toContain(MonsterType.Grass);
  });

  it("getImmunities should find immunities", () => {
    const immunities = getImmunities([MonsterType.Normal]);
    expect(immunities).toContain(MonsterType.Ghost);
  });

  it("getBestAttackingType should find best type", () => {
    const best = getBestAttackingType([MonsterType.Grass]);
    expect(best.effectiveness).toBe(2.0);
    // Fire, Ice, Poison, Flying, Bug are all 2x vs Grass
    expect([MonsterType.Fire, MonsterType.Ice, MonsterType.Poison, MonsterType.Flying, MonsterType.Bug])
      .toContain(best.type);
  });

  it("getEffectivenessText returns correct strings", () => {
    expect(getEffectivenessText(0)).toBe("No effect");
    expect(getEffectivenessText(0.5)).toBe("Not very effective");
    expect(getEffectivenessText(1.0)).toBe("Neutral");
    expect(getEffectivenessText(2.0)).toBe("Super effective");
    expect(getEffectivenessText(4.0)).toBe("Extremely effective");
  });
});

// ============================================================
// MONSTER DATA TESTS
// ============================================================

describe("MonsterData", () => {
  it("should have exactly 94 species", () => {
    expect(Object.keys(SPECIES).length).toBe(94);
  });

  it("should have 85 common/uncommon species", () => {
    const counts = getSpeciesCountByRarity();
    const normalCount = (counts["Common"] || 0) + (counts["Uncommon"] || 0);
    expect(normalCount).toBe(85);
  });

  it("should have 6 rare species", () => {
    const rares = getSpeciesByRarity(RarityTier.Rare);
    expect(rares.length).toBe(6);
  });

  it("should have 3 legendary species", () => {
    const legendaries = getSpeciesByRarity(RarityTier.Legendary);
    expect(legendaries.length).toBe(3);
  });

  it("should have starter species at IDs 1, 4, 7", () => {
    const starters = getStarterSpecies();
    expect(starters).toEqual([1, 4, 7]);
    expect(getSpecies(1)?.name).toBe("Emberpup");
    expect(getSpecies(4)?.name).toBe("Bubblefin");
    expect(getSpecies(7)?.name).toBe("Sproutling");
  });

  it("should have correct types for starters", () => {
    expect(getSpecies(1)?.types).toEqual([MonsterType.Fire]);
    expect(getSpecies(4)?.types).toEqual([MonsterType.Water]);
    expect(getSpecies(7)?.types).toEqual([MonsterType.Grass]);
  });

  it("should have evolution chains", () => {
    const chain = getEvolutionChain(1);
    expect(chain).toEqual([1, 2, 3]);
  });

  it("should track evolution chain from any point", () => {
    const chain = getEvolutionChain(3);
    expect(chain).toEqual([1, 2, 3]);
  });

  it("canEvolve should respect level", () => {
    expect(canEvolve(1, 15)).toBe(false);
    expect(canEvolve(1, 16)).toBe(true);
    expect(canEvolve(1, 20)).toBe(true);
  });

  it("canEvolve should return false for final forms", () => {
    expect(canEvolve(3, 100)).toBe(false);
  });

  it("all species should have valid base stats", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.baseStats.hp).toBeGreaterThan(0);
      expect(sp.baseStats.attack).toBeGreaterThan(0);
      expect(sp.baseStats.defense).toBeGreaterThan(0);
      expect(sp.baseStats.spAttack).toBeGreaterThan(0);
      expect(sp.baseStats.spDefense).toBeGreaterThan(0);
      expect(sp.baseStats.speed).toBeGreaterThan(0);
    }
  });

  it("all species should have at least one type", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.types.length).toBeGreaterThanOrEqual(1);
      expect(sp.types.length).toBeLessThanOrEqual(2);
    }
  });

  it("all species should have a learnset", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(Object.keys(sp.learnset).length).toBeGreaterThan(0);
    }
  });

  it("all species should have a move pool", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.movePool.length).toBeGreaterThan(0);
    }
  });

  it("legendary species should have very low catch rate", () => {
    const legendaries = getSpeciesByRarity(RarityTier.Legendary);
    for (const sp of legendaries) {
      expect(sp.catchRate).toBeLessThanOrEqual(3);
    }
  });

  it("rare species should have low catch rate", () => {
    const rares = getSpeciesByRarity(RarityTier.Rare);
    for (const sp of rares) {
      expect(sp.catchRate).toBeLessThanOrEqual(15);
    }
  });

  it("getSpeciesByType should find Fire types", () => {
    const fireTypes = getSpeciesByType(MonsterType.Fire);
    expect(fireTypes.length).toBeGreaterThan(5);
    for (const sp of fireTypes) {
      expect(sp.types).toContain(MonsterType.Fire);
    }
  });

  it("calculateStat should compute HP correctly", () => {
    // Emberpup at level 50, base HP 45, IV 15, EV 0
    const hp = calculateStat(45, 15, 0, 50, 1.0, true);
    expect(hp).toBeGreaterThan(0);
    expect(hp).toBe(Math.floor(((2 * 45 + 15 + 0) * 50) / 100) + 50 + 10);
  });

  it("calculateStat should compute Attack correctly", () => {
    const atk = calculateStat(52, 15, 0, 50, 1.0, false);
    expect(atk).toBeGreaterThan(0);
  });

  it("calculateAllStats should return all six stats", () => {
    const sp = getSpecies(1)!;
    const stats = calculateAllStats(
      sp.baseStats,
      { hp: 15, attack: 15, defense: 15, spAttack: 15, spDefense: 15, speed: 15 },
      { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
      50,
      null,
      null
    );
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.defense).toBeGreaterThan(0);
    expect(stats.spAttack).toBeGreaterThan(0);
    expect(stats.spDefense).toBeGreaterThan(0);
    expect(stats.speed).toBeGreaterThan(0);
  });
});

// ============================================================
// RNG TESTS
// ============================================================

describe("DeterministicRng", () => {
  it("should produce deterministic results from same seed", () => {
    const rng1 = DeterministicRng.fromSeed(42);
    const rng2 = DeterministicRng.fromSeed(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1.nextU32()).toBe(rng2.nextU32());
    }
  });

  it("should produce different results from different seeds", () => {
    const rng1 = DeterministicRng.fromSeed(42);
    const rng2 = DeterministicRng.fromSeed(43);
    let different = false;
    for (let i = 0; i < 10; i++) {
      if (rng1.nextU32() !== rng2.nextU32()) different = true;
    }
    expect(different).toBe(true);
  });

  it("nextRange should produce values in range", () => {
    const rng = DeterministicRng.fromSeed(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextRange(100);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(100);
    }
  });

  it("nextFloat should produce values in [0, 1)", () => {
    const rng = DeterministicRng.fromSeed(456);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextFloat();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("generateIVs should produce values 0-31", () => {
    const rng = DeterministicRng.fromSeed(789);
    for (let i = 0; i < 100; i++) {
      const ivs = rng.generateIVs();
      expect(ivs.hp).toBeGreaterThanOrEqual(0);
      expect(ivs.hp).toBeLessThanOrEqual(31);
      expect(ivs.attack).toBeGreaterThanOrEqual(0);
      expect(ivs.attack).toBeLessThanOrEqual(31);
    }
  });

  it("rollDamageVariance should produce values 85-100", () => {
    const rng = DeterministicRng.fromSeed(999);
    for (let i = 0; i < 1000; i++) {
      const val = rng.rollDamageVariance();
      expect(val).toBeGreaterThanOrEqual(85);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("rollNature should produce values 0-24", () => {
    const rng = DeterministicRng.fromSeed(111);
    for (let i = 0; i < 100; i++) {
      const val = rng.rollNature();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(24);
    }
  });

  it("shuffle should preserve array elements", () => {
    const rng = DeterministicRng.fromSeed(222);
    const arr = [1, 2, 3, 4, 5];
    rng.shuffle(arr);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("pick should return element from array", () => {
    const rng = DeterministicRng.fromSeed(333);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it("save/restore state should work", () => {
    const rng = DeterministicRng.fromSeed(444);
    rng.nextU32();
    rng.nextU32();
    const state = rng.getState();
    const v1 = rng.nextU32();
    const v2 = rng.nextU32();
    rng.setState(state);
    expect(rng.nextU32()).toBe(v1);
    expect(rng.nextU32()).toBe(v2);
  });
});

// ============================================================
// BATTLE SIMULATOR TESTS
// ============================================================

describe("BattleSimulator", () => {
  let sim: BattleSimulator;

  beforeEach(() => {
    sim = new BattleSimulator(42);
  });

  function makeSimMonster(
    name: string,
    types: MonsterType[],
    level: number,
    hp: number,
    atk: number,
    def: number,
    spAtk: number,
    spDef: number,
    spd: number,
    moves: Move[]
  ): SimMonster {
    return {
      speciesId: 1,
      name,
      types,
      level,
      maxHp: hp,
      currentHp: hp,
      attack: atk,
      defense: def,
      spAttack: spAtk,
      spDefense: spDef,
      speed: spd,
      moves: moves.map((m) => ({ move: m, currentPp: m.pp })),
      status: StatusCondition.None,
      statStages: {
        attack: 0, defense: 0, spAttack: 0, spDefense: 0,
        speed: 0, accuracy: 0, evasion: 0,
      },
      isAlive: true,
    };
  }

  it("should produce a winner", () => {
    const c = makeSimMonster(
      "Challenger", [MonsterType.Fire], 50, 150, 80, 60, 90, 65, 85,
      [MOVES[10]] // Flamethrower
    );
    const d = makeSimMonster(
      "Defender", [MonsterType.Grass], 50, 150, 70, 55, 80, 60, 75,
      [MOVES[5]] // Vine Whip
    );

    const result = sim.simulate(c, d);
    expect(["challenger", "defender", "draw"]).toContain(result.winner);
    expect(result.totalTurns).toBeGreaterThan(0);
  });

  it("fire should usually beat grass at same level", () => {
    let fireWins = 0;
    for (let i = 0; i < 50; i++) {
      const s = new BattleSimulator(i);
      const c = makeSimMonster(
        "FireMon", [MonsterType.Fire], 30, 100, 70, 50, 80, 55, 70,
        [MOVES[10]] // Flamethrower
      );
      const d = makeSimMonster(
        "GrassMon", [MonsterType.Grass], 30, 100, 70, 50, 80, 55, 70,
        [MOVES[5]] // Vine Whip
      );
      const result = s.simulate(c, d);
      if (result.winner === "challenger") fireWins++;
    }
    expect(fireWins).toBeGreaterThan(30); // Fire should win most
  });

  it("higher level should have advantage", () => {
    let highWins = 0;
    for (let i = 0; i < 50; i++) {
      const s = new BattleSimulator(i + 1000);
      const c = makeSimMonster(
        "HighLevel", [MonsterType.Normal], 60, 200, 100, 80, 90, 75, 90,
        [MOVES[1]] // Tackle
      );
      const d = makeSimMonster(
        "LowLevel", [MonsterType.Normal], 20, 60, 40, 30, 35, 30, 35,
        [MOVES[1]] // Tackle
      );
      const result = s.simulate(c, d);
      if (result.winner === "challenger") highWins++;
    }
    expect(highWins).toBeGreaterThan(40);
  });

  it("should track turn count", () => {
    const c = makeSimMonster(
      "A", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 75,
      [MOVES[48]] // Hyper Beam
    );
    const d = makeSimMonster(
      "B", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 75,
      [MOVES[48]]
    );
    const result = sim.simulate(c, d);
    expect(result.totalTurns).toBeGreaterThanOrEqual(1);
    expect(result.turns.length).toBe(result.totalTurns);
  });

  it("should generate battle log", () => {
    const c = makeSimMonster(
      "Alpha", [MonsterType.Water], 40, 120, 65, 55, 75, 60, 70,
      [MOVES[4]] // Water Gun
    );
    const d = makeSimMonster(
      "Beta", [MonsterType.Fire], 40, 120, 65, 55, 75, 60, 70,
      [MOVES[3]] // Ember
    );
    const result = sim.simulate(c, d);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0]).toContain("Battle:");
  });

  it("calculateDamage should return positive for damaging moves", () => {
    const c = makeSimMonster(
      "Atk", [MonsterType.Fire], 50, 150, 80, 60, 90, 65, 85,
      [MOVES[10]]
    );
    const d = makeSimMonster(
      "Def", [MonsterType.Grass], 50, 150, 70, 55, 80, 60, 75,
      [MOVES[5]]
    );
    const result = sim.calculateDamage(c, d, MOVES[10]);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.effectiveness).toBe(2.0);
    expect(result.isStab).toBe(true);
  });

  it("calculateDamage should return 0 for immune matchup", () => {
    const c = makeSimMonster(
      "Normal", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 75,
      [MOVES[1]]
    );
    const d = makeSimMonster(
      "Ghost", [MonsterType.Ghost], 50, 150, 70, 55, 80, 60, 75,
      [MOVES[18]]
    );
    const result = sim.calculateDamage(c, d, MOVES[1]); // Tackle vs Ghost
    expect(result.damage).toBe(0);
    expect(result.effectiveness).toBe(0);
  });

  it("STAB should be applied correctly", () => {
    const fireMon = makeSimMonster(
      "Fire", [MonsterType.Fire], 50, 150, 80, 60, 90, 65, 85,
      [MOVES[10], MOVES[1]] // Flamethrower, Tackle
    );
    const target = makeSimMonster(
      "Normal", [MonsterType.Normal], 50, 150, 70, 55, 80, 60, 75,
      [MOVES[1]]
    );

    // Run many trials to compare average damage
    let stabTotal = 0;
    let noStabTotal = 0;
    const trials = 200;

    for (let i = 0; i < trials; i++) {
      const s = new BattleSimulator(i + 5000);
      const stab = s.calculateDamage(fireMon, target, MOVES[10]); // Fire move with STAB
      const noStab = s.calculateDamage(fireMon, target, MOVES[1]); // Normal move, no STAB for Fire type
      stabTotal += stab.damage;
      noStabTotal += noStab.damage;
    }

    // Flamethrower (90 power, STAB) should do more than Tackle (40 power, no STAB)
    expect(stabTotal / trials).toBeGreaterThan(noStabTotal / trials);
  });

  it("createSimMonsterFromSpecies should work", () => {
    const mon = sim.createSimMonsterFromSpecies(1, 50, [1, 3, 9, 10], "Adamant");
    expect(mon.name).toBe("Emberpup");
    expect(mon.types).toEqual([MonsterType.Fire]);
    expect(mon.level).toBe(50);
    expect(mon.maxHp).toBeGreaterThan(0);
    expect(mon.moves.length).toBe(4);
  });

  it("runMonteCarlo should return win rate", () => {
    const c = sim.createSimMonsterFromSpecies(1, 30, [1, 3], "Hardy");
    const d = sim.createSimMonsterFromSpecies(7, 30, [1, 5], "Hardy");

    const mc = sim.runMonteCarlo(c, d, 20);
    expect(mc.winRate).toBeGreaterThanOrEqual(0);
    expect(mc.winRate).toBeLessThanOrEqual(1);
    expect(mc.avgTurns).toBeGreaterThan(0);
    expect(mc.results.length).toBe(20);
  });

  it("predictBattle should return valid prediction", () => {
    // Create mock monsters
    const mockMon: any = {
      speciesId: 1,
      currentHp: 100,
      maxHp: 100,
      level: 30,
      moves: [
        { move: MOVES[3], currentPp: 25 }, // Ember
        { move: MOVES[10], currentPp: 15 }, // Flamethrower
      ],
    };

    const prediction = sim.predictBattle(
      [mockMon],
      [MonsterType.Grass],
      30
    );
    expect(prediction.winProbability).toBeGreaterThanOrEqual(0);
    expect(prediction.winProbability).toBeLessThanOrEqual(1);
    expect(prediction.bestLeadIndex).toBe(0);
    expect(prediction.expectedTurns).toBeGreaterThan(0);
  });

  it("status damage should apply each turn", () => {
    const c = makeSimMonster(
      "Burned", [MonsterType.Fire], 50, 200, 80, 60, 90, 65, 85,
      [MOVES[10]]
    );
    c.status = StatusCondition.Burn;

    const d = makeSimMonster(
      "Healthy", [MonsterType.Water], 50, 200, 70, 55, 80, 60, 75,
      [MOVES[4]]
    );

    const result = sim.simulate(c, d);
    // Burned monster should take extra damage from burn
    const burnLogs = result.log.filter((l) => l.includes("Burn"));
    expect(burnLogs.length).toBeGreaterThan(0);
  });

  it("faster monster should attack first", () => {
    const fast = makeSimMonster(
      "FastMon", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 200,
      [MOVES[1]]
    );
    const slow = makeSimMonster(
      "SlowMon", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 10,
      [MOVES[1]]
    );

    const result = sim.simulate(fast, slow);
    expect(result.turns[0].firstAttacker).toBe("FastMon");
  });

  it("priority move should go first regardless of speed", () => {
    const slow = makeSimMonster(
      "SlowPriority", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 10,
      [MOVES[24]] // Quick Attack (priority 1)
    );
    const fast = makeSimMonster(
      "FastNormal", [MonsterType.Normal], 50, 150, 80, 60, 70, 55, 200,
      [MOVES[1]] // Tackle (priority 0)
    );

    const result = sim.simulate(slow, fast);
    expect(result.turns[0].firstAttacker).toBe("SlowPriority");
  });
});