# PXMON Architecture

## Overview

PXMON is a four-layer system: blockchain, API, agent, and client. Each layer has a distinct responsibility, and communication flows through well-defined interfaces.

```
Client Layer (CLI, SDK)
        |
        v
Agent Layer (Python strategies + decision engine)
        |
        v
API Layer (REST + WebSocket, PostgreSQL)
        |
        v
Blockchain Layer (Anchor program on Solana)
```

## Blockchain Layer

### On-chain Program (`programs/pxmon/`)

The Anchor program is the source of truth for all game state. It stores trainer profiles, monster ownership, battle outcomes, and badge records as on-chain accounts.

#### Account Structure

| Account | Seeds | Description |
|---------|-------|-------------|
| `Trainer` | `[b"trainer", wallet]` | Trainer profile, level, current zone |
| `Monster` | `[b"monster", trainer, index]` | Individual monster stats, moves, XP |
| `Battle` | `[b"battle", id]` | Active battle state, turns, participants |
| `Gym` | `[b"gym", gym_id]` | Gym leader config, badge tracking |
| `WorldState` | `[b"world"]` | Global game parameters, epoch data |
| `Badge` | `[b"badge", trainer, gym_id]` | Badge proof for a trainer |

#### Instructions

| Instruction | Signers | Description |
|-------------|---------|-------------|
| `register_trainer` | wallet | Create trainer account, assign starter |
| `init_wild_battle` | wallet | Start encounter with RNG-selected monster |
| `init_gym_battle` | wallet | Challenge a gym leader |
| `submit_move` | wallet | Submit battle action (attack, capture, flee) |
| `resolve_turn` | authority | Process turn outcome, update HP/status |
| `end_battle` | authority | Finalize battle, distribute XP/badges |
| `move_zone` | wallet | Move trainer to adjacent zone |
| `heal_team` | wallet | Restore team HP at heal station |
| `evolve_monster` | wallet | Trigger evolution if conditions met |

#### On-chain RNG

Randomness is derived from a combination of the slot hash, the trainer's transaction count, and a per-battle nonce. This provides sufficient unpredictability for encounter generation, damage variance, and capture probability without requiring an oracle.

```
seed = hash(slot_hash + trainer_nonce + battle_nonce)
roll = seed[0..8] as u64 % range
```

### Account Sizing

All accounts use fixed-size layouts to avoid reallocation:

| Account | Size (bytes) | Rent (SOL) |
|---------|-------------|------------|
| Trainer | 256 | 0.00178 |
| Monster | 512 | 0.00356 |
| Battle | 1024 | 0.00712 |
| Gym | 384 | 0.00267 |
| Badge | 64 | 0.00089 |

## API Layer

### REST Server (`api/`)

An Express.js server that provides a stateful interface over the on-chain program. It reads blockchain state, maintains a PostgreSQL cache for fast queries, and constructs transactions for clients.

#### Core Services

| Service | Responsibility |
|---------|---------------|
| `TrainerService` | Registration, profile lookup, inventory management |
| `BattleService` | Battle creation, move submission, turn resolution |
| `WorldService` | Zone movement, encounter generation, healing |
| `MonsterService` | Monster lookup, evolution checks, move learning |
| `SyncService` | Blockchain-to-database state synchronization |

#### Database Schema

The PostgreSQL database mirrors on-chain state for fast reads and adds computed fields:

- `trainers` -- Cached trainer profiles with win/loss record
- `monsters` -- Cached monster data with computed power rating
- `battles` -- Battle history with replay data
- `zones` -- Zone metadata, encounter tables, adjacency graph
- `leaderboard` -- Computed rankings by badges, level, win rate

#### Sync Strategy

The `SyncService` runs a continuous loop:

1. Subscribe to program log events via WebSocket RPC
2. Parse transaction logs for state-changing instructions
3. Update PostgreSQL with the new state
4. Emit WebSocket events to connected clients

Sync lag target: under 2 seconds from transaction confirmation.

### WebSocket Feed

Real-time event stream for monitoring the world:

```typescript
interface PxmonEvent {
  type: string;        // event type identifier
  timestamp: number;   // unix ms
  data: unknown;       // event-specific payload
  txSignature: string; // originating transaction
}
```

Events are broadcast to all connected clients. Clients can subscribe to filtered channels (e.g., only battles, only a specific trainer).

## Agent Layer

### Agent Scripts (`agents/`)

Python scripts that run autonomous trainers. Each agent loads a strategy configuration and makes decisions in a loop.

#### Agent Lifecycle

```
1. Load config (strategy, thresholds, target zone)
2. Register trainer (if new)
3. Main loop:
   a. Check team health -> heal if below threshold
   b. Check zone -> move if exploration weight triggers
   c. Hunt for wild monsters -> capture or battle
   d. Check gym eligibility -> challenge if ready
   e. Sleep for tick interval
```

#### Strategy Engine

Strategies are defined as a set of weights and thresholds:

```python
@dataclass
class Strategy:
    name: str
    capture_threshold: float    # HP% below which to attempt capture
    heal_threshold: float       # Team HP% below which to heal
    flee_threshold: float       # Own HP% below which to flee
    exploration_weight: float   # Probability of moving zones per tick
    gym_min_level: int          # Minimum team level to challenge gym
    type_preference: str | None # Preferred monster type to capture
    move_selection: str         # "highest_damage" | "type_advantage" | "random"
```

#### Decision Module

The decision module evaluates the current game state and selects an action:

1. **State Assessment**: Read trainer status, team HP, current zone, available actions
2. **Priority Queue**: Rank possible actions by urgency (heal > flee > gym > hunt > explore)
3. **Action Selection**: Execute the highest-priority action that passes threshold checks
4. **Outcome Logging**: Record the action and result for strategy tuning

## Client Layer

### SDK (`sdk/`)

TypeScript library that wraps Solana RPC calls and API requests:

- `PxmonClient` -- Main entry point, handles connection and signing
- `InstructionBuilder` -- Constructs Anchor program instructions
- `AccountFetcher` -- Deserializes on-chain accounts
- `ApiClient` -- REST API wrapper with retry logic

### CLI (`cli/`)

Command-line interface built on Commander.js. Provides direct access to all game actions:

- `pxmon register <name>` -- Register trainer
- `pxmon status` -- View profile
- `pxmon hunt` -- Find wild monsters
- `pxmon gym <id>` -- Challenge gym
- `pxmon heal` -- Heal team
- `pxmon move <zone>` -- Move to zone

## Data Flow Example: Wild Encounter

```
1. Agent decides to hunt
2. Agent calls SDK.initWildBattle(trainerAddress)
3. SDK sends POST /api/v1/battle/wild
4. API constructs init_wild_battle instruction
5. API submits transaction to Solana
6. On-chain program:
   a. Derives encounter from RNG seed
   b. Creates Battle account
   c. Initializes wild monster stats
   d. Emits BattleStarted log
7. SyncService picks up log event
8. Database updated with new battle
9. WebSocket broadcasts battle:start event
10. API returns battle details to SDK
11. Agent receives encounter data
12. Agent strategy evaluates: fight or capture?
```

## Deployment Architecture

### Production

- On-chain program deployed to Solana mainnet-beta
- API server on a single VPS with PostgreSQL
- Agents run as individual processes (one per trainer)
- WebSocket connections proxied through nginx

### Development

- On-chain program on localnet
- API server on localhost with local PostgreSQL
- Agents run in the same terminal for debugging
- No proxy needed