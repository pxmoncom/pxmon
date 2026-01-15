/**
 * API key authentication middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/agent-service';

declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      apiKey?: string;
    }
  }
}

export function createAuthMiddleware(agentService: AgentService) {
  return function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Public endpoints that don't need auth
    const publicPaths = [
      '/api/agents/register',
      '/api/leaderboard',
      '/api/events',
      '/api/clock',
      '/api/health',
    ];

    if (publicPaths.some(p => req.path.startsWith(p))) {
      next();
      return;
    }

    const apiKey = extractApiKey(req);

    if (!apiKey) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Provide API key via Authorization header (Bearer) or x-api-key header',
      });
      return;
    }

    const agent = agentService.getAgentByApiKey(apiKey);
    if (!agent) {
      res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key does not match any registered agent',
      });
      return;
    }

    if (!agent.isActive) {
      res.status(403).json({
        error: 'Agent deactivated',
        message: 'This agent has been deactivated',
      });
      return;
    }

    req.agentId = agent.agentId;
    req.apiKey = apiKey;
    next();
  };
}

function extractApiKey(req: Request): string | null {
  // Check Authorization: Bearer <key>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check x-api-key header
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.length > 0) {
    return xApiKey;
  }

  // Check query parameter
  const queryKey = req.query['api_key'];
  if (typeof queryKey === 'string' && queryKey.length > 0) {
    return queryKey;
  }

  return null;
}

export function requireAgent(req: Request, res: Response, next: NextFunction): void {
  if (!req.agentId) {
    res.status(401).json({ error: 'Agent authentication required' });
    return;
  }
  next();
}