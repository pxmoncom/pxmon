/**
 * PXMON API Server - Express entry point with middleware setup.
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';

import { AgentService } from './services/agent-service';
import { eventBus, GameEvent } from './services/event-bus';
import { BackupService } from './services/backup';
import { createAgentRouter } from './routes/agents';
import { createEventsRouter, createLeaderboardRouter } from './routes/events';
import { createClockRouter } from './routes/clock';
import { createAuthMiddleware } from './middleware/auth';
import { createRateLimiter } from './middleware/rate-limit';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL || '300000', 10);

// Services
const agentService = new AgentService();
const backupService = new BackupService(process.env.BACKUP_DIR || './backups');

// Express app
const app = express();
const httpServer = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 120 }));
app.use(createAuthMiddleware(agentService));

// Request logging
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[SLOW] ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
    agents: agentService.getAllAgents().length,
    events: eventBus.getEventCount(),
    timestamp: Date.now(),
  });
});

// Routes
const { router: clockRouter, clock } = createClockRouter();
app.use('/api/agents', createAgentRouter(agentService));
app.use('/api/events', createEventsRouter(agentService));
app.use('/api/leaderboard', createLeaderboardRouter(agentService));
app.use('/api/clock', clockRouter);

// Backup routes
app.post('/api/backup/save', (_req, res) => {
  try {
    const filepath = backupService.save(agentService.exportAllData(), 'manual');
    res.json({ result: 'saved', filepath });
  } catch (err) {
    res.status(500).json({ error: `Backup failed: ${String(err)}` });
  }
});

app.post('/api/backup/load', (req, res) => {
  const { filepath } = req.body;

  let result;
  if (filepath) {
    result = backupService.load(filepath);
  } else {
    result = backupService.loadLatest();
  }

  if ('error' in result) {
    res.status(400).json(result);
    return;
  }

  const imported = agentService.importData(result.agents);
  res.json({
    result: 'loaded',
    agentsImported: imported,
    backupTimestamp: result.metadata.timestamp,
  });
});

app.get('/api/backup/list', (_req, res) => {
  const backups = backupService.listBackups();
  res.json({ backups, total: backups.length });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    endpoints: [
      'GET  /api/health',
      'POST /api/agents/register',
      'GET  /api/agents',
      'GET  /api/agents/:id',
      'POST /api/agents/:id/hunt',
      'POST /api/agents/:id/heal',
      'POST /api/agents/:id/gym',
      'POST /api/agents/:id/move',
      'POST /api/agents/:id/tick',
      'GET  /api/agents/:id/team',
      'GET  /api/events',
      'GET  /api/events/history',
      'GET  /api/leaderboard',
      'GET  /api/clock',
      'POST /api/clock/start',
      'POST /api/clock/pause',
      'POST /api/clock/tick',
    ],
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// WebSocket handling
wss.on('connection', (ws: WebSocket) => {
  let subscribedAgentId: string | null = null;

  const onEvent = (event: GameEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!subscribedAgentId || event.agentId === subscribedAgentId) {
        ws.send(JSON.stringify(event));
      }
    }
  };

  eventBus.on('event', onEvent);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.agentId) {
        subscribedAgentId = msg.agentId;
        ws.send(JSON.stringify({ type: 'subscribed', agentId: subscribedAgentId }));
      } else if (msg.type === 'unsubscribe') {
        subscribedAgentId = null;
        ws.send(JSON.stringify({ type: 'unsubscribed' }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', serverTime: Date.now() }));
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    eventBus.off('event', onEvent);
  });

  ws.send(JSON.stringify({
    type: 'connected',
    serverTime: Date.now(),
    globalTick: clock.globalTick,
  }));
});

// Auto-backup
let backupTimer: ReturnType<typeof setInterval> | null = null;
if (BACKUP_INTERVAL > 0) {
  backupTimer = setInterval(() => {
    const agents = agentService.exportAllData();
    if (agents.length > 0) {
      try {
        backupService.save(agents, 'auto');
      } catch (err) {
        console.error('Auto-backup failed:', err);
      }
    }
  }, BACKUP_INTERVAL);

  if (backupTimer.unref) {
    backupTimer.unref();
  }
}

// Auto-tick agents on clock tick
clock.onTick((tick) => {
  const agents = agentService.getAllAgents();
  for (const agent of agents) {
    if (agent.isActive) {
      try {
        agentService.tick(agent.agentId);
      } catch (err) {
        console.error(`Tick error for ${agent.agentId}:`, err);
      }
    }
  }
});

// Start server
if (require.main === module) {
  httpServer.listen(PORT, HOST, () => {
    console.log(`PXMON API Server running on http://${HOST}:${PORT}`);
    console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
    console.log(`Auto-backup interval: ${BACKUP_INTERVAL / 1000}s`);
  });
}

export { app, httpServer, agentService, backupService, clock };