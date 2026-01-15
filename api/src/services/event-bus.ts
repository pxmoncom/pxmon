/**
 * Event bus for real-time updates via SSE and WebSocket.
 */

import { EventEmitter } from 'events';

export interface GameEvent {
  id: string;
  type: string;
  agentId: string;
  timestamp: number;
  tick: number;
  data: Record<string, unknown>;
}

export interface LeaderboardEntry {
  agentId: string;
  name: string;
  strategy: string;
  badges: number;
  avgLevel: number;
  battlesWon: number;
  battlesLost: number;
  monstersCaught: number;
  score: number;
}

class EventBus extends EventEmitter {
  private events: GameEvent[] = [];
  private maxEvents: number = 10000;
  private eventCounter: number = 0;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emit(eventName: string | symbol, ...args: unknown[]): boolean {
    return super.emit(eventName, ...args);
  }

  publish(event: Omit<GameEvent, 'id' | 'timestamp'>): GameEvent {
    const fullEvent: GameEvent = {
      ...event,
      id: `evt_${(++this.eventCounter).toString(36).padStart(8, '0')}`,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.emit('event', fullEvent);
    this.emit(`event:${event.type}`, fullEvent);
    this.emit(`agent:${event.agentId}`, fullEvent);

    return fullEvent;
  }

  getRecentEvents(count: number = 50, afterId?: string): GameEvent[] {
    if (afterId) {
      const idx = this.events.findIndex(e => e.id === afterId);
      if (idx >= 0) {
        return this.events.slice(idx + 1, idx + 1 + count);
      }
    }
    return this.events.slice(-count);
  }

  getEventsByAgent(agentId: string, count: number = 50): GameEvent[] {
    return this.events
      .filter(e => e.agentId === agentId)
      .slice(-count);
  }

  getEventsByType(type: string, count: number = 50): GameEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-count);
  }

  getEventCount(): number {
    return this.events.length;
  }

  clearEvents(): void {
    this.events = [];
    this.eventCounter = 0;
  }
}

export const eventBus = new EventBus();