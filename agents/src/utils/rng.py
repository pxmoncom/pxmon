"""Seeded RNG for deterministic replays in PXMON."""

import hashlib
import struct
from typing import List, Optional, Sequence, TypeVar

T = TypeVar("T")


class SeededRNG:
    """
    Xorshift128+ based PRNG for deterministic game logic.
    Allows replaying exact same sequence of events from a seed.
    """

    def __init__(self, seed: int) -> None:
        self._seed = seed
        self._state_a: int = seed & 0xFFFFFFFFFFFFFFFF
        self._state_b: int = (seed >> 64 if seed > 0xFFFFFFFFFFFFFFFF else seed ^ 0x6A09E667F3BCC908) & 0xFFFFFFFFFFFFFFFF
        if self._state_a == 0:
            self._state_a = 1
        if self._state_b == 0:
            self._state_b = 1
        self._call_count: int = 0

    @classmethod
    def from_string(cls, seed_string: str) -> "SeededRNG":
        """Create RNG from a string seed using SHA-256 hash."""
        h = hashlib.sha256(seed_string.encode("utf-8")).digest()
        numeric_seed = int.from_bytes(h[:16], byteorder="big")
        return cls(numeric_seed)

    @property
    def seed(self) -> int:
        return self._seed

    @property
    def call_count(self) -> int:
        return self._call_count

    def _next_raw(self) -> int:
        """Generate next raw 64-bit unsigned integer."""
        s0 = self._state_a
        s1 = self._state_b

        result = (s0 + s1) & 0xFFFFFFFFFFFFFFFF

        s1 ^= s0
        self._state_a = (((s0 << 24) | (s0 >> 40)) & 0xFFFFFFFFFFFFFFFF) ^ s1 ^ ((s1 << 16) & 0xFFFFFFFFFFFFFFFF)
        self._state_b = ((s1 << 37) | (s1 >> 27)) & 0xFFFFFFFFFFFFFFFF

        self._call_count += 1
        return result

    def next_float(self) -> float:
        """Generate a float in [0.0, 1.0)."""
        raw = self._next_raw()
        return (raw >> 11) / (1 << 53)

    def next_int(self, min_val: int, max_val: int) -> int:
        """Generate an integer in [min_val, max_val] inclusive."""
        if min_val >= max_val:
            return min_val
        range_size = max_val - min_val + 1
        raw = self._next_raw()
        return min_val + (raw % range_size)

    def next_bool(self, probability: float = 0.5) -> bool:
        """Generate a boolean with given probability of True."""
        return self.next_float() < probability

    def choice(self, items: Sequence[T]) -> T:
        """Pick a random item from a sequence."""
        if len(items) == 0:
            raise ValueError("Cannot choose from empty sequence")
        idx = self.next_int(0, len(items) - 1)
        return items[idx]

    def weighted_choice(self, items: Sequence[T], weights: Sequence[float]) -> T:
        """Pick a random item with weighted probabilities."""
        if len(items) == 0:
            raise ValueError("Cannot choose from empty sequence")
        if len(items) != len(weights):
            raise ValueError("Items and weights must be same length")

        total = sum(weights)
        if total <= 0:
            return self.choice(items)

        roll = self.next_float() * total
        cumulative = 0.0
        for item, weight in zip(items, weights):
            cumulative += weight
            if roll < cumulative:
                return item
        return items[-1]

    def shuffle(self, items: List[T]) -> List[T]:
        """Fisher-Yates shuffle, returns new list."""
        result = list(items)
        for i in range(len(result) - 1, 0, -1):
            j = self.next_int(0, i)
            result[i], result[j] = result[j], result[i]
        return result

    def sample(self, items: Sequence[T], count: int) -> List[T]:
        """Sample without replacement."""
        if count > len(items):
            count = len(items)
        pool = list(items)
        result: List[T] = []
        for _ in range(count):
            idx = self.next_int(0, len(pool) - 1)
            result.append(pool.pop(idx))
        return result

    def normal(self, mean: float = 0.0, std: float = 1.0) -> float:
        """Generate normally distributed value using Box-Muller transform."""
        import math
        u1 = self.next_float()
        u2 = self.next_float()
        while u1 == 0.0:
            u1 = self.next_float()
        z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        return mean + z0 * std

    def fork(self, label: str = "") -> "SeededRNG":
        """Create a child RNG with a deterministic but different sequence."""
        child_seed = self._next_raw() ^ hash(label)
        return SeededRNG(child_seed & 0xFFFFFFFFFFFFFFFF)

    def snapshot(self) -> dict:
        """Save current state for serialization."""
        return {
            "seed": self._seed,
            "state_a": self._state_a,
            "state_b": self._state_b,
            "call_count": self._call_count,
        }

    @classmethod
    def restore(cls, snapshot: dict) -> "SeededRNG":
        """Restore from a snapshot."""
        rng = cls(snapshot["seed"])
        rng._state_a = snapshot["state_a"]
        rng._state_b = snapshot["state_b"]
        rng._call_count = snapshot["call_count"]
        return rng