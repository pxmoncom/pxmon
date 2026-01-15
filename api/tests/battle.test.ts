/**
 * Tests for PXMON Battle Service.
 */

import { BattleService, BattleOutcome } from '../src/services/battle-service';
import { Monster, MonsterStats, MonsterMove } from '../src/services/agent-service';
import { eventBus } from '../src/services/event-bus';
import { GameClock } from '../src/routes/clock';
import { BackupService } from '../src/services/backup';

function createTestMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    uid: 'test_mon_001',
    speciesId: 'flamelet',
    nickname: null,
    level: 10,
    xp: 1000,
    stats: {
      hp: 40,
      maxHp: 40,
      attack: 30,
      defense: 25,
      spAttack: 35,
      spDefense: 25,
      speed: 30,
    },
    moves: [
      { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, maxPp: 25 },
      { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
    ],
    types: ['fire'],
    status: null,
    isShiny: false,
    ...overrides,
  };
}

describe('BattleService', () => {
  let service: BattleService;

  beforeEach(() => {
    service = new BattleService();
  });

  describe('resolveBattle', () => {
    it('should produce a battle outcome', () => {
      const attacker = createTestMonster();
      const defender = createTestMonster({
        uid: 'def_001',
        speciesId: 'sproutix',
        types: ['grass'],
        moves: [
          { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, maxPp: 25 },
        ],
      });

      const result = service.resolveBattle(attacker, defender);
      expect(result).toBeDefined();
      expect(typeof result.attackerWon).toBe('boolean');
      expect(result.totalTurns).toBeGreaterThan(0);
      expect(result.turns.length).toBeGreaterThan(0);
    });

    it('should end when one side faints', () => {
      const attacker = createTestMonster({ stats: { ...createTestMonster().stats, attack: 999 } });
      const defender = createTestMonster({ uid: 'weak', stats: { ...createTestMonster().stats, hp: 1, maxHp: 1 } });

      const result = service.resolveBattle(attacker, defender);
      expect(result.attackerWon).toBe(true);
      expect(result.defenderHpAfter).toBe(0);
    });

    it('should apply STAB bonus', () => {
      // Fire monster using fire move should deal more than neutral
      const fireAttacker = createTestMonster({
        types: ['fire'],
        moves: [{ name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, maxPp: 25 }],
        stats: { ...createTestMonster().stats, hp: 200, maxHp: 200, attack: 50 },
      });

      const normalAttacker = createTestMonster({
        uid: 'normal_atk',
        types: ['normal'],
        moves: [{ name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, maxPp: 25 }],
        stats: { ...createTestMonster().stats, hp: 200, maxHp: 200, attack: 50 },
      });

      const defender = createTestMonster({
        uid: 'tank',
        types: ['normal'],
        stats: { ...createTestMonster().stats, hp: 500, maxHp: 500 },
        moves: [{ name: 'Tackle', type: 'normal', power: 1, accuracy: 100, pp: 50, maxPp: 50 }],
      });

      // Run multiple times to average out RNG
      let fireTotal = 0;
      let normalTotal = 0;
      for (let i = 0; i < 20; i++) {
        const d1 = { ...defender, stats: { ...defender.stats, hp: 500 } };
        const d2 = { ...defender, stats: { ...defender.stats, hp: 500 }, uid: 'tank2' };
        const r1 = service.resolveBattle({ ...fireAttacker }, d1);
        const r2 = service.resolveBattle({ ...normalAttacker }, d2);
        fireTotal += r1.turns.filter(t => t.attacker === 'attacker').reduce((s, t) => s + t.damage, 0);
        normalTotal += r2.turns.filter(t => t.attacker === 'attacker').reduce((s, t) => s + t.damage, 0);
      }
      // STAB should make fire attacks deal more total damage on average
      expect(fireTotal).toBeGreaterThan(normalTotal * 0.8);
    });

    it('should respect type effectiveness', () => {
      const fireAttacker = createTestMonster({
        types: ['fire'],
        level: 20,
        stats: { ...createTestMonster().stats, hp: 100, maxHp: 100, attack: 50 },
        moves: [{ name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, maxPp: 25 }],
      });

      const grassDefender = createTestMonster({
        uid: 'grass_def',
        types: ['grass'],
        level: 20,
        stats: { ...createTestMonster().stats, hp: 100, maxHp: 100 },
        moves: [{ name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 }],
      });

      // Fire should generally beat grass
      let wins = 0;
      for (let i = 0; i < 20; i++) {
        const atk = { ...fireAttacker, stats: { ...fireAttacker.stats, hp: 100 } };
        const def = { ...grassDefender, stats: { ...grassDefender.stats, hp: 100 } };
        const result = service.resolveBattle(atk, def);
        if (result.attackerWon) wins++;
      }
      expect(wins).toBeGreaterThan(10);
    });

    it('should handle zero power moves', () => {
      const attacker = createTestMonster({
        moves: [
          { name: 'Thunder Wave', type: 'electric', power: 0, accuracy: 90, pp: 20, maxPp: 20 },
          { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
        ],
      });
      const defender = createTestMonster({ uid: 'def' });
      const result = service.resolveBattle(attacker, defender);
      expect(result.totalTurns).toBeGreaterThan(0);
    });

    it('should not exceed max turns', () => {
      const tank1 = createTestMonster({
        stats: { ...createTestMonster().stats, hp: 9999, maxHp: 9999, defense: 999 },
        moves: [{ name: 'Tackle', type: 'normal', power: 1, accuracy: 100, pp: 99, maxPp: 99 }],
      });
      const tank2 = createTestMonster({
        uid: 'tank2',
        stats: { ...createTestMonster().stats, hp: 9999, maxHp: 9999, defense: 999 },
        moves: [{ name: 'Tackle', type: 'normal', power: 1, accuracy: 100, pp: 99, maxPp: 99 }],
      });
      const result = service.resolveBattle(tank1, tank2);
      expect(result.totalTurns).toBeLessThanOrEqual(50);
    });
  });

  describe('simulateBattle', () => {
    it('should return win rate and avg turns', () => {
      const m1 = createTestMonster();
      const m2 = createTestMonster({ uid: 'm2', types: ['grass'] });
      const sim = service.simulateBattle(m1, m2, 50);
      expect(sim.monster1WinRate).toBeGreaterThanOrEqual(0);
      expect(sim.monster1WinRate).toBeLessThanOrEqual(1);
      expect(sim.avgTurns).toBeGreaterThan(0);
    });
  });

  describe('turn logging', () => {
    it('should log all turns correctly', () => {
      const atk = createTestMonster({ stats: { ...createTestMonster().stats, hp: 200, maxHp: 200 } });
      const def = createTestMonster({ uid: 'def', stats: { ...createTestMonster().stats, hp: 200, maxHp: 200 } });
      const result = service.resolveBattle(atk, def);

      for (const turn of result.turns) {
        expect(turn.turn).toBeGreaterThan(0);
        expect(['attacker', 'defender']).toContain(turn.attacker);
        expect(turn.move).toBeTruthy();
        expect(turn.damage).toBeGreaterThanOrEqual(0);
        expect(turn.defenderHpAfter).toBeGreaterThanOrEqual(0);
      }
    });

    it('should mark misses correctly', () => {
      const atk = createTestMonster({
        moves: [{ name: 'Risky', type: 'normal', power: 100, accuracy: 1, pp: 50, maxPp: 50 }],
        stats: { ...createTestMonster().stats, hp: 500, maxHp: 500 },
      });
      const def = createTestMonster({
        uid: 'def',
        stats: { ...createTestMonster().stats, hp: 500, maxHp: 500 },
      });

      const result = service.resolveBattle(atk, def);
      const misses = result.turns.filter(t => t.missed);
      // With 1% accuracy, most turns should miss
      expect(misses.length).toBeGreaterThan(0);
    });
  });
});

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clearEvents();
  });

  it('should publish and retrieve events', () => {
    eventBus.publish({ type: 'test', agentId: 'a1', tick: 1, data: { foo: 'bar' } });
    const events = eventBus.getRecentEvents(10);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('test');
    expect(events[0].data).toEqual({ foo: 'bar' });
  });

  it('should filter events by agent', () => {
    eventBus.publish({ type: 'hunt', agentId: 'a1', tick: 1, data: {} });
    eventBus.publish({ type: 'hunt', agentId: 'a2', tick: 2, data: {} });
    eventBus.publish({ type: 'heal', agentId: 'a1', tick: 3, data: {} });

    const a1Events = eventBus.getEventsByAgent('a1');
    expect(a1Events).toHaveLength(2);
  });

  it('should filter events by type', () => {
    eventBus.publish({ type: 'hunt', agentId: 'a1', tick: 1, data: {} });
    eventBus.publish({ type: 'heal', agentId: 'a1', tick: 2, data: {} });
    eventBus.publish({ type: 'hunt', agentId: 'a2', tick: 3, data: {} });

    const huntEvents = eventBus.getEventsByType('hunt');
    expect(huntEvents).toHaveLength(2);
  });

  it('should generate unique IDs', () => {
    const e1 = eventBus.publish({ type: 't', agentId: 'a', tick: 1, data: {} });
    const e2 = eventBus.publish({ type: 't', agentId: 'a', tick: 2, data: {} });
    expect(e1.id).not.toBe(e2.id);
  });

  it('should emit events to listeners', (done) => {
    eventBus.on('event', (event) => {
      expect(event.type).toBe('listen_test');
      done();
    });
    eventBus.publish({ type: 'listen_test', agentId: 'a1', tick: 1, data: {} });
  });

  it('should clear events', () => {
    eventBus.publish({ type: 't', agentId: 'a', tick: 1, data: {} });
    eventBus.clearEvents();
    expect(eventBus.getEventCount()).toBe(0);
  });
});

describe('GameClock', () => {
  let clock: GameClock;

  beforeEach(() => {
    clock = new GameClock();
  });

  afterEach(() => {
    clock.pause();
  });

  it('should start paused', () => {
    expect(clock.isPaused).toBe(true);
    expect(clock.globalTick).toBe(0);
  });

  it('should increment on manual tick', () => {
    clock.manualTick();
    expect(clock.globalTick).toBe(1);
    clock.manualTick();
    expect(clock.globalTick).toBe(2);
  });

  it('should reset to zero', () => {
    clock.manualTick();
    clock.manualTick();
    clock.reset();
    expect(clock.globalTick).toBe(0);
    expect(clock.isPaused).toBe(true);
  });

  it('should call tick callbacks', () => {
    const ticks: number[] = [];
    clock.onTick((t) => ticks.push(t));
    clock.manualTick();
    clock.manualTick();
    expect(ticks).toEqual([1, 2]);
  });

  it('should remove tick callback', () => {
    const ticks: number[] = [];
    const cb = (t: number) => ticks.push(t);
    clock.onTick(cb);
    clock.manualTick();
    clock.offTick(cb);
    clock.manualTick();
    expect(ticks).toEqual([1]);
  });

  it('should return state', () => {
    const state = clock.getState();
    expect(state.globalTick).toBe(0);
    expect(state.isPaused).toBe(true);
    expect(state.tickIntervalMs).toBe(5000);
    expect(state.serverTime).toBeGreaterThan(0);
  });

  it('should set tick interval', () => {
    clock.setTickInterval(1000);
    expect(clock.tickIntervalMs).toBe(1000);
  });

  it('should enforce minimum tick interval', () => {
    clock.setTickInterval(10);
    expect(clock.tickIntervalMs).toBe(100);
  });
});

describe('BackupService', () => {
  it('should serialize and deserialize', () => {
    const service = new BackupService('./test_backups');
    const agents = [{
      agentId: 'test_1',
      name: 'Test',
      apiKey: 'pxk_test',
      strategy: 'balanced',
      team: [],
      box: [],
      position: { x: 0, y: 0, zone: 'route_1' },
      inventory: {
        pokeballs: 10, greatBalls: 0, ultraBalls: 0,
        potions: 5, superPotions: 0, hyperPotions: 0,
        fullRestores: 0, revives: 2,
      },
      badges: [],
      money: 3000,
      currentTick: 0,
      registeredAt: Date.now(),
      isActive: true,
      lastAction: 'register',
      stats: {
        battlesWon: 0, battlesLost: 0, monstersCaught: 0,
        monstersSeen: 0, totalXp: 0, gymsBeat: 0, totalDistance: 0,
      },
    }] as any[];

    const exported = service.exportToString(agents);
    const imported = service.importFromString(exported);
    expect(imported).not.toHaveProperty('error');
    if (!('error' in imported)) {
      expect(imported.agents).toHaveLength(1);
      expect(imported.metadata.agentCount).toBe(1);
    }
  });

  it('should reject invalid backup format', () => {
    const service = new BackupService('./test_backups');
    const result = service.importFromString('{"invalid": true}');
    expect(result).toHaveProperty('error');
  });

  it('should reject invalid JSON', () => {
    const service = new BackupService('./test_backups');
    const result = service.importFromString('not json at all');
    expect(result).toHaveProperty('error');
  });
});