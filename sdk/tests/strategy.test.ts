import { Keypair, PublicKey } from "@solana/web3.js";
import {
  StrategyEngine,
  AgentAction,
  createDefaultStrategy,
  createAggressiveStrategy,
  createCollectorStrategy,
  createGymRushStrategy,
} from "../src/agents/strategy";
import {
  Monster,
  Agent,
  MonsterType,
  RarityTier,
  WildEncounter,
  StatusCondition,
  MoveCategory,
  BattleAction,
} from "../src/types";
import { MOVES } from "../src/utils/monster-data";

function makeMockMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    pubkey: Keypair.generate().publicKey,
    owner: Keypair.generate().publicKey,
    speciesId: 1,
    nickname: null,
    level: 20,
    xp: 0,
    nature: "Hardy",
    ivs: { hp: 15, attack: 15, defense: 15, spAttack: 15, spDefense: 15, speed: 15 },
    evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    currentHp: 60,
    maxHp: 60,
    moves: [
      { move: MOVES[1], currentPp: 35 },
      { move: MOVES[3], currentPp: 25 },
      { move: MOVES[9], currentPp: 25 },
      { move: MOVES[24], currentPp: 30 },
    ],
    status: StatusCondition.None,
    friendship: 70,
    isShiny: false,
    caughtAt: Date.now(),
    battleCount: 0,
    winCount: 0,
    ...overrides,
  };
}

function makeMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    pubkey: Keypair.generate().publicKey,
    authority: Keypair.generate().publicKey,
    name: "TestAgent",
    party: [],
    storage: [],
    badges: [false, false, false, false, false, false, false, false],
    money: 1000,
    totalBattles: 0,
    totalWins: 0,
    totalCatches: 0,
    totalTrades: 0,
    registeredAt: Date.now(),
    lastActionSlot: 0,
    strategyHash: new Array(32).fill(0),
    isActive: true,
    ...overrides,
  };
}

describe("StrategyEngine", () => {
  let engine: StrategyEngine;

  beforeEach(() => {
    engine = new StrategyEngine();
  });

  describe("configuration", () => {
    it("should use default strategy", () => {
      const config = engine.getConfig();
      expect(config.healThreshold).toBe(0.3);
      expect(config.autoGym).toBe(true);
      expect(config.tickSpeed).toBe(3000);
    });

    it("should accept partial config overrides", () => {
      engine.updateConfig({ healThreshold: 0.5 });
      expect(engine.getConfig().healThreshold).toBe(0.5);
      expect(engine.getConfig().autoGym).toBe(true); // unchanged
    });

    it("should create aggressive strategy", () => {
      const config = createAggressiveStrategy();
      expect(config.battlePreferences.aggressiveness).toBe(0.95);
      expect(config.battlePreferences.fleeThreshold).toBe(0.0);
    });

    it("should create collector strategy", () => {
      const config = createCollectorStrategy();
      expect(config.catchFilter.maxAttempts).toBe(5);
      expect(config.battlePreferences.aggressiveness).toBe(0.3);
    });

    it("should create gym rush strategy", () => {
      const config = createGymRushStrategy();
      expect(config.autoGym).toBe(true);
      expect(config.battlePreferences.aggressiveness).toBe(0.8);
    });
  });

  describe("shouldCatch", () => {
    it("should always catch shinies when preferShiny is true", () => {
      const encounter: WildEncounter = {
        speciesId: 13, // Nibblit (common)
        level: 5,
        isShiny: true,
        nature: "Hardy",
        ivs: { hp: 10, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
      };
      expect(engine.shouldCatch(encounter, 3)).toBe(true);
    });

    it("should respect minimum level filter", () => {
      engine.updateConfig({ minCatchLevel: 10 });
      const encounter: WildEncounter = {
        speciesId: 13,
        level: 5,
        isShiny: false,
        nature: "Hardy",
        ivs: { hp: 10, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
      };
      expect(engine.shouldCatch(encounter, 3)).toBe(false);
    });

    it("should catch rare monsters regardless of filters", () => {
      engine.updateConfig({
        catchFilter: {
          minRarity: RarityTier.Rare,
          preferShiny: true,
          preferredSpecies: [],
          minCatchRate: 0,
          maxAttempts: 3,
        },
      });
      const encounter: WildEncounter = {
        speciesId: 86, // Phoenixia (rare)
        level: 30,
        isShiny: false,
        nature: "Adamant",
        ivs: { hp: 20, attack: 20, defense: 20, spAttack: 20, spDefense: 20, speed: 20 },
      };
      expect(engine.shouldCatch(encounter, 3)).toBe(true);
    });

    it("should filter by preferred species", () => {
      engine.updateConfig({
        catchFilter: {
          ...engine.getConfig().catchFilter,
          preferredSpecies: [1, 4, 7],
        },
      });
      const encounter: WildEncounter = {
        speciesId: 13,
        level: 10,
        isShiny: false,
        nature: "Hardy",
        ivs: { hp: 10, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
      };
      expect(engine.shouldCatch(encounter, 3)).toBe(false);
    });

    it("should return false for unknown species", () => {
      const encounter: WildEncounter = {
        speciesId: 9999,
        level: 10,
        isShiny: false,
        nature: "Hardy",
        ivs: { hp: 10, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
      };
      expect(engine.shouldCatch(encounter, 3)).toBe(false);
    });
  });

  describe("needsHealing", () => {
    it("should return true when party HP is below threshold", () => {
      const party = [
        makeMockMonster({ currentHp: 10, maxHp: 100 }),
        makeMockMonster({ currentHp: 15, maxHp: 100 }),
      ];
      expect(engine.needsHealing(party)).toBe(true);
    });

    it("should return false when party HP is above threshold", () => {
      const party = [
        makeMockMonster({ currentHp: 80, maxHp: 100 }),
        makeMockMonster({ currentHp: 90, maxHp: 100 }),
      ];
      expect(engine.needsHealing(party)).toBe(false);
    });

    it("should return false for empty party", () => {
      expect(engine.needsHealing([])).toBe(false);
    });
  });

  describe("shouldChallengeGym", () => {
    it("should not challenge gym if autoGym is disabled", () => {
      engine.updateConfig({ autoGym: false });
      const agent = makeMockAgent();
      const party = [makeMockMonster({ level: 50 })];
      expect(engine.shouldChallengeGym(agent, party, 0)).toBe(false);
    });

    it("should not challenge gym if already beaten", () => {
      const agent = makeMockAgent({
        badges: [true, false, false, false, false, false, false, false],
      });
      const party = [makeMockMonster({ level: 50 })];
      expect(engine.shouldChallengeGym(agent, party, 0)).toBe(false);
    });

    it("should not challenge gym without prerequisite badge", () => {
      const agent = makeMockAgent({
        badges: [false, false, false, false, false, false, false, false],
      });
      const party = [makeMockMonster({ level: 50 })];
      expect(engine.shouldChallengeGym(agent, party, 1)).toBe(false);
    });

    it("should challenge first gym when party is strong enough", () => {
      const agent = makeMockAgent();
      const party = [makeMockMonster({ level: 15 })];
      expect(engine.shouldChallengeGym(agent, party, 0)).toBe(true);
    });

    it("should not challenge gym when party is too weak", () => {
      const agent = makeMockAgent();
      const party = [makeMockMonster({ level: 5 })];
      expect(engine.shouldChallengeGym(agent, party, 0)).toBe(false);
    });
  });

  describe("shouldBattle", () => {
    it("should not battle with empty party", () => {
      expect(engine.shouldBattle([], { avgLevel: 10, totalWins: 5 })).toBe(false);
    });

    it("should not battle when HP is too low", () => {
      const party = [makeMockMonster({ currentHp: 5, maxHp: 100 })];
      expect(engine.shouldBattle(party, { avgLevel: 10, totalWins: 5 })).toBe(false);
    });

    it("should battle weaker opponents when targetWeaker is true", () => {
      const party = [makeMockMonster({ level: 30, currentHp: 80, maxHp: 100 })];
      expect(engine.shouldBattle(party, { avgLevel: 20, totalWins: 5 })).toBe(true);
    });
  });

  describe("selectBattleMove", () => {
    it("should select super effective move", () => {
      const mon = makeMockMonster({
        moves: [
          { move: MOVES[1], currentPp: 35 },  // Tackle (Normal)
          { move: MOVES[3], currentPp: 25 },  // Ember (Fire)
          { move: MOVES[4], currentPp: 25 },  // Water Gun (Water)
        ],
      });
      // Against Grass type, Fire should be preferred
      const result = engine.selectBattleMove(mon, [MonsterType.Grass], 1.0);
      expect(result.action).toBe(BattleAction.Attack);
      expect(result.moveIndex).toBe(1); // Ember
    });

    it("should flee when HP is critically low", () => {
      engine.updateConfig({
        battlePreferences: {
          ...engine.getConfig().battlePreferences,
          fleeThreshold: 0.2,
        },
      });
      const mon = makeMockMonster({ currentHp: 5, maxHp: 100 });
      const result = engine.selectBattleMove(mon, [MonsterType.Normal], 1.0);
      expect(result.action).toBe(BattleAction.Flee);
    });

    it("should flee when all moves are out of PP", () => {
      const mon = makeMockMonster({
        moves: [
          { move: MOVES[1], currentPp: 0 },
          { move: MOVES[3], currentPp: 0 },
        ],
      });
      const result = engine.selectBattleMove(mon, [MonsterType.Normal], 1.0);
      expect(result.action).toBe(BattleAction.Flee);
    });
  });

  describe("selectBestMonster", () => {
    it("should pick monster with type advantage", () => {
      const party = [
        makeMockMonster({ speciesId: 1, currentHp: 50, maxHp: 50, level: 20 }),  // Fire
        makeMockMonster({
          speciesId: 4, currentHp: 50, maxHp: 50, level: 20, // Water
          moves: [{ move: MOVES[4], currentPp: 25 }],
        }),
      ];
      // Against Fire, Water should be preferred
      const idx = engine.selectBestMonster(party, [MonsterType.Fire]);
      expect(idx).toBe(1);
    });

    it("should skip fainted monsters", () => {
      const party = [
        makeMockMonster({ currentHp: 0, maxHp: 50 }),
        makeMockMonster({ currentHp: 30, maxHp: 50 }),
      ];
      const idx = engine.selectBestMonster(party, [MonsterType.Normal]);
      expect(idx).toBe(1);
    });
  });

  describe("getRecommendedAction", () => {
    it("should recommend heal when party is low HP", () => {
      const agent = makeMockAgent();
      const party = [makeMockMonster({ currentHp: 10, maxHp: 100 })];
      expect(engine.getRecommendedAction(agent, party)).toBe(AgentAction.Heal);
    });

    it("should recommend explore when party is not full", () => {
      const agent = makeMockAgent();
      const party = [makeMockMonster({ currentHp: 80, maxHp: 100 })];
      expect(engine.getRecommendedAction(agent, party)).toBe(AgentAction.Explore);
    });

    it("should recommend battle when party is full and healthy", () => {
      const agent = makeMockAgent();
      const party = Array.from({ length: 6 }, () =>
        makeMockMonster({ currentHp: 80, maxHp: 100 })
      );
      expect(engine.getRecommendedAction(agent, party)).toBe(AgentAction.Battle);
    });
  });

  describe("evaluatePartyStrength", () => {
    it("should return 0 for empty party", () => {
      expect(engine.evaluatePartyStrength([])).toBe(0);
    });

    it("should give higher score to higher level party", () => {
      const weak = [makeMockMonster({ level: 10, currentHp: 30, maxHp: 30 })];
      const strong = [makeMockMonster({ level: 50, currentHp: 100, maxHp: 100 })];
      expect(engine.evaluatePartyStrength(strong)).toBeGreaterThan(
        engine.evaluatePartyStrength(weak)
      );
    });
  });

  describe("rankParty", () => {
    it("should rank by level and HP", () => {
      const party = [
        makeMockMonster({ level: 10, currentHp: 30, maxHp: 30 }),
        makeMockMonster({ level: 50, currentHp: 100, maxHp: 100 }),
        makeMockMonster({ level: 30, currentHp: 60, maxHp: 60 }),
      ];
      const ranked = engine.rankParty(party);
      expect(ranked[0]).toBe(1); // level 50
      expect(ranked[1]).toBe(2); // level 30
      expect(ranked[2]).toBe(0); // level 10
    });
  });
});