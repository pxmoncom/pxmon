/**
 * Deterministic RNG matching the on-chain Xorshift128+ implementation.
 * Used for encounter generation, catch calculations, and damage rolls.
 */
export class DeterministicRng {
  private state0: bigint;
  private state1: bigint;

  constructor(seed: number[] | Uint8Array) {
    if (seed.length < 16) {
      throw new Error("Seed must be at least 16 bytes");
    }
    this.state0 = bytesToU64(seed, 0);
    this.state1 = bytesToU64(seed, 8);
    if (this.state0 === 0n && this.state1 === 0n) {
      this.state0 = 1n;
    }
  }

  /**
   * Generate next u64 value using Xorshift128+.
   */
  nextU64(): bigint {
    let s1 = this.state0;
    const s0 = this.state1;
    const result = (s0 + s1) & 0xFFFFFFFFFFFFFFFFn;
    this.state0 = s0;
    s1 ^= (s1 << 23n) & 0xFFFFFFFFFFFFFFFFn;
    this.state1 = s1 ^ s0 ^ (s1 >> 17n) ^ (s0 >> 26n);
    return result;
  }

  /**
   * Generate a random u32 value.
   */
  nextU32(): number {
    return Number(this.nextU64() & 0xFFFFFFFFn);
  }

  /**
   * Generate a random number in [0, max) range.
   */
  nextRange(max: number): number {
    if (max <= 0) return 0;
    return this.nextU32() % max;
  }

  /**
   * Generate a random float in [0, 1) range.
   */
  nextFloat(): number {
    return this.nextU32() / 0x100000000;
  }

  /**
   * Generate a random float in [min, max) range.
   */
  nextFloatRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  /**
   * Generate a random boolean with given probability (0.0 to 1.0).
   */
  nextBool(probability: number = 0.5): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Pick a random element from an array.
   */
  pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error("Cannot pick from empty array");
    return arr[this.nextRange(arr.length)];
  }

  /**
   * Shuffle an array in place using Fisher-Yates.
   */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextRange(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generate IVs (6 values, each 0-31).
   */
  generateIVs(): {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  } {
    return {
      hp: this.nextRange(32),
      attack: this.nextRange(32),
      defense: this.nextRange(32),
      spAttack: this.nextRange(32),
      spDefense: this.nextRange(32),
      speed: this.nextRange(32),
    };
  }

  /**
   * Determine if a catch succeeds based on catch rate and ball modifier.
   */
  rollCatch(catchRate: number, ballModifier: number, hpFraction: number): boolean {
    const modifiedRate = Math.floor(
      ((3 * 255 - 2 * Math.floor(255 * hpFraction)) * catchRate * ballModifier) /
        (3 * 255)
    );
    const threshold = Math.min(modifiedRate, 255);
    return this.nextRange(256) < threshold;
  }

  /**
   * Roll for shiny status (1/4096 base rate).
   */
  rollShiny(): boolean {
    return this.nextRange(4096) === 0;
  }

  /**
   * Roll a nature index (0-24).
   */
  rollNature(): number {
    return this.nextRange(25);
  }

  /**
   * Roll for critical hit (base 1/16).
   */
  rollCritical(stage: number = 0): boolean {
    const rates = [16, 8, 2, 1];
    const rate = rates[Math.min(stage, 3)];
    return this.nextRange(rate) === 0;
  }

  /**
   * Roll damage variance (85-100 inclusive).
   */
  rollDamageVariance(): number {
    return 85 + this.nextRange(16);
  }

  /**
   * Roll accuracy check.
   */
  rollAccuracy(accuracy: number): boolean {
    return this.nextRange(100) < accuracy;
  }

  /**
   * Generate encounter seed from slot hash and agent pubkey bytes.
   */
  static fromSlotAndAgent(slotHash: Uint8Array, agentBytes: Uint8Array): DeterministicRng {
    const seed = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      seed[i] = slotHash[i % slotHash.length] ^ agentBytes[i % agentBytes.length];
    }
    for (let i = 8; i < 16; i++) {
      seed[i] =
        slotHash[(i + 8) % slotHash.length] ^
        agentBytes[(i + 8) % agentBytes.length];
    }
    return new DeterministicRng(seed);
  }

  /**
   * Create from a simple numeric seed (for testing).
   */
  static fromSeed(seed: number): DeterministicRng {
    const bytes = new Uint8Array(16);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, seed, true);
    view.setUint32(4, seed ^ 0xDEADBEEF, true);
    view.setUint32(8, seed ^ 0xCAFEBABE, true);
    view.setUint32(12, seed ^ 0x12345678, true);
    return new DeterministicRng(bytes);
  }

  /**
   * Get current state (for save/restore).
   */
  getState(): { state0: bigint; state1: bigint } {
    return { state0: this.state0, state1: this.state1 };
  }

  /**
   * Restore from saved state.
   */
  setState(state: { state0: bigint; state1: bigint }): void {
    this.state0 = state.state0;
    this.state1 = state.state1;
  }
}

function bytesToU64(bytes: number[] | Uint8Array, offset: number): bigint {
  let result = 0n;
  for (let i = 0; i < 8; i++) {
    result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
  }
  return result;
}

/**
 * Hash a string to a seed byte array (simple FNV-1a for determinism).
 */
export function hashToSeed(input: string): Uint8Array {
  const FNV_OFFSET = 0x811C9DC5n;
  const FNV_PRIME = 0x01000193n;
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_PRIME) & 0xFFFFFFFFn;
  }
  const seed = new Uint8Array(16);
  const view = new DataView(seed.buffer);
  view.setUint32(0, Number(hash), true);
  view.setUint32(4, Number((hash >> 8n) ^ 0xA5A5A5A5n), true);
  view.setUint32(8, Number((hash >> 16n) ^ 0x5A5A5A5An), true);
  view.setUint32(12, Number(hash ^ 0xFFFF0000n), true);
  return seed;
}