/**
 * Global clock synchronization endpoint.
 */

import { Router, Request, Response } from 'express';

export interface ClockState {
  globalTick: number;
  startedAt: number;
  tickIntervalMs: number;
  isPaused: boolean;
}

export function createClockRouter(): { router: Router; clock: GameClock } {
  const clock = new GameClock();
  const router = Router();

  /**
   * GET /api/clock
   * Get current global time state.
   */
  router.get('/', (_req: Request, res: Response): void => {
    res.json(clock.getState());
  });

  /**
   * POST /api/clock/start
   * Start the global clock (admin only).
   */
  router.post('/start', (_req: Request, res: Response): void => {
    clock.start();
    res.json({ message: 'Clock started', ...clock.getState() });
  });

  /**
   * POST /api/clock/pause
   * Pause the global clock.
   */
  router.post('/pause', (_req: Request, res: Response): void => {
    clock.pause();
    res.json({ message: 'Clock paused', ...clock.getState() });
  });

  /**
   * POST /api/clock/reset
   * Reset clock to zero.
   */
  router.post('/reset', (_req: Request, res: Response): void => {
    clock.reset();
    res.json({ message: 'Clock reset', ...clock.getState() });
  });

  /**
   * POST /api/clock/tick
   * Manually advance one tick.
   */
  router.post('/tick', (_req: Request, res: Response): void => {
    clock.manualTick();
    res.json({ tick: clock.globalTick, ...clock.getState() });
  });

  /**
   * GET /api/clock/sync
   * Get precise sync data for clients.
   */
  router.get('/sync', (_req: Request, res: Response): void => {
    const now = Date.now();
    res.json({
      serverTime: now,
      globalTick: clock.globalTick,
      nextTickAt: clock.isPaused ? null : clock.nextTickAt(),
      tickInterval: clock.tickIntervalMs,
      uptime: now - clock.startedAt,
    });
  });

  return { router, clock };
}

export class GameClock {
  globalTick: number = 0;
  startedAt: number = Date.now();
  tickIntervalMs: number = 5000;  // 5 second ticks
  isPaused: boolean = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickAt: number = 0;
  private tickCallbacks: Array<(tick: number) => void> = [];

  start(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTickAt = Date.now();

    this.timer = setInterval(() => {
      this.globalTick++;
      this.lastTickAt = Date.now();
      for (const cb of this.tickCallbacks) {
        try {
          cb(this.globalTick);
        } catch {
          // Don't let callback errors stop the clock
        }
      }
    }, this.tickIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  pause(): void {
    this.isPaused = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.pause();
    this.globalTick = 0;
    this.startedAt = Date.now();
    this.lastTickAt = 0;
  }

  manualTick(): void {
    this.globalTick++;
    this.lastTickAt = Date.now();
    for (const cb of this.tickCallbacks) {
      try {
        cb(this.globalTick);
      } catch {
        // Ignore
      }
    }
  }

  onTick(callback: (tick: number) => void): void {
    this.tickCallbacks.push(callback);
  }

  offTick(callback: (tick: number) => void): void {
    this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
  }

  nextTickAt(): number | null {
    if (this.isPaused || this.lastTickAt === 0) return null;
    return this.lastTickAt + this.tickIntervalMs;
  }

  getState(): ClockState & { serverTime: number } {
    return {
      globalTick: this.globalTick,
      startedAt: this.startedAt,
      tickIntervalMs: this.tickIntervalMs,
      isPaused: this.isPaused,
      serverTime: Date.now(),
    };
  }

  setTickInterval(ms: number): void {
    const wasRunning = !this.isPaused;
    if (wasRunning) this.pause();
    this.tickIntervalMs = Math.max(100, ms);
    if (wasRunning) this.start();
  }
}