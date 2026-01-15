import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SendOptions,
  Commitment,
} from "@solana/web3.js";
import {
  Agent,
  Monster,
  Battle,
  BattleStatus,
  TradeListing,
  LeaderboardEntry,
  WildEncounter,
  MonsterType,
  StatusCondition,
  MoveCategory,
  RarityTier,
} from "./types";
import {
  RegisterAgentArgs,
  CatchMonsterArgs,
  InitBattleArgs,
  SubmitBattleMoveArgs,
  GymChallengeArgs,
  CreateTradeArgs,
  ExecuteTradeArgs,
  CancelTradeArgs,
  HealMonsterArgs,
  EvolveMonsterArgs,
  SetNicknameArgs,
  ReorderPartyArgs,
  DepositMonsterArgs,
  WithdrawMonsterArgs,
  UpdateStrategyArgs,
  WildEncounterArgs,
  FleeBattleArgs,
  SwitchMonsterArgs,
  BallType,
  BALL_MULTIPLIERS,
  INSTRUCTION_DISCRIMINATORS,
  ACCOUNT_SIZES,
} from "./types/instructions";
import { PROGRAM_ID, SEEDS, MAX_PARTY_SIZE } from "./constants";
import { Logger, LogLevel, createSilentLogger } from "./utils/logger";
import { DeterministicRng } from "./utils/rng";
import { getSpecies, SPECIES, MOVES } from "./utils/monster-data";

export interface PxmonClientConfig {
  connection: Connection;
  wallet: Keypair;
  programId?: PublicKey;
  commitment?: Commitment;
  logger?: Logger;
}

/**
 * Main client for interacting with the PXMON on-chain program.
 */
export class PxmonClient {
  readonly connection: Connection;
  readonly wallet: Keypair;
  readonly programId: PublicKey;
  readonly commitment: Commitment;
  private logger: Logger;

  constructor(config: PxmonClientConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId ?? PROGRAM_ID;
    this.commitment = config.commitment ?? "confirmed";
    this.logger = config.logger ?? createSilentLogger("PxmonClient");
  }

  /**
   * Create a PxmonClient connected to a given RPC endpoint.
   */
  static connect(
    rpcUrl: string,
    wallet: Keypair,
    options?: { programId?: PublicKey; commitment?: Commitment; logger?: Logger }
  ): PxmonClient {
    const connection = new Connection(rpcUrl, options?.commitment ?? "confirmed");
    return new PxmonClient({
      connection,
      wallet,
      programId: options?.programId,
      commitment: options?.commitment,
      logger: options?.logger,
    });
  }

  // ============================================================
  // PDA DERIVATION
  // ============================================================

  getAgentPda(authority?: PublicKey): [PublicKey, number] {
    const auth = authority ?? this.wallet.publicKey;
    return PublicKey.findProgramAddressSync(
      [SEEDS.AGENT, auth.toBuffer()],
      this.programId
    );
  }

  getMonsterPda(agentPubkey: PublicKey, index: number): [PublicKey, number] {
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(index);
    return PublicKey.findProgramAddressSync(
      [SEEDS.MONSTER, agentPubkey.toBuffer(), indexBuf],
      this.programId
    );
  }

  getBattlePda(challenger: PublicKey, defender: PublicKey, seed: number): [PublicKey, number] {
    const seedBuf = Buffer.alloc(8);
    seedBuf.writeBigUInt64LE(BigInt(seed));
    return PublicKey.findProgramAddressSync(
      [SEEDS.BATTLE, challenger.toBuffer(), defender.toBuffer(), seedBuf],
      this.programId
    );
  }

  getTradePda(owner: PublicKey, monsterPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SEEDS.TRADE, owner.toBuffer(), monsterPubkey.toBuffer()],
      this.programId
    );
  }

  getGymPda(gymId: number): [PublicKey, number] {
    const gymBuf = Buffer.alloc(1);
    gymBuf.writeUInt8(gymId);
    return PublicKey.findProgramAddressSync(
      [SEEDS.GYM, gymBuf],
      this.programId
    );
  }

  getLeaderboardPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SEEDS.LEADERBOARD],
      this.programId
    );
  }

  // ============================================================
  // INSTRUCTIONS
  // ============================================================

  /**
   * Register a new agent with a starter monster.
   */
  async registerAgent(args: RegisterAgentArgs): Promise<string> {
    this.logger.info("Registering agent", { name: args.name, starter: args.starterSpeciesId });

    const [agentPda] = this.getAgentPda();
    const nameBytes = Buffer.from(args.name, "utf-8");
    const data = Buffer.alloc(8 + 4 + nameBytes.length + 2);
    INSTRUCTION_DISCRIMINATORS.registerAgent.copy(data, 0);
    data.writeUInt32LE(nameBytes.length, 8);
    nameBytes.copy(data, 12);
    data.writeUInt16LE(args.starterSpeciesId, 12 + nameBytes.length);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Attempt to catch a wild monster.
   */
  async catchMonster(args: CatchMonsterArgs): Promise<string> {
    this.logger.info("Catching monster", { ball: BallType[args.ballType] });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 16 + 1);
    INSTRUCTION_DISCRIMINATORS.catchMonster.copy(data, 0);
    Buffer.from(args.encounterSeed).copy(data, 8);
    data.writeUInt8(args.ballType, 24);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Initiate a battle with another agent.
   */
  async initBattle(args: InitBattleArgs): Promise<string> {
    this.logger.info("Initiating battle", {
      defender: args.defenderAgent.toBase58(),
      monsterIdx: args.challengerMonsterIndex,
    });

    const [challengerPda] = this.getAgentPda();
    const [defenderPda] = this.getAgentPda(args.defenderAgent);
    const slot = await this.connection.getSlot();
    const [battlePda] = this.getBattlePda(
      challengerPda,
      defenderPda,
      slot
    );

    const data = Buffer.alloc(8 + 32 + 1);
    INSTRUCTION_DISCRIMINATORS.initBattle.copy(data, 0);
    args.defenderAgent.toBuffer().copy(data, 8);
    data.writeUInt8(args.challengerMonsterIndex, 40);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: challengerPda, isSigner: false, isWritable: true },
        { pubkey: defenderPda, isSigner: false, isWritable: true },
        { pubkey: battlePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Submit a battle move.
   */
  async submitBattleMove(args: SubmitBattleMoveArgs): Promise<string> {
    this.logger.info("Submitting battle move", { moveIndex: args.moveIndex });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32 + 1);
    INSTRUCTION_DISCRIMINATORS.submitBattleMove.copy(data, 0);
    args.battlePubkey.toBuffer().copy(data, 8);
    data.writeUInt8(args.moveIndex, 40);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: args.battlePubkey, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Switch monster during battle.
   */
  async switchMonster(args: SwitchMonsterArgs): Promise<string> {
    this.logger.info("Switching monster", { newIndex: args.newMonsterIndex });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32 + 1);
    INSTRUCTION_DISCRIMINATORS.switchMonster.copy(data, 0);
    args.battlePubkey.toBuffer().copy(data, 8);
    data.writeUInt8(args.newMonsterIndex, 40);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: args.battlePubkey, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Challenge a gym.
   */
  async gymChallenge(args: GymChallengeArgs): Promise<string> {
    this.logger.info("Challenging gym", { gymId: args.gymId });

    const [agentPda] = this.getAgentPda();
    const [gymPda] = this.getGymPda(args.gymId);
    const data = Buffer.alloc(8 + 1 + 1 + args.monsterIndices.length);
    INSTRUCTION_DISCRIMINATORS.gymChallenge.copy(data, 0);
    data.writeUInt8(args.gymId, 8);
    data.writeUInt8(args.monsterIndices.length, 9);
    for (let i = 0; i < args.monsterIndices.length; i++) {
      data.writeUInt8(args.monsterIndices[i], 10 + i);
    }

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: gymPda, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Create a trade listing.
   */
  async createTrade(args: CreateTradeArgs): Promise<string> {
    this.logger.info("Creating trade", {
      monsterIdx: args.offeredMonsterIndex,
      wantedSpecies: args.wantedSpeciesId,
    });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 1 + 2 + 1 + 1);
    INSTRUCTION_DISCRIMINATORS.createTrade.copy(data, 0);
    data.writeUInt8(args.offeredMonsterIndex, 8);
    if (args.wantedSpeciesId !== null) {
      data.writeUInt8(1, 9);
      data.writeUInt16LE(args.wantedSpeciesId, 10);
    } else {
      data.writeUInt8(0, 9);
    }
    data.writeUInt8(args.wantedMinLevel, 12);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Execute a trade with another agent's listing.
   */
  async executeTrade(args: ExecuteTradeArgs): Promise<string> {
    this.logger.info("Executing trade", { tradePubkey: args.tradePubkey.toBase58() });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32 + 1);
    INSTRUCTION_DISCRIMINATORS.executeTrade.copy(data, 0);
    args.tradePubkey.toBuffer().copy(data, 8);
    data.writeUInt8(args.offeredMonsterIndex, 40);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: args.tradePubkey, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Cancel a trade listing.
   */
  async cancelTrade(args: CancelTradeArgs): Promise<string> {
    this.logger.info("Cancelling trade");

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32);
    INSTRUCTION_DISCRIMINATORS.cancelTrade.copy(data, 0);
    args.tradePubkey.toBuffer().copy(data, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: args.tradePubkey, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Heal a single monster.
   */
  async healMonster(args: HealMonsterArgs): Promise<string> {
    this.logger.info("Healing monster", { index: args.monsterIndex });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 1);
    INSTRUCTION_DISCRIMINATORS.healMonster.copy(data, 0);
    data.writeUInt8(args.monsterIndex, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Heal the entire party.
   */
  async healParty(): Promise<string> {
    this.logger.info("Healing full party");

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8);
    INSTRUCTION_DISCRIMINATORS.healParty.copy(data, 0);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Evolve a monster that meets evolution requirements.
   */
  async evolveMonster(args: EvolveMonsterArgs): Promise<string> {
    this.logger.info("Evolving monster", { index: args.monsterIndex });

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 1);
    INSTRUCTION_DISCRIMINATORS.evolveMonster.copy(data, 0);
    data.writeUInt8(args.monsterIndex, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Trigger a wild encounter.
   */
  async wildEncounter(areaSeed: number[]): Promise<string> {
    this.logger.info("Triggering wild encounter");

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 16);
    INSTRUCTION_DISCRIMINATORS.wildEncounter.copy(data, 0);
    Buffer.from(areaSeed).copy(data, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Flee from a battle.
   */
  async fleeBattle(args: FleeBattleArgs): Promise<string> {
    this.logger.info("Fleeing battle");

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32);
    INSTRUCTION_DISCRIMINATORS.fleeBattle.copy(data, 0);
    args.battlePubkey.toBuffer().copy(data, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: args.battlePubkey, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  /**
   * Update the agent's strategy hash on-chain.
   */
  async updateStrategy(args: UpdateStrategyArgs): Promise<string> {
    this.logger.info("Updating strategy hash");

    const [agentPda] = this.getAgentPda();
    const data = Buffer.alloc(8 + 32);
    INSTRUCTION_DISCRIMINATORS.updateStrategy.copy(data, 0);
    Buffer.from(args.strategyHash).copy(data, 8);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });

    return this.sendTransaction([ix]);
  }

  // ============================================================
  // ACCOUNT FETCHING
  // ============================================================

  /**
   * Fetch agent account data.
   */
  async getAgent(authority?: PublicKey): Promise<Agent | null> {
    const [pda] = this.getAgentPda(authority);
    const accountInfo = await this.connection.getAccountInfo(pda, this.commitment);
    if (!accountInfo) return null;
    return this.deserializeAgent(pda, accountInfo.data);
  }

  /**
   * Fetch a monster account.
   */
  async getMonster(monsterPubkey: PublicKey): Promise<Monster | null> {
    const accountInfo = await this.connection.getAccountInfo(monsterPubkey, this.commitment);
    if (!accountInfo) return null;
    return this.deserializeMonster(monsterPubkey, accountInfo.data);
  }

  /**
   * Fetch a battle account.
   */
  async getBattle(battlePubkey: PublicKey): Promise<Battle | null> {
    const accountInfo = await this.connection.getAccountInfo(battlePubkey, this.commitment);
    if (!accountInfo) return null;
    return this.deserializeBattle(battlePubkey, accountInfo.data);
  }

  /**
   * Fetch the leaderboard.
   */
  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    const [pda] = this.getLeaderboardPda();
    const accountInfo = await this.connection.getAccountInfo(pda, this.commitment);
    if (!accountInfo) return [];
    return this.deserializeLeaderboard(accountInfo.data, limit);
  }

  /**
   * Fetch all agents (via getProgramAccounts).
   */
  async getAllAgents(): Promise<Agent[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      commitment: this.commitment,
      filters: [{ dataSize: ACCOUNT_SIZES.AGENT }],
    });
    return accounts
      .map((a) => this.deserializeAgent(a.pubkey, a.account.data))
      .filter((a): a is Agent => a !== null);
  }

  /**
   * Fetch all active trade listings.
   */
  async getActiveTrades(): Promise<TradeListing[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      commitment: this.commitment,
      filters: [{ dataSize: ACCOUNT_SIZES.TRADE }],
    });
    return accounts
      .map((a) => this.deserializeTrade(a.pubkey, a.account.data))
      .filter((t): t is TradeListing => t !== null && t.isActive);
  }

  /**
   * Fetch all active battles.
   */
  async getActiveBattles(): Promise<Battle[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      commitment: this.commitment,
      filters: [{ dataSize: ACCOUNT_SIZES.BATTLE }],
    });
    return accounts
      .map((a) => this.deserializeBattle(a.pubkey, a.account.data))
      .filter(
        (b): b is Battle =>
          b !== null &&
          (b.status === BattleStatus.Active || b.status === BattleStatus.Pending)
      );
  }

  /**
   * Get the SOL balance of the connected wallet.
   */
  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey, this.commitment);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Confirm the connection is healthy.
   */
  async ping(): Promise<boolean> {
    try {
      await this.connection.getSlot(this.commitment);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // DESERIALIZATION
  // ============================================================

  private deserializeAgent(pubkey: PublicKey, data: Buffer): Agent | null {
    try {
      let offset = 8; // skip discriminator
      const authority = new PublicKey(data.subarray(offset, offset + 32));
      offset += 32;

      const nameLen = data.readUInt32LE(offset);
      offset += 4;
      const name = data.subarray(offset, offset + nameLen).toString("utf-8");
      offset += nameLen;

      const partyCount = data.readUInt8(offset);
      offset += 1;
      const party: PublicKey[] = [];
      for (let i = 0; i < partyCount; i++) {
        party.push(new PublicKey(data.subarray(offset, offset + 32)));
        offset += 32;
      }

      const storageCount = data.readUInt8(offset);
      offset += 1;
      const storage: PublicKey[] = [];
      for (let i = 0; i < storageCount; i++) {
        storage.push(new PublicKey(data.subarray(offset, offset + 32)));
        offset += 32;
      }

      const badges: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        badges.push(data.readUInt8(offset) === 1);
        offset += 1;
      }

      const money = data.readUInt32LE(offset); offset += 4;
      const totalBattles = data.readUInt32LE(offset); offset += 4;
      const totalWins = data.readUInt32LE(offset); offset += 4;
      const totalCatches = data.readUInt32LE(offset); offset += 4;
      const totalTrades = data.readUInt32LE(offset); offset += 4;
      const registeredAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const lastActionSlot = Number(data.readBigInt64LE(offset)); offset += 8;

      const strategyHash: number[] = [];
      for (let i = 0; i < 32; i++) {
        strategyHash.push(data.readUInt8(offset));
        offset += 1;
      }

      const isActive = data.readUInt8(offset) === 1;

      return {
        pubkey, authority, name, party, storage, badges,
        money, totalBattles, totalWins, totalCatches, totalTrades,
        registeredAt, lastActionSlot, strategyHash, isActive,
      };
    } catch (err) {
      this.logger.error("Failed to deserialize agent", { error: String(err) });
      return null;
    }
  }

  private deserializeMonster(pubkey: PublicKey, data: Buffer): Monster | null {
    try {
      let offset = 8;
      const owner = new PublicKey(data.subarray(offset, offset + 32));
      offset += 32;
      const speciesId = data.readUInt16LE(offset); offset += 2;

      const hasNick = data.readUInt8(offset); offset += 1;
      let nickname: string | null = null;
      if (hasNick) {
        const nickLen = data.readUInt8(offset); offset += 1;
        nickname = data.subarray(offset, offset + nickLen).toString("utf-8");
        offset += nickLen;
      }

      const level = data.readUInt8(offset); offset += 1;
      const xp = data.readUInt32LE(offset); offset += 4;

      const natureIdx = data.readUInt8(offset); offset += 1;
      const natureNames = [
        "Hardy","Lonely","Brave","Adamant","Naughty","Bold","Docile","Relaxed",
        "Impish","Lax","Timid","Hasty","Serious","Jolly","Naive","Modest",
        "Mild","Quiet","Bashful","Rash","Calm","Gentle","Sassy","Careful","Quirky",
      ];
      const nature = natureNames[natureIdx] ?? "Hardy";

      const ivs = {
        hp: data.readUInt8(offset), attack: data.readUInt8(offset + 1),
        defense: data.readUInt8(offset + 2), spAttack: data.readUInt8(offset + 3),
        spDefense: data.readUInt8(offset + 4), speed: data.readUInt8(offset + 5),
      };
      offset += 6;

      const evs = {
        hp: data.readUInt16LE(offset), attack: data.readUInt16LE(offset + 2),
        defense: data.readUInt16LE(offset + 4), spAttack: data.readUInt16LE(offset + 6),
        spDefense: data.readUInt16LE(offset + 8), speed: data.readUInt16LE(offset + 10),
      };
      offset += 12;

      const currentHp = data.readUInt16LE(offset); offset += 2;
      const maxHp = data.readUInt16LE(offset); offset += 2;

      const moveCount = data.readUInt8(offset); offset += 1;
      const moves = [];
      for (let i = 0; i < moveCount; i++) {
        const moveId = data.readUInt16LE(offset); offset += 2;
        const currentPp = data.readUInt8(offset); offset += 1;
        const moveDef = MOVES[moveId];
        if (moveDef) {
          moves.push({ move: moveDef, currentPp });
        }
      }

      const statusVal = data.readUInt8(offset); offset += 1;
      const statuses = [
        StatusCondition.None, StatusCondition.Burn, StatusCondition.Freeze,
        StatusCondition.Paralysis, StatusCondition.Poison, StatusCondition.BadPoison,
        StatusCondition.Sleep,
      ];
      const status = statuses[statusVal] ?? StatusCondition.None;

      const friendship = data.readUInt8(offset); offset += 1;
      const isShiny = data.readUInt8(offset) === 1; offset += 1;
      const caughtAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const battleCount = data.readUInt32LE(offset); offset += 4;
      const winCount = data.readUInt32LE(offset); offset += 4;

      return {
        pubkey, owner, speciesId, nickname, level, xp, nature,
        ivs, evs, currentHp, maxHp, moves, status,
        friendship, isShiny, caughtAt, battleCount, winCount,
      };
    } catch (err) {
      this.logger.error("Failed to deserialize monster", { error: String(err) });
      return null;
    }
  }

  private deserializeBattle(pubkey: PublicKey, data: Buffer): Battle | null {
    try {
      let offset = 8;
      const challenger = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const defender = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const challengerMonster = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const defenderMonster = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const turn = data.readUInt16LE(offset); offset += 2;
      const challengerHp = data.readUInt16LE(offset); offset += 2;
      const defenderHp = data.readUInt16LE(offset); offset += 2;
      const statusVal = data.readUInt8(offset); offset += 1;
      const battleStatuses = [BattleStatus.Pending, BattleStatus.Active, BattleStatus.Completed, BattleStatus.Cancelled];
      const battleStatus = battleStatuses[statusVal] ?? BattleStatus.Pending;
      const hasWinner = data.readUInt8(offset); offset += 1;
      const winner = hasWinner ? new PublicKey(data.subarray(offset, offset + 32)) : null; offset += 32;
      const seed = Array.from(data.subarray(offset, offset + 16)); offset += 16;
      const startedAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const lastMoveSlot = Number(data.readBigInt64LE(offset)); offset += 8;

      return {
        pubkey, challenger, defender, challengerMonster, defenderMonster,
        turn, challengerHp, defenderHp, status: battleStatus, winner,
        seed, startedAt, lastMoveSlot,
      };
    } catch (err) {
      this.logger.error("Failed to deserialize battle", { error: String(err) });
      return null;
    }
  }

  private deserializeTrade(pubkey: PublicKey, data: Buffer): TradeListing | null {
    try {
      let offset = 8;
      const owner = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const offeredMonster = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const hasWanted = data.readUInt8(offset); offset += 1;
      const wantedSpeciesId = hasWanted ? data.readUInt16LE(offset) : null; offset += 2;
      const wantedMinLevel = data.readUInt8(offset); offset += 1;
      const createdAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const isActive = data.readUInt8(offset) === 1;

      return { pubkey, owner, offeredMonster, wantedSpeciesId, wantedMinLevel, createdAt, isActive };
    } catch (err) {
      this.logger.error("Failed to deserialize trade", { error: String(err) });
      return null;
    }
  }

  private deserializeLeaderboard(data: Buffer, limit: number): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    try {
      let offset = 8;
      const count = data.readUInt16LE(offset); offset += 2;
      const toRead = Math.min(count, limit);

      for (let i = 0; i < toRead; i++) {
        const agent = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
        const nameLen = data.readUInt8(offset); offset += 1;
        const name = data.subarray(offset, offset + nameLen).toString("utf-8"); offset += nameLen;
        const totalWins = data.readUInt32LE(offset); offset += 4;
        const totalCatches = data.readUInt32LE(offset); offset += 4;
        const badges = data.readUInt8(offset); offset += 1;
        const score = data.readUInt32LE(offset); offset += 4;

        entries.push({ rank: i + 1, agent, name, totalWins, totalCatches, badges, score });
      }
    } catch (err) {
      this.logger.error("Failed to deserialize leaderboard", { error: String(err) });
    }
    return entries;
  }

  // ============================================================
  // TRANSACTION HELPERS
  // ============================================================

  private async sendTransaction(
    instructions: TransactionInstruction[],
    options?: SendOptions
  ): Promise<string> {
    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash(this.commitment);
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = this.wallet.publicKey;

    for (const ix of instructions) {
      tx.add(ix);
    }

    tx.sign(this.wallet);

    const sig = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      ...options,
    });

    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      this.commitment
    );

    this.logger.info("Transaction confirmed", { signature: sig });
    return sig;
  }
}