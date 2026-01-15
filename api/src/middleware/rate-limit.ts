/**
 * Rate limiting middleware per API key.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;        // Time window in ms
  maxRequests: number;     // Max requests per window
  keyExtractor?: (req: Request) => string;
  skipPaths?: string[];
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,       // 1 minute
  maxRequests: 120,        // 120 requests per minute
  skipPaths: ['/api/health', '/api/clock'],
};

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const cfg: RateLimitConfig = { ...DEFAULT_CONFIG, ...config };
  const store: Map<string, RateLimitEntry> = new Map();

  // Cleanup old entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60_000);

  // Prevent the timer from keeping the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip rate limiting for certain paths
    if (cfg.skipPaths?.some(p => req.path.startsWith(p))) {
      next();
      return;
    }

    const key = cfg.keyExtractor
      ? cfg.keyExtractor(req)
      : extractKey(req);

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + cfg.windowMs,
      };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, cfg.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', cfg.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (entry.count > cfg.maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${cfg.maxRequests} per ${cfg.windowMs / 1000}s`,
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}

function extractKey(req: Request): string {
  // Use API key if available
  if (req.apiKey) {
    return `key:${req.apiKey}`;
  }

  // Fall back to IP
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

export function createStrictRateLimiter(maxPerMinute: number = 30) {
  return createRateLimiter({
    windowMs: 60_000,
    maxRequests: maxPerMinute,
  });
}

export function createBurstRateLimiter(maxPerSecond: number = 10) {
  return createRateLimiter({
    windowMs: 1_000,
    maxRequests: maxPerSecond,
  });
}