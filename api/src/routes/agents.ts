/**
 * Agent API routes - register, status, hunt, heal, gym, move, tick.
 */

import { Router, Request, Response } from 'express';
import { AgentService } from '../services/agent-service';

export function createAgentRouter(agentService: AgentService): Router {
  const router = Router();

  /**
   * POST /api/agents/register
   * Register a new agent with a starter monster.
   */
  router.post('/register', (req: Request, res: Response): void => {
    const { name, strategy, starter } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required and must be a string' });
      return;
    }

    if (name.length < 2 || name.length > 32) {
      res.status(400).json({ error: 'Name must be 2-32 characters' });
      return;
    }

    if (!strategy || typeof strategy !== 'string') {
      res.status(400).json({ error: 'Strategy is required' });
      return;
    }

    const result = agentService.register(name, strategy, starter || 'flamelet');

    if ('error' in result) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json({
      agentId: result.agentId,
      apiKey: result.apiKey,
      name: result.name,
      strategy: result.strategy,
      starter: result.team[0] ? {
        uid: result.team[0].uid,
        species: result.team[0].speciesId,
        level: result.team[0].level,
      } : null,
      message: 'Agent registered. Save your API key - it cannot be recovered.',
    });
  });

  /**
   * GET /api/agents/:agentId
   * Get agent status and team info.
   */
  router.get('/:agentId', (req: Request, res: Response): void => {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const { apiKey, ...safeAgent } = agent;
    const teamHp = agent.team.reduce((s, m) => s + m.stats.hp, 0);
    const teamMaxHp = agent.team.reduce((s, m) => s + m.stats.maxHp, 0);
    const avgLevel = agent.team.length > 0
      ? agent.team.reduce((s, m) => s + m.level, 0) / agent.team.length
      : 0;

    res.json({
      ...safeAgent,
      summary: {
        teamHpPct: teamMaxHp > 0 ? Math.round((teamHp / teamMaxHp) * 1000) / 10 : 0,
        avgLevel: Math.round(avgLevel * 10) / 10,
        teamAlive: agent.team.filter(m => m.stats.hp > 0).length,
        winRate: (agent.stats.battlesWon + agent.stats.battlesLost) > 0
          ? Math.round((agent.stats.battlesWon / (agent.stats.battlesWon + agent.stats.battlesLost)) * 1000) / 10
          : 0,
      },
    });
  });

  /**
   * GET /api/agents
   * List all agents (summary only).
   */
  router.get('/', (_req: Request, res: Response): void => {
    const agents = agentService.getAllAgents();
    const summaries = agents.map(a => ({
      agentId: a.agentId,
      name: a.name,
      strategy: a.strategy,
      badges: a.badges.length,
      teamSize: a.team.length,
      avgLevel: a.team.length > 0
        ? Math.round((a.team.reduce((s, m) => s + m.level, 0) / a.team.length) * 10) / 10
        : 0,
      battlesWon: a.stats.battlesWon,
      isActive: a.isActive,
      lastAction: a.lastAction,
    }));
    res.json({ agents: summaries, total: summaries.length });
  });

  /**
   * POST /api/agents/:agentId/hunt
   * Trigger a hunt action for the agent.
   */
  router.post('/:agentId/hunt', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;
    if (req.agentId && req.agentId !== agentId) {
      res.status(403).json({ error: 'Cannot control another agent' });
      return;
    }

    const result = agentService.hunt(agentId);
    if ('error' in result && typeof result.error === 'string') {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  /**
   * POST /api/agents/:agentId/heal
   * Use healing items on the agent's team.
   */
  router.post('/:agentId/heal', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;
    if (req.agentId && req.agentId !== agentId) {
      res.status(403).json({ error: 'Cannot control another agent' });
      return;
    }

    const { center } = req.body || {};
    const result = center
      ? agentService.healCenter(agentId)
      : agentService.heal(agentId);

    if ('error' in result && typeof result.error === 'string') {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  /**
   * POST /api/agents/:agentId/gym
   * Challenge a gym.
   */
  router.post('/:agentId/gym', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;
    if (req.agentId && req.agentId !== agentId) {
      res.status(403).json({ error: 'Cannot control another agent' });
      return;
    }

    const { gymId } = req.body;
    if (!gymId || typeof gymId !== 'string') {
      res.status(400).json({ error: 'gymId is required' });
      return;
    }

    const result = agentService.gymChallenge(agentId, gymId);
    if ('error' in result && typeof result.error === 'string') {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  /**
   * POST /api/agents/:agentId/move
   * Move agent to an adjacent zone.
   */
  router.post('/:agentId/move', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;
    if (req.agentId && req.agentId !== agentId) {
      res.status(403).json({ error: 'Cannot control another agent' });
      return;
    }

    const { zone } = req.body;
    if (!zone || typeof zone !== 'string') {
      res.status(400).json({ error: 'zone is required' });
      return;
    }

    const result = agentService.moveAgent(agentId, zone);
    if ('error' in result && typeof result.error === 'string') {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  /**
   * POST /api/agents/:agentId/tick
   * Execute one autonomous tick for the agent.
   */
  router.post('/:agentId/tick', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;
    if (req.agentId && req.agentId !== agentId) {
      res.status(403).json({ error: 'Cannot control another agent' });
      return;
    }

    const result = agentService.tick(agentId);
    if ('error' in result && typeof result.error === 'string') {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  /**
   * GET /api/agents/:agentId/team
   * Get detailed team info.
   */
  router.get('/:agentId/team', (req: Request, res: Response): void => {
    const agent = agentService.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({
      team: agent.team.map((m, i) => ({
        slot: i,
        uid: m.uid,
        species: m.speciesId,
        nickname: m.nickname,
        level: m.level,
        hp: m.stats.hp,
        maxHp: m.stats.maxHp,
        hpPct: m.stats.maxHp > 0 ? Math.round((m.stats.hp / m.stats.maxHp) * 1000) / 10 : 0,
        types: m.types,
        status: m.status,
        isShiny: m.isShiny,
        moves: m.moves.map(mv => ({
          name: mv.name,
          type: mv.type,
          power: mv.power,
          pp: mv.pp,
          maxPp: mv.maxPp,
        })),
      })),
      boxCount: agent.box.length,
    });
  });

  return router;
}