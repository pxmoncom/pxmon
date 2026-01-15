/**
 * Event streaming and leaderboard routes.
 */

import { Router, Request, Response } from 'express';
import { eventBus, GameEvent } from '../services/event-bus';
import { AgentService } from '../services/agent-service';

export function createEventsRouter(agentService: AgentService): Router {
  const router = Router();

  /**
   * GET /api/events
   * Server-Sent Events stream for real-time game updates.
   */
  router.get('/', (req: Request, res: Response): void => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('retry: 3000\n\n');

    // Send recent events as catch-up
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    const recentEvents = eventBus.getRecentEvents(20, lastEventId);
    for (const event of recentEvents) {
      const sseData = formatSSE(event);
      res.write(sseData);
    }

    // Live stream
    const onEvent = (event: GameEvent) => {
      const sseData = formatSSE(event);
      res.write(sseData);
    };

    eventBus.on('event', onEvent);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30_000);

    // Cleanup on disconnect
    req.on('close', () => {
      eventBus.off('event', onEvent);
      clearInterval(heartbeat);
    });
  });

  /**
   * GET /api/events/history
   * Get recent events (non-streaming).
   */
  router.get('/history', (req: Request, res: Response): void => {
    const count = Math.min(parseInt(req.query.count as string) || 50, 200);
    const type = req.query.type as string | undefined;
    const agentId = req.query.agentId as string | undefined;

    let events: GameEvent[];
    if (agentId) {
      events = eventBus.getEventsByAgent(agentId, count);
    } else if (type) {
      events = eventBus.getEventsByType(type, count);
    } else {
      events = eventBus.getRecentEvents(count);
    }

    res.json({
      events,
      total: eventBus.getEventCount(),
      returned: events.length,
    });
  });

  /**
   * GET /api/leaderboard
   * Get current agent rankings.
   */
  router.get('/leaderboard', (_req: Request, res: Response): void => {
    const leaderboard = agentService.getLeaderboard();

    res.json({
      leaderboard,
      totalAgents: leaderboard.length,
      updatedAt: Date.now(),
    });
  });

  /**
   * GET /api/events/agent/:agentId
   * Get events for a specific agent.
   */
  router.get('/agent/:agentId', (req: Request, res: Response): void => {
    const count = Math.min(parseInt(req.query.count as string) || 50, 200);
    const events = eventBus.getEventsByAgent(req.params.agentId, count);

    res.json({
      agentId: req.params.agentId,
      events,
      returned: events.length,
    });
  });

  /**
   * GET /api/events/stream/:agentId
   * SSE stream filtered to a single agent.
   */
  router.get('/stream/:agentId', (req: Request, res: Response): void => {
    const agentId = req.params.agentId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('retry: 3000\n\n');

    const onEvent = (event: GameEvent) => {
      const sseData = formatSSE(event);
      res.write(sseData);
    };

    eventBus.on(`agent:${agentId}`, onEvent);

    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30_000);

    req.on('close', () => {
      eventBus.off(`agent:${agentId}`, onEvent);
      clearInterval(heartbeat);
    });
  });

  return router;
}

function formatSSE(event: GameEvent): string {
  const data = JSON.stringify({
    type: event.type,
    agentId: event.agentId,
    tick: event.tick,
    timestamp: event.timestamp,
    data: event.data,
  });
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`;
}

export function createLeaderboardRouter(agentService: AgentService): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    const leaderboard = agentService.getLeaderboard();
    res.json({
      leaderboard,
      totalAgents: leaderboard.length,
      updatedAt: Date.now(),
    });
  });

  router.get('/top/:count', (req: Request, res: Response): void => {
    const count = Math.min(parseInt(req.params.count) || 10, 100);
    const leaderboard = agentService.getLeaderboard().slice(0, count);
    res.json({
      leaderboard,
      showing: leaderboard.length,
      updatedAt: Date.now(),
    });
  });

  return router;
}