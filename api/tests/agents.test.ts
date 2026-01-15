/**
 * Tests for PXMON Agent API endpoints.
 */

import { AgentService, AgentRecord } from '../src/services/agent-service';
import { eventBus } from '../src/services/event-bus';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService();
    eventBus.clearEvents();
  });

  describe('register', () => {
    it('should create a new agent with starter', () => {
      const result = service.register('TestBot', 'balanced', 'flamelet');
      expect(result).not.toHaveProperty('error');
      const agent = result as AgentRecord;
      expect(agent.agentId).toMatch(/^agent_/);
      expect(agent.apiKey).toMatch(/^pxk_/);
      expect(agent.name).toBe('TestBot');
      expect(agent.strategy).toBe('balanced');
      expect(agent.team).toHaveLength(1);
      expect(agent.team[0].speciesId).toBe('flamelet');
      expect(agent.team[0].level).toBe(5);
    });

    it('should reject unknown strategy', () => {
      const result = service.register('Bot', 'unknown_strat');
      expect(result).toHaveProperty('error');
    });

    it('should reject unknown starter species', () => {
      const result = service.register('Bot', 'balanced', 'pikachu');
      expect(result).toHaveProperty('error');
    });

    it('should register with all valid starters', () => {
      const starters = ['flamelet', 'tidalin', 'sproutix', 'zappik', 'rockpup', 'phantling'];
      for (const starter of starters) {
        const result = service.register(`Bot_${starter}`, 'balanced', starter);
        expect(result).not.toHaveProperty('error');
      }
    });

    it('should register with all valid strategies', () => {
      const strategies = ['aggressive', 'balanced', 'collector', 'speedrunner'];
      for (const strat of strategies) {
        const result = service.register(`Bot_${strat}`, strat);
        expect(result).not.toHaveProperty('error');
      }
    });

    it('should generate unique IDs', () => {
      const a1 = service.register('Bot1', 'balanced') as AgentRecord;
      const a2 = service.register('Bot2', 'balanced') as AgentRecord;
      expect(a1.agentId).not.toBe(a2.agentId);
      expect(a1.apiKey).not.toBe(a2.apiKey);
    });

    it('should set initial inventory', () => {
      const agent = service.register('Bot', 'balanced') as AgentRecord;
      expect(agent.inventory.pokeballs).toBe(10);
      expect(agent.inventory.potions).toBe(5);
      expect(agent.inventory.revives).toBe(2);
    });

    it('should publish registration event', () => {
      service.register('Bot', 'balanced');
      const events = eventBus.getRecentEvents(10);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('agent_registered');
    });
  });

  describe('getAgent', () => {
    it('should retrieve registered agent', () => {
      const registered = service.register('TestBot', 'balanced') as AgentRecord;
      const agent = service.getAgent(registered.agentId);
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('TestBot');
    });

    it('should return undefined for unknown agent', () => {
      expect(service.getAgent('nonexistent')).toBeUndefined();
    });
  });

  describe('getAgentByApiKey', () => {
    it('should find agent by API key', () => {
      const registered = service.register('Bot', 'balanced') as AgentRecord;
      const agent = service.getAgentByApiKey(registered.apiKey);
      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe(registered.agentId);
    });

    it('should return undefined for invalid key', () => {
      expect(service.getAgentByApiKey('invalid_key')).toBeUndefined();
    });
  });

  describe('hunt', () => {
    let agent: AgentRecord;

    beforeEach(() => {
      agent = service.register('Hunter', 'aggressive') as AgentRecord;
    });

    it('should return battle result', () => {
      const result = service.hunt(agent.agentId);
      expect(result).toHaveProperty('result');
    });

    it('should update battle stats', () => {
      service.hunt(agent.agentId);
      const updated = service.getAgent(agent.agentId)!;
      expect(updated.stats.battlesWon + updated.stats.battlesLost).toBeGreaterThan(0);
    });

    it('should increment tick', () => {
      service.hunt(agent.agentId);
      const updated = service.getAgent(agent.agentId)!;
      expect(updated.currentTick).toBeGreaterThan(0);
    });

    it('should return error for unknown agent', () => {
      const result = service.hunt('fake_id');
      expect(result).toHaveProperty('error');
    });

    it('should return no_encounters in town', () => {
      const a = service.getAgent(agent.agentId)!;
      a.position.zone = 'town_1';
      const result = service.hunt(agent.agentId);
      expect(result.result).toBe('no_encounters');
    });

    it('should increment monsters seen', () => {
      const before = service.getAgent(agent.agentId)!.stats.monstersSeen;
      service.hunt(agent.agentId);
      const after = service.getAgent(agent.agentId)!.stats.monstersSeen;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('heal', () => {
    let agent: AgentRecord;

    beforeEach(() => {
      agent = service.register('Healer', 'balanced') as AgentRecord;
    });

    it('should heal team with potions', () => {
      agent.team[0].stats.hp = 1;
      const result = service.heal(agent.agentId);
      expect(result.result).toBe('healed');
      expect(result.actions).toBeDefined();
    });

    it('should heal at center for full restore', () => {
      agent.team[0].stats.hp = 1;
      agent.team[0].status = 'burn';
      const result = service.healCenter(agent.agentId);
      expect(result.result).toBe('healed_at_center');
      expect(agent.team[0].stats.hp).toBe(agent.team[0].stats.maxHp);
      expect(agent.team[0].status).toBeNull();
    });

    it('should revive fainted monsters', () => {
      agent.team[0].stats.hp = 0;
      const result = service.heal(agent.agentId);
      expect(result.result).toBe('healed');
      expect(agent.team[0].stats.hp).toBeGreaterThan(0);
    });
  });

  describe('gym challenge', () => {
    let agent: AgentRecord;

    beforeEach(() => {
      agent = service.register('Challenger', 'aggressive') as AgentRecord;
      agent.team[0].level = 20;
      agent.team[0].stats.hp = 100;
      agent.team[0].stats.maxHp = 100;
      agent.team[0].stats.attack = 50;
      agent.team[0].stats.defense = 50;
    });

    it('should challenge gym and return result', () => {
      const result = service.gymChallenge(agent.agentId, 'gym_1');
      expect(result.gymId).toBe('gym_1');
      expect(['gym_won', 'gym_lost']).toContain(result.result);
    });

    it('should reject unknown gym', () => {
      const result = service.gymChallenge(agent.agentId, 'gym_99');
      expect(result).toHaveProperty('error');
    });

    it('should prevent double badge', () => {
      agent.badges.push({ gymId: 'gym_1', badgeName: 'Boulder Badge', earnedAtTick: 0 });
      const result = service.gymChallenge(agent.agentId, 'gym_1');
      expect(result).toHaveProperty('error');
    });
  });

  describe('move', () => {
    let agent: AgentRecord;

    beforeEach(() => {
      agent = service.register('Mover', 'balanced') as AgentRecord;
    });

    it('should move to adjacent zone', () => {
      const result = service.moveAgent(agent.agentId, 'route_2');
      expect(result.result).toBe('moved');
      expect(service.getAgent(agent.agentId)!.position.zone).toBe('route_2');
    });

    it('should reject non-adjacent zone', () => {
      const result = service.moveAgent(agent.agentId, 'route_3');
      expect(result).toHaveProperty('error');
    });

    it('should increment distance', () => {
      service.moveAgent(agent.agentId, 'route_2');
      expect(service.getAgent(agent.agentId)!.stats.totalDistance).toBe(1);
    });
  });

  describe('tick', () => {
    it('should execute autonomous action', () => {
      const agent = service.register('Ticker', 'balanced') as AgentRecord;
      const result = service.tick(agent.agentId);
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('error');
    });

    it('should heal when team is wiped', () => {
      const agent = service.register('Ticker', 'balanced') as AgentRecord;
      agent.team[0].stats.hp = 0;
      const result = service.tick(agent.agentId);
      expect(result.result).toBe('healed_at_center');
    });
  });

  describe('leaderboard', () => {
    it('should return sorted leaderboard', () => {
      service.register('Bot1', 'aggressive');
      service.register('Bot2', 'balanced');
      service.register('Bot3', 'collector');
      const lb = service.getLeaderboard();
      expect(lb).toHaveLength(3);
      for (let i = 1; i < lb.length; i++) {
        expect(lb[i - 1].score).toBeGreaterThanOrEqual(lb[i].score);
      }
    });

    it('should calculate score correctly', () => {
      const agent = service.register('Scorer', 'balanced') as AgentRecord;
      agent.badges.push({ gymId: 'gym_1', badgeName: 'Test', earnedAtTick: 0 });
      agent.stats.battlesWon = 10;
      const lb = service.getLeaderboard();
      const entry = lb.find(e => e.agentId === agent.agentId);
      expect(entry).toBeDefined();
      expect(entry!.score).toBeGreaterThan(0);
      expect(entry!.badges).toBe(1);
    });
  });

  describe('backup/restore', () => {
    it('should export all data', () => {
      service.register('Bot1', 'balanced');
      service.register('Bot2', 'aggressive');
      const data = service.exportAllData();
      expect(data).toHaveLength(2);
    });

    it('should import data', () => {
      const agent = service.register('Bot', 'balanced') as AgentRecord;
      const exported = service.exportAllData();
      const newService = new AgentService();
      const imported = newService.importData(exported);
      expect(imported).toBe(1);
      expect(newService.getAgent(agent.agentId)).toBeDefined();
    });
  });
});