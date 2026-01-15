import { Keypair, PublicKey } from "@solana/web3.js";
import { PxmonClient } from "../client";
import {
  Agent,
  Monster,
  StrategyConfig,
  AgentEvent,
  AgentEventType,
  RunnerState,
  RunnerStats,
  WildEncounter,
  MonsterType,
} from "../types";
import { BallType } from "../types/instructions";
import { StrategyEngine, AgentAction } from "./strategy";
import { BattleSimulator } from "./battle-simulator";
import { Logger, LogLevel } from "../utils/logger";
import { DeterministicRng } from "../utils/rng";
import { getSpecies, canEvolve } from "../utils/monster-data";
import { TICK_PRESETS } from "../constants";

export interface AgentRunnerConfig {
  client: PxmonClient;
  strategy?: Partial<StrategyConfig>;
  tickSpeed?: number;
  logger?: Logger;
  maxTicksPerSession?: number;
  onEvent?: (event: AgentEvent) => void;
}

/**
 * Automated agent runner that executes the game loop.
 * Handles exploring, catching, battling, healing, gym challenges, and trading.
 */
export class AgentRunner {
  private client: PxmonClient;
  private strategy: StrategyEngine;
  private simulator: BattleSimulator;
  private logger: Logger;
  private state: RunnerState;
  private tickSpeed: number;
  private maxTicks: number;
  private stats: RunnerStats;
  private intervalHandle: ReturnType<typeof setInterval> | null;
  private eventHandler: ((event: AgentEvent) => void) | null;
  private agent: Agent | null;
  private party: Monster[];
  private tickCount: number;
  private startTime: number;
  private consecutiveErrors: number;
  private maxConsecutiveErrors: number;

  constructor(config: AgentRunnerConfig) {
    this.client = config.client;
    this.strategy = new StrategyEngine(config.strategy);
    this.simulator = new BattleSimulator();
    this.logger = config.logger ?? new Logger({ level: LogLevel.Info, component: "AgentRunner" });
    this.state = RunnerState.Idle;
    this.tickSpeed = config.tickSpeed ?? TICK_PRESETS.NORMAL;
    this.maxTicks = config.maxTicksPerSession ?? Infinity;
    this.eventHandler = config.onEvent ?? null;
    this.agent = null;
    this.party = [];
    this.tickCount = 0;
    this.startTime = 0;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 10;
    this.intervalHandle = null;

    this.stats = {
      ticksProcessed: 0,
      battlesInitiated: 0,
      monstersCaught: 0,
      gymsAttempted: 0,
      tradesCreated: 0,
      errors: 0,
      startedAt: 0,
      uptimeMs: 0,
    };
  }

  /**
   * Start the automated agent loop.
   */
  async start(): Promise<void> {
    if (this.state === RunnerState.Running) {
      this.logger.warn("Runner is already running");
      return;
    }

    this.logger.info("Starting agent runner", { tickSpeed: this.tickSpeed });
    this.state = RunnerState.Running;
    this.startTime = Date.now();
    this.stats.startedAt = this.startTime;
    this.tickCount = 0;
    this.consecutiveErrors = 0;

    // Initial data fetch
    await this.refreshState();

    if (!this.agent) {
      this.logger.error("No agent found — register first");
      this.state = RunnerState.Error;
      return;
    }

    this.emitEvent(AgentEventType.Tick, { message: "Agent runner started" });

    this.intervalHandle = setInterval(async () => {
      if (this.state !== RunnerState.Running) return;
      if (this.tickCount >= this.maxTicks) {
        this.logger.info("Max ticks reached, stopping");
        await this.stop();
        return;
      }
      await this.tick();
    }, this.tickSpeed);
  }

  /**
   * Stop the agent runner.
   */
  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.state = RunnerState.Stopped;
    this.stats.uptimeMs = Date.now() - this.startTime;
    this.logger.info("Agent runner stopped", { stats: this.stats });
  }

  /**
   * Pause the agent runner.
   */
  pause(): void {
    if (this.state !== RunnerState.Running) return;
    this.state = RunnerState.Paused;
    this.logger.info("Agent runner paused");
  }

  /**
   * Resume the agent runner.
   */
  resume(): void {
    if (this.state !== RunnerState.Paused) return;
    this.state = RunnerState.Running;
    this.logger.info("Agent runner resumed");
  }

  /**
   * Get the current runner state.
   */
  getState(): RunnerState {
    return this.state;
  }

  /**
   * Get runner statistics.
   */
  getStats(): RunnerStats {
    return {
      ...this.stats,
      uptimeMs: this.state === RunnerState.Running ? Date.now() - this.startTime : this.stats.uptimeMs,
    };
  }

  /**
   * Update the strategy configuration.
   */
  updateStrategy(config: Partial<StrategyConfig>): void {
    this.strategy.updateConfig(config);
    this.logger.info("Strategy updated");
  }

  /**
   * Update tick speed.
   */
  setTickSpeed(ms: number): void {
    this.tickSpeed = ms;
    if (this.intervalHandle && this.state === RunnerState.Running) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = setInterval(async () => {
        if (this.state !== RunnerState.Running) return;
        await this.tick();
      }, this.tickSpeed);
    }
    this.logger.info("Tick speed updated", { tickSpeed: ms });
  }

  /**
   * Get the current agent data.
   */
  getAgent(): Agent | null {
    return this.agent;
  }

  /**
   * Get the current party.
   */
  getParty(): Monster[] {
    return [...this.party];
  }

  // ============================================================
  // CORE LOOP
  // ============================================================

  private async tick(): Promise<void> {
    this.tickCount++;
    this.stats.ticksProcessed++;

    try {
      await this.refreshState();

      if (!this.agent || this.party.length === 0) {
        this.logger.warn("No agent or party data");
        return;
      }

      this.emitEvent(AgentEventType.Tick, {
        tick: this.tickCount,
        partySize: this.party.length,
        avgHp: this.party.reduce((s, m) => s + m.currentHp / m.maxHp, 0) / this.party.length,
      });

      const action = this.strategy.getRecommendedAction(this.agent, this.party);
      this.logger.debug("Recommended action", { action });

      switch (action) {
        case AgentAction.Heal:
          await this.executeHeal();
          break;
        case AgentAction.Evolve:
          await this.executeEvolve();
          break;
        case AgentAction.Gym:
          await this.executeGym();
          break;
        case AgentAction.Explore:
          await this.executeExplore();
          break;
        case AgentAction.Battle:
          await this.executeBattle();
          break;
        case AgentAction.Trade:
          await this.executeTrade();
          break;
        case AgentAction.Wait:
          this.logger.debug("Waiting...");
          break;
      }

      this.consecutiveErrors = 0;
    } catch (err) {
      this.consecutiveErrors++;
      this.stats.errors++;
      this.logger.error("Tick error", { error: String(err), tick: this.tickCount });
      this.emitEvent(AgentEventType.Error, { error: String(err) });

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.logger.fatal("Too many consecutive errors, stopping runner");
        this.state = RunnerState.Error;
        await this.stop();
      }
    }
  }

  private async refreshState(): Promise<void> {
    this.agent = await this.client.getAgent();
    if (!this.agent) return;

    this.party = [];
    for (const monPubkey of this.agent.party) {
      const mon = await this.client.getMonster(monPubkey);
      if (mon) this.party.push(mon);
    }
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  private async executeHeal(): Promise<void> {
    this.logger.info("Healing party");
    try {
      await this.client.healParty();
      this.emitEvent(AgentEventType.Healed, { partySize: this.party.length });
    } catch (err) {
      this.logger.error("Failed to heal", { error: String(err) });
    }
  }

  private async executeEvolve(): Promise<void> {
    for (let i = 0; i < this.party.length; i++) {
      const mon = this.party[i];
      if (canEvolve(mon.speciesId, mon.level)) {
        this.logger.info("Evolving monster", { species: mon.speciesId, level: mon.level });
        try {
          await this.client.evolveMonster({ monsterIndex: i });
          this.emitEvent(AgentEventType.MonsterEvolved, {
            speciesId: mon.speciesId,
            level: mon.level,
            index: i,
          });
        } catch (err) {
          this.logger.error("Failed to evolve", { error: String(err) });
        }
      }
    }
  }

  private async executeGym(): Promise<void> {
    if (!this.agent) return;

    for (let gymId = 0; gymId < 8; gymId++) {
      if (this.strategy.shouldChallengeGym(this.agent, this.party, gymId)) {
        this.logger.info("Challenging gym", { gymId });
        this.stats.gymsAttempted++;
        const monsterIndices = this.party.map((_, i) => i).slice(0, 3);

        try {
          await this.client.gymChallenge({ gymId, monsterIndices });
          this.emitEvent(AgentEventType.GymChallenge, { gymId });

          // Refresh to check result
          await this.refreshState();
          if (this.agent && this.agent.badges[gymId]) {
            this.emitEvent(AgentEventType.GymVictory, { gymId });
            this.logger.info("Gym defeated!", { gymId });
          } else {
            this.emitEvent(AgentEventType.GymDefeat, { gymId });
          }
        } catch (err) {
          this.logger.error("Gym challenge failed", { error: String(err) });
        }
        break; // Only one gym per tick
      }
    }
  }

  private async executeExplore(): Promise<void> {
    this.logger.debug("Exploring for wild encounters");
    const seed = Array.from(DeterministicRng.fromSeed(Date.now()).generateIVs() as any)
      .concat(Array.from(DeterministicRng.fromSeed(Date.now() + 1).generateIVs() as any))
      .slice(0, 16) as number[];

    // Simulate the seed as 16 random bytes
    const areaSeed: number[] = [];
    const rng = DeterministicRng.fromSeed(Date.now());
    for (let i = 0; i < 16; i++) {
      areaSeed.push(rng.nextRange(256));
    }

    try {
      await this.client.wildEncounter(areaSeed);

      // Simulate what the encounter might be (for catch decision)
      const encounterRng = new DeterministicRng(areaSeed);
      const speciesIds = Object.keys(getSpecies(1) ? {} : {});

      // Attempt catch
      const catchSeed: number[] = [];
      for (let i = 0; i < 16; i++) {
        catchSeed.push(rng.nextRange(256));
      }

      await this.client.catchMonster({
        encounterSeed: catchSeed,
        ballType: BallType.PxBall,
      });

      this.stats.monstersCaught++;
      this.emitEvent(AgentEventType.MonsterCaught, { areaSeed });
    } catch (err) {
      this.logger.debug("Explore/catch failed", { error: String(err) });
    }
  }

  private async executeBattle(): Promise<void> {
    this.logger.debug("Looking for battle opponent");

    try {
      const agents = await this.client.getAllAgents();
      const selfPda = this.client.getAgentPda()[0];

      // Filter out self and find suitable opponent
      const opponents = agents.filter(
        (a) => !a.pubkey.equals(selfPda) && a.isActive && a.party.length > 0
      );

      if (opponents.length === 0) {
        this.logger.debug("No opponents available");
        return;
      }

      // Pick the best opponent based on strategy
      let bestOpponent: Agent | null = null;
      for (const opp of opponents) {
        const oppAvgLevel = 10; // We don't know their levels without fetching, use estimate
        if (
          this.strategy.shouldBattle(this.party, {
            avgLevel: oppAvgLevel,
            totalWins: opp.totalWins,
          })
        ) {
          bestOpponent = opp;
          break;
        }
      }

      if (!bestOpponent) {
        this.logger.debug("No suitable opponent found");
        return;
      }

      this.stats.battlesInitiated++;
      this.emitEvent(AgentEventType.BattleStarted, {
        opponent: bestOpponent.pubkey.toBase58(),
      });

      // Use strategy to pick best lead
      // We don't know opponent types, so use first monster
      const leadIdx = 0;

      await this.client.initBattle({
        defenderAgent: bestOpponent.authority,
        challengerMonsterIndex: leadIdx,
      });

      // Battle loop — submit moves until battle ends
      await this.runBattleLoop(bestOpponent);
    } catch (err) {
      this.logger.error("Battle execution failed", { error: String(err) });
    }
  }

  private async runBattleLoop(opponent: Agent): Promise<void> {
    const battles = await this.client.getActiveBattles();
    const selfPda = this.client.getAgentPda()[0];
    const battle = battles.find(
      (b) => b.challenger.equals(selfPda) || b.defender.equals(selfPda)
    );

    if (!battle) {
      this.logger.debug("No active battle found");
      return;
    }

    let maxRounds = 50;
    let currentBattle = battle;

    while (maxRounds > 0 && currentBattle.status === "Active") {
      maxRounds--;

      // Determine which monster we have and pick a move
      const ourMonster = this.party[0]; // Simplified
      if (!ourMonster || ourMonster.currentHp <= 0) break;

      const opponentSpecies = getSpecies(1); // We'd need to fetch the actual opponent monster
      const defenderTypes: MonsterType[] = opponentSpecies ? [...opponentSpecies.types] : [MonsterType.Normal];

      const selection = this.strategy.selectBattleMove(
        ourMonster,
        defenderTypes,
        currentBattle.defenderHp / 100
      );

      if (selection.action === "Flee") {
        await this.client.fleeBattle({ battlePubkey: battle.pubkey });
        break;
      }

      if (selection.action === "Switch" && selection.switchIndex !== undefined) {
        await this.client.switchMonster({
          battlePubkey: battle.pubkey,
          newMonsterIndex: selection.switchIndex,
        });
      } else {
        await this.client.submitBattleMove({
          battlePubkey: battle.pubkey,
          moveIndex: selection.moveIndex ?? 0,
        });
      }

      // Refresh battle state
      const updatedBattle = await this.client.getBattle(battle.pubkey);
      if (!updatedBattle) break;
      currentBattle = updatedBattle;
    }

    this.emitEvent(AgentEventType.BattleEnded, {
      winner: currentBattle.winner?.toBase58() ?? "unknown",
      turns: currentBattle.turn,
    });
  }

  private async executeTrade(): Promise<void> {
    if (!this.agent) return;

    // Check active trades first
    const trades = await this.client.getActiveTrades();
    const selfPda = this.client.getAgentPda()[0];

    // Look for trades we can fulfill
    for (const trade of trades) {
      if (trade.owner.equals(selfPda)) continue;

      // Check if we have a monster that matches
      for (let i = 0; i < this.party.length; i++) {
        const mon = this.party[i];
        if (
          trade.wantedSpeciesId !== null &&
          mon.speciesId === trade.wantedSpeciesId &&
          mon.level >= trade.wantedMinLevel
        ) {
          try {
            await this.client.executeTrade({
              tradePubkey: trade.pubkey,
              offeredMonsterIndex: i,
            });
            this.emitEvent(AgentEventType.TradeCompleted, {
              tradePubkey: trade.pubkey.toBase58(),
            });
            this.stats.tradesCreated++;
            return;
          } catch (err) {
            this.logger.error("Trade execution failed", { error: String(err) });
          }
        }
      }
    }
  }

  // ============================================================
  // EVENTS
  // ============================================================

  private emitEvent(type: AgentEventType, data: Record<string, unknown>): void {
    const event: AgentEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    if (this.eventHandler) {
      try {
        this.eventHandler(event);
      } catch (err) {
        this.logger.error("Event handler error", { error: String(err) });
      }
    }
  }
}