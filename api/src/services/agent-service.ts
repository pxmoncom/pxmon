/**
 * Agent business logic - manages agent state, registration, actions.
 */

import { v4 as uuidv4 } from 'uuid';
import { eventBus } from './event-bus';
import { BattleService, BattleOutcome } from './battle-service';

export interface MonsterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface MonsterMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
}

export interface Monster {
  uid: string;
  speciesId: string;
  nickname: string | null;
  level: number;
  xp: number;
  stats: MonsterStats;
  moves: MonsterMove[];
  types: string[];
  status: string | null;
  isShiny: boolean;
}

export interface AgentInventory {
  pokeballs: number;
  greatBalls: number;
  ultraBalls: number;
  potions: number;
  superPotions: number;
  hyperPotions: number;
  fullRestores: number;
  revives: number;
}

export interface AgentBadge {
  gymId: string;
  badgeName: string;
  earnedAtTick: number;
}

export interface AgentRecord {
  agentId: string;
  name: string;
  apiKey: string;
  strategy: string;
  team: Monster[];
  box: Monster[];
  position: { x: number; y: number; zone: string };
  inventory: AgentInventory;
  badges: AgentBadge[];
  money: number;
  currentTick: number;
  registeredAt: number;
  isActive: boolean;
  lastAction: string;
  stats: {
    battlesWon: number;
    battlesLost: number;
    monstersCaught: number;
    monstersSeen: number;
    totalXp: number;
    gymsBeat: number;
    totalDistance: number;
  };
}

const SPECIES_DATA: Record<string, {
  name: string;
  types: string[];
  baseStats: MonsterStats;
  baseXpYield: number;
  catchRate: number;
  moves: Record<number, MonsterMove>;
}> = {
  flamelet: {
    name: 'Flamelet',
    types: ['fire'],
    baseStats: { hp: 45, maxHp: 45, attack: 60, defense: 40, spAttack: 70, spDefense: 50, speed: 65 },
    baseXpYield: 64,
    catchRate: 45,
    moves: {
      1: { name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, maxPp: 25 },
      5: { name: 'Scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
      9: { name: 'Smokescreen', type: 'normal', power: 0, accuracy: 100, pp: 20, maxPp: 20 },
      13: { name: 'Flame Charge', type: 'fire', power: 50, accuracy: 100, pp: 20, maxPp: 20 },
    },
  },
  tidalin: {
    name: 'Tidalin',
    types: ['water'],
    baseStats: { hp: 50, maxHp: 50, attack: 50, defense: 65, spAttack: 55, spDefense: 65, speed: 45 },
    baseXpYield: 64,
    catchRate: 45,
    moves: {
      1: { name: 'Water Gun', type: 'water', power: 40, accuracy: 100, pp: 25, maxPp: 25 },
      5: { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
      9: { name: 'Bubble', type: 'water', power: 40, accuracy: 100, pp: 30, maxPp: 30 },
      13: { name: 'Aqua Jet', type: 'water', power: 40, accuracy: 100, pp: 20, maxPp: 20 },
    },
  },
  sproutix: {
    name: 'Sproutix',
    types: ['grass'],
    baseStats: { hp: 55, maxHp: 55, attack: 50, defense: 55, spAttack: 65, spDefense: 55, speed: 50 },
    baseXpYield: 64,
    catchRate: 45,
    moves: {
      1: { name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, maxPp: 25 },
      5: { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
      9: { name: 'Leech Seed', type: 'grass', power: 0, accuracy: 90, pp: 10, maxPp: 10 },
      13: { name: 'Razor Leaf', type: 'grass', power: 55, accuracy: 95, pp: 25, maxPp: 25 },
    },
  },
  zappik: {
    name: 'Zappik',
    types: ['electric'],
    baseStats: { hp: 35, maxHp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 },
    baseXpYield: 112,
    catchRate: 190,
    moves: {
      1: { name: 'Thunder Shock', type: 'electric', power: 40, accuracy: 100, pp: 30, maxPp: 30 },
      5: { name: 'Quick Attack', type: 'normal', power: 40, accuracy: 100, pp: 30, maxPp: 30 },
      9: { name: 'Spark', type: 'electric', power: 65, accuracy: 100, pp: 20, maxPp: 20 },
      13: { name: 'Thunder Wave', type: 'electric', power: 0, accuracy: 90, pp: 20, maxPp: 20 },
    },
  },
  rockpup: {
    name: 'Rockpup',
    types: ['rock', 'ground'],
    baseStats: { hp: 60, maxHp: 60, attack: 70, defense: 80, spAttack: 30, spDefense: 45, speed: 35 },
    baseXpYield: 75,
    catchRate: 120,
    moves: {
      1: { name: 'Rock Throw', type: 'rock', power: 50, accuracy: 90, pp: 15, maxPp: 15 },
      5: { name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 35 },
      9: { name: 'Harden', type: 'normal', power: 0, accuracy: 100, pp: 30, maxPp: 30 },
      13: { name: 'Rock Slide', type: 'rock', power: 75, accuracy: 90, pp: 10, maxPp: 10 },
    },
  },
  phantling: {
    name: 'Phantling',
    types: ['ghost'],
    baseStats: { hp: 40, maxHp: 40, attack: 35, defense: 30, spAttack: 80, spDefense: 70, speed: 75 },
    baseXpYield: 95,
    catchRate: 80,
    moves: {
      1: { name: 'Shadow Ball', type: 'ghost', power: 80, accuracy: 100, pp: 15, maxPp: 15 },
      5: { name: 'Lick', type: 'ghost', power: 30, accuracy: 100, pp: 30, maxPp: 30 },
      9: { name: 'Hypnosis', type: 'psychic', power: 0, accuracy: 60, pp: 20, maxPp: 20 },
      13: { name: 'Curse', type: 'ghost', power: 0, accuracy: 100, pp: 10, maxPp: 10 },
    },
  },
};

const ZONE_ENCOUNTERS: Record<string, Array<{ speciesId: string; minLevel: number; maxLevel: number; weight: number }>> = {
  route_1: [
    { speciesId: 'zappik', minLevel: 3, maxLevel: 7, weight: 0.35 },
    { speciesId: 'rockpup', minLevel: 3, maxLevel: 6, weight: 0.30 },
    { speciesId: 'sproutix', minLevel: 4, maxLevel: 7, weight: 0.20 },
    { speciesId: 'phantling', minLevel: 5, maxLevel: 8, weight: 0.15 },
  ],
  route_2: [
    { speciesId: 'flamelet', minLevel: 8, maxLevel: 14, weight: 0.25 },
    { speciesId: 'tidalin', minLevel: 8, maxLevel: 14, weight: 0.25 },
    { speciesId: 'zappik', minLevel: 10, maxLevel: 15, weight: 0.20 },
    { speciesId: 'rockpup', minLevel: 10, maxLevel: 16, weight: 0.15 },
    { speciesId: 'phantling', minLevel: 12, maxLevel: 18, weight: 0.15 },
  ],
  route_3: [
    { speciesId: 'flamelet', minLevel: 15, maxLevel: 22, weight: 0.20 },
    { speciesId: 'tidalin', minLevel: 15, maxLevel: 22, weight: 0.20 },
    { speciesId: 'sproutix', minLevel: 15, maxLevel: 22, weight: 0.20 },
    { speciesId: 'zappik', minLevel: 18, maxLevel: 25, weight: 0.15 },
    { speciesId: 'rockpup', minLevel: 18, maxLevel: 25, weight: 0.15 },
    { speciesId: 'phantling', minLevel: 20, maxLevel: 28, weight: 0.10 },
  ],
};

const ZONE_CONNECTIONS: Record<string, string[]> = {
  route_1: ['route_2', 'town_1'],
  route_2: ['route_1', 'route_3', 'town_2'],
  route_3: ['route_2', 'town_3'],
  town_1: ['route_1'],
  town_2: ['route_2'],
  town_3: ['route_3'],
};

export class AgentService {
  private agents: Map<string, AgentRecord> = new Map();
  private apiKeyIndex: Map<string, string> = new Map(); // apiKey -> agentId
  private battleService: BattleService;
  private rngState: number = Date.now();

  constructor() {
    this.battleService = new BattleService();
  }

  private nextRandom(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (this.rngState >>> 0) / 0xFFFFFFFF;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.nextRandom() * (max - min + 1)) + min;
  }

  private calcStat(base: number, iv: number, ev: number, level: number, isHp: boolean): number {
    const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
    return isHp ? core + level + 10 : core + 5;
  }

  private createMonster(speciesId: string, level: number): Monster {
    const species = SPECIES_DATA[speciesId];
    if (!species) throw new Error(`Unknown species: ${speciesId}`);

    const iv = () => this.randomInt(0, 31);
    const ivs = { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv() };

    const hp = this.calcStat(species.baseStats.hp, ivs.hp, 0, level, true);
    const moves: MonsterMove[] = [];
    const sortedLevels = Object.keys(species.moves).map(Number).sort((a, b) => a - b);
    for (const lv of sortedLevels) {
      if (lv <= level) {
        moves.push({ ...species.moves[lv] });
      }
    }
    const finalMoves = moves.slice(-4);

    return {
      uid: `mon_${uuidv4().slice(0, 8)}`,
      speciesId,
      nickname: null,
      level,
      xp: level * level * level,
      stats: {
        hp,
        maxHp: hp,
        attack: this.calcStat(species.baseStats.attack, ivs.atk, 0, level, false),
        defense: this.calcStat(species.baseStats.defense, ivs.def, 0, level, false),
        spAttack: this.calcStat(species.baseStats.spAttack, ivs.spa, 0, level, false),
        spDefense: this.calcStat(species.baseStats.spDefense, ivs.spd, 0, level, false),
        speed: this.calcStat(species.baseStats.speed, ivs.spe, 0, level, false),
      },
      moves: finalMoves,
      types: [...species.types],
      status: null,
      isShiny: this.randomInt(1, 4096) === 1,
    };
  }

  register(name: string, strategy: string, starterSpecies: string = 'flamelet'): AgentRecord | { error: string } {
    if (!SPECIES_DATA[starterSpecies]) {
      return { error: `Unknown starter species: ${starterSpecies}` };
    }
    if (!['aggressive', 'balanced', 'collector', 'speedrunner'].includes(strategy)) {
      return { error: `Unknown strategy: ${strategy}` };
    }

    const agentId = `agent_${uuidv4().slice(0, 8)}`;
    const apiKey = `pxk_${uuidv4().replace(/-/g, '')}`;
    const starter = this.createMonster(starterSpecies, 5);
    starter.uid = `mon_${uuidv4().slice(0, 8)}`;

    const agent: AgentRecord = {
      agentId,
      name,
      apiKey,
      strategy,
      team: [starter],
      box: [],
      position: { x: 0, y: 0, zone: 'route_1' },
      inventory: {
        pokeballs: 10,
        greatBalls: 0,
        ultraBalls: 0,
        potions: 5,
        superPotions: 0,
        hyperPotions: 0,
        fullRestores: 0,
        revives: 2,
      },
      badges: [],
      money: 3000,
      currentTick: 0,
      registeredAt: Date.now(),
      isActive: true,
      lastAction: 'register',
      stats: {
        battlesWon: 0,
        battlesLost: 0,
        monstersCaught: 1,
        monstersSeen: 1,
        totalXp: 0,
        gymsBeat: 0,
        totalDistance: 0,
      },
    };

    this.agents.set(agentId, agent);
    this.apiKeyIndex.set(apiKey, agentId);

    eventBus.publish({
      type: 'agent_registered',
      agentId,
      tick: 0,
      data: { name, strategy, starter: starterSpecies },
    });

    return agent;
  }

  getAgent(agentId: string): AgentRecord | undefined {
    return this.agents.get(agentId);
  }

  getAgentByApiKey(apiKey: string): AgentRecord | undefined {
    const agentId = this.apiKeyIndex.get(apiKey);
    if (!agentId) return undefined;
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  hunt(agentId: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    const lead = agent.team.find(m => m.stats.hp > 0);
    if (!lead) return { error: 'No usable monsters', result: 'no_usable_monsters' };

    const zone = agent.position.zone;
    const encounters = ZONE_ENCOUNTERS[zone];
    if (!encounters || encounters.length === 0) {
      agent.lastAction = 'hunt';
      return { result: 'no_encounters', zone };
    }

    // Pick encounter
    const roll = this.nextRandom();
    let cumulative = 0;
    let chosen = encounters[0];
    for (const enc of encounters) {
      cumulative += enc.weight;
      if (roll < cumulative) {
        chosen = enc;
        break;
      }
    }

    const wildLevel = this.randomInt(chosen.minLevel, chosen.maxLevel);
    const wildMonster = this.createMonster(chosen.speciesId, wildLevel);
    agent.stats.monstersSeen++;

    // Battle
    const outcome = this.battleService.resolveBattle(lead, wildMonster);

    if (outcome.attackerWon) {
      agent.stats.battlesWon++;
      const xpGained = this.calculateXpGain(lead.level, wildMonster.level, SPECIES_DATA[chosen.speciesId]?.baseXpYield ?? 64);
      lead.xp += xpGained;
      agent.stats.totalXp += xpGained;

      const newLevel = this.levelFromXp(lead.xp);
      if (newLevel > lead.level) {
        lead.level = newLevel;
        this.recalcStats(lead);
      }

      agent.money += wildLevel * 8;
    } else {
      agent.stats.battlesLost++;
    }

    agent.lastAction = 'hunt';
    agent.currentTick++;

    eventBus.publish({
      type: 'hunt',
      agentId,
      tick: agent.currentTick,
      data: {
        wild: { species: chosen.speciesId, level: wildLevel },
        won: outcome.attackerWon,
        turns: outcome.totalTurns,
      },
    });

    return {
      result: 'battle',
      wild: { speciesId: chosen.speciesId, level: wildLevel, isShiny: wildMonster.isShiny },
      won: outcome.attackerWon,
      turns: outcome.totalTurns,
      xpGained: outcome.attackerWon ? agent.stats.totalXp : 0,
    };
  }

  heal(agentId: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    const actions: Array<{ uid: string; action: string; amount: number }> = [];

    // Revive fainted
    for (const mon of agent.team) {
      if (mon.stats.hp <= 0 && agent.inventory.revives > 0) {
        agent.inventory.revives--;
        mon.stats.hp = Math.floor(mon.stats.maxHp / 2);
        mon.status = null;
        actions.push({ uid: mon.uid, action: 'revive', amount: mon.stats.hp });
      }
    }

    // Heal damaged
    for (const mon of agent.team) {
      if (mon.stats.hp <= 0 || mon.stats.hp >= mon.stats.maxHp) continue;

      const healItems: Array<{ key: keyof AgentInventory; name: string; amount: number }> = [
        { key: 'fullRestores', name: 'full_restore', amount: 9999 },
        { key: 'hyperPotions', name: 'hyper_potion', amount: 120 },
        { key: 'superPotions', name: 'super_potion', amount: 60 },
        { key: 'potions', name: 'potion', amount: 20 },
      ];

      for (const item of healItems) {
        if (mon.stats.hp >= mon.stats.maxHp) break;
        const count = agent.inventory[item.key] as number;
        if (count > 0) {
          (agent.inventory[item.key] as number)--;
          const healed = Math.min(item.amount, mon.stats.maxHp - mon.stats.hp);
          mon.stats.hp = Math.min(mon.stats.hp + item.amount, mon.stats.maxHp);
          if (item.name === 'full_restore') mon.status = null;
          actions.push({ uid: mon.uid, action: item.name, amount: healed });
        }
      }
    }

    agent.lastAction = 'heal';
    agent.currentTick++;

    eventBus.publish({
      type: 'heal',
      agentId,
      tick: agent.currentTick,
      data: { actions: actions.length },
    });

    return { result: 'healed', actions, teamHpPct: this.teamHpPct(agent) };
  }

  healCenter(agentId: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    for (const mon of agent.team) {
      mon.stats.hp = mon.stats.maxHp;
      mon.status = null;
      for (const move of mon.moves) {
        move.pp = move.maxPp;
      }
    }

    agent.lastAction = 'heal_center';
    agent.currentTick++;

    eventBus.publish({
      type: 'heal_center',
      agentId,
      tick: agent.currentTick,
      data: {},
    });

    return { result: 'healed_at_center', teamHpPct: 100 };
  }

  gymChallenge(agentId: string, gymId: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    const gymData: Record<string, { name: string; type: string; badge: string; leaderLevel: number; teamSize: number }> = {
      gym_1: { name: 'Stone Gym', type: 'rock', badge: 'Boulder Badge', leaderLevel: 14, teamSize: 2 },
      gym_2: { name: 'Tide Gym', type: 'water', badge: 'Cascade Badge', leaderLevel: 20, teamSize: 3 },
      gym_3: { name: 'Volt Gym', type: 'electric', badge: 'Thunder Badge', leaderLevel: 26, teamSize: 3 },
      gym_4: { name: 'Thorn Gym', type: 'grass', badge: 'Leaf Badge', leaderLevel: 32, teamSize: 3 },
      gym_5: { name: 'Brawl Gym', type: 'fighting', badge: 'Fist Badge', leaderLevel: 38, teamSize: 4 },
      gym_6: { name: 'Mind Gym', type: 'psychic', badge: 'Mind Badge', leaderLevel: 42, teamSize: 4 },
      gym_7: { name: 'Frost Gym', type: 'ice', badge: 'Glacier Badge', leaderLevel: 48, teamSize: 5 },
      gym_8: { name: 'Scale Gym', type: 'dragon', badge: 'Dragon Badge', leaderLevel: 55, teamSize: 5 },
    };

    const gym = gymData[gymId];
    if (!gym) return { error: `Unknown gym: ${gymId}` };
    if (agent.badges.find(b => b.gymId === gymId)) return { error: 'Already have this badge' };

    const typeToSpecies: Record<string, string> = {
      rock: 'rockpup', water: 'tidalin', electric: 'zappik',
      grass: 'sproutix', fire: 'flamelet', ghost: 'phantling',
    };

    const gymSpecies = typeToSpecies[gym.type] || 'rockpup';
    let wins = 0;
    let totalXp = 0;

    for (let i = 0; i < gym.teamSize; i++) {
      const gymLevel = Math.max(5, gym.leaderLevel - (gym.teamSize - 1 - i) * 2);
      const gymMon = this.createMonster(gymSpecies, gymLevel);

      const lead = agent.team.find(m => m.stats.hp > 0);
      if (!lead) break;

      const outcome = this.battleService.resolveBattle(lead, gymMon);
      if (outcome.attackerWon) {
        wins++;
        const xp = this.calculateXpGain(lead.level, gymLevel, SPECIES_DATA[gymSpecies]?.baseXpYield ?? 64);
        lead.xp += xp;
        totalXp += xp;
        const newLevel = this.levelFromXp(lead.xp);
        if (newLevel > lead.level) {
          lead.level = newLevel;
          this.recalcStats(lead);
        }
      }
    }

    const gymWon = wins === gym.teamSize;

    if (gymWon) {
      agent.badges.push({ gymId, badgeName: gym.badge, earnedAtTick: agent.currentTick });
      agent.stats.gymsBeat++;
      agent.stats.battlesWon += wins;
      agent.money += gym.leaderLevel * 50;
    } else {
      agent.stats.battlesLost += (gym.teamSize - wins);
      agent.stats.battlesWon += wins;
    }

    agent.lastAction = 'gym_challenge';
    agent.currentTick++;

    eventBus.publish({
      type: 'gym_challenge',
      agentId,
      tick: agent.currentTick,
      data: { gymId, won: gymWon, wins, badge: gymWon ? gym.badge : null },
    });

    return {
      result: gymWon ? 'gym_won' : 'gym_lost',
      gymId,
      gymName: gym.name,
      badge: gymWon ? gym.badge : null,
      battlesWon: wins,
      battlesTotal: gym.teamSize,
      xpGained: totalXp,
    };
  }

  moveAgent(agentId: string, targetZone: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    const connections = ZONE_CONNECTIONS[agent.position.zone];
    if (!connections || !connections.includes(targetZone)) {
      return { error: `Cannot move to ${targetZone}. Adjacent zones: ${connections?.join(', ') || 'none'}` };
    }

    const oldZone = agent.position.zone;
    agent.position.zone = targetZone;
    agent.position.x = 0;
    agent.position.y = 0;
    agent.stats.totalDistance++;
    agent.lastAction = 'move';
    agent.currentTick++;

    eventBus.publish({
      type: 'move',
      agentId,
      tick: agent.currentTick,
      data: { from: oldZone, to: targetZone },
    });

    return { result: 'moved', from: oldZone, to: targetZone };
  }

  tick(agentId: string): Record<string, unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) return { error: 'Agent not found' };

    const teamHp = this.teamHpPct(agent);
    const aliveCount = agent.team.filter(m => m.stats.hp > 0).length;

    if (aliveCount === 0) {
      return this.healCenter(agentId);
    }

    if (teamHp < 30) {
      return this.heal(agentId);
    }

    const avgLevel = agent.team.reduce((s, m) => s + m.level, 0) / agent.team.length;
    const nextGym = this.findNextGym(agent);

    if (nextGym && avgLevel >= nextGym.level - 2 && teamHp >= 60) {
      return this.gymChallenge(agentId, nextGym.id);
    }

    return this.hunt(agentId);
  }

  getLeaderboard(): Array<{
    agentId: string;
    name: string;
    strategy: string;
    badges: number;
    avgLevel: number;
    score: number;
    battlesWon: number;
    monstersCaught: number;
  }> {
    const entries = Array.from(this.agents.values()).map(agent => {
      const avgLevel = agent.team.length > 0
        ? agent.team.reduce((s, m) => s + m.level, 0) / agent.team.length
        : 0;
      const score = agent.badges.length * 1000 + avgLevel * 10 + agent.stats.battlesWon * 5 + agent.stats.monstersCaught * 3;
      return {
        agentId: agent.agentId,
        name: agent.name,
        strategy: agent.strategy,
        badges: agent.badges.length,
        avgLevel: Math.round(avgLevel * 10) / 10,
        score: Math.round(score),
        battlesWon: agent.stats.battlesWon,
        monstersCaught: agent.stats.monstersCaught,
      };
    });
    return entries.sort((a, b) => b.score - a.score);
  }

  exportAllData(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  importData(agents: AgentRecord[]): number {
    let imported = 0;
    for (const agent of agents) {
      if (agent.agentId && agent.name) {
        this.agents.set(agent.agentId, agent);
        this.apiKeyIndex.set(agent.apiKey, agent.agentId);
        imported++;
      }
    }
    return imported;
  }

  private teamHpPct(agent: AgentRecord): number {
    if (agent.team.length === 0) return 0;
    const currentHp = agent.team.reduce((s, m) => s + m.stats.hp, 0);
    const maxHp = agent.team.reduce((s, m) => s + m.stats.maxHp, 0);
    if (maxHp === 0) return 0;
    return (currentHp / maxHp) * 100;
  }

  private calculateXpGain(attackerLevel: number, defenderLevel: number, baseYield: number): number {
    const base = (baseYield * defenderLevel) / 5;
    const scale = (2 * defenderLevel + 10) / (defenderLevel + attackerLevel + 10);
    return Math.max(1, Math.floor(base * scale));
  }

  private levelFromXp(xp: number): number {
    let level = 1;
    while (level < 100 && (level + 1) ** 3 <= xp) {
      level++;
    }
    return level;
  }

  private recalcStats(mon: Monster): void {
    const species = SPECIES_DATA[mon.speciesId];
    if (!species) return;
    const b = species.baseStats;
    const lv = mon.level;
    const oldMaxHp = mon.stats.maxHp;
    mon.stats.maxHp = this.calcStat(b.hp, 15, 0, lv, true);
    mon.stats.hp = Math.min(mon.stats.hp + (mon.stats.maxHp - oldMaxHp), mon.stats.maxHp);
    mon.stats.attack = this.calcStat(b.attack, 15, 0, lv, false);
    mon.stats.defense = this.calcStat(b.defense, 15, 0, lv, false);
    mon.stats.spAttack = this.calcStat(b.spAttack, 15, 0, lv, false);
    mon.stats.spDefense = this.calcStat(b.spDefense, 15, 0, lv, false);
    mon.stats.speed = this.calcStat(b.speed, 15, 0, lv, false);
  }

  private findNextGym(agent: AgentRecord): { id: string; level: number } | null {
    const gymLevels: Record<string, number> = {
      gym_1: 14, gym_2: 20, gym_3: 26, gym_4: 32,
      gym_5: 38, gym_6: 42, gym_7: 48, gym_8: 55,
    };
    const gymOrder = ['gym_1', 'gym_2', 'gym_3', 'gym_4', 'gym_5', 'gym_6', 'gym_7', 'gym_8'];
    for (const gymId of gymOrder) {
      if (!agent.badges.find(b => b.gymId === gymId)) {
        return { id: gymId, level: gymLevels[gymId] };
      }
    }
    return null;
  }
}