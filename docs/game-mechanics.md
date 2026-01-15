# PXMON Game Mechanics

## World Map

The world consists of interconnected zones arranged in a graph structure. Each zone has:

- **Terrain type**: Grassland, Forest, Cave, Mountain, Water, Urban, Desert, Tundra
- **Level range**: Determines the level of wild monsters encountered
- **Encounter rate**: Base probability of finding a wild monster per tick (5%-40%)
- **Weather**: Clear, Rain, Sandstorm, Snow, Fog -- affects type effectiveness and encounter rates
- **Facilities**: Heal stations and gyms are located in specific zones

### Zone Adjacency

Zones connect to 2-4 neighboring zones. Moving between zones costs one action and triggers a zone-enter event. Some zone transitions require a minimum badge count.

### Time System

The world runs on a 24-hour clock synced to UTC. Time of day affects:

- Encounter tables (some monsters only appear at night)
- Weather patterns (rain more common in evening)
- Gym availability (gyms close from 00:00-06:00 UTC)

## Monsters

### Stats

Every monster has six base stats:

| Stat | Abbreviation | Effect |
|------|-------------|--------|
| Hit Points | HP | Total damage a monster can take |
| Attack | ATK | Physical move damage multiplier |
| Defense | DEF | Physical damage reduction |
| Speed | SPD | Turn order priority |
| Special Attack | SP.ATK | Special move damage multiplier |
| Special Defense | SP.DEF | Special damage reduction |

### Individual Values (IVs)

Each monster instance has randomized IVs from 0-31 for each stat, determined at encounter time. IVs are permanent and cannot be changed.

### Effective Stats

```
effective_stat = floor(((2 * base + iv) * level / 100) + 5)
effective_hp = floor(((2 * base_hp + iv_hp) * level / 100) + level + 10)
```

### Level and Experience

Monsters gain XP from battles. The XP required for each level follows a cubic curve:

```
xp_for_level(n) = floor(n^3 * 0.8)
```

XP gain from defeating a monster:

```
xp_gain = floor(base_xp * defeated_level / 5 * (1 + 0.5 * is_trainer_battle))
```

### Evolution

Monsters evolve when reaching specific level thresholds. Evolution changes:

- Base stats (usually increase by 15-30%)
- Appearance and name
- Learnable move pool
- Possibly adds a secondary type

Evolution is checked automatically after XP gain. The trainer can delay evolution, but it triggers on the next level-up.

### Monster Index

There are 94 unique monster species across all 17 types. Distribution:

| Type | Count | Level Range |
|------|-------|-------------|
| Normal | 8 | 3-45 |
| Fire | 6 | 8-55 |
| Water | 7 | 5-50 |
| Grass | 6 | 5-48 |
| Electric | 5 | 10-52 |
| Ice | 4 | 20-58 |
| Fighting | 6 | 8-50 |
| Poison | 5 | 5-45 |
| Ground | 5 | 12-52 |
| Flying | 6 | 5-48 |
| Psychic | 5 | 15-55 |
| Bug | 7 | 3-40 |
| Rock | 5 | 10-50 |
| Ghost | 4 | 18-55 |
| Dragon | 4 | 25-65 |
| Dark | 5 | 15-55 |
| Steel | 6 | 15-58 |

## Type System

### 17 Types

Normal, Fire, Water, Grass, Electric, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel

### Effectiveness

Moves have a type. When a move's type is strong against the target's type, it deals 2x damage. When weak, 0.5x. Some combinations are immune (0x).

Key matchups:

| Attacker | Strong Against | Weak Against | Immune |
|----------|---------------|--------------|--------|
| Fire | Grass, Ice, Bug, Steel | Water, Rock, Fire, Dragon | -- |
| Water | Fire, Ground, Rock | Water, Grass, Dragon | -- |
| Grass | Water, Ground, Rock | Fire, Grass, Poison, Flying, Bug, Dragon, Steel | -- |
| Electric | Water, Flying | Grass, Electric, Dragon | Ground |
| Ground | Fire, Electric, Poison, Rock, Steel | Grass, Bug | Flying |
| Ghost | Psychic, Ghost | Dark | Normal |
| Dragon | Dragon | Steel | -- |
| Steel | Ice, Rock, Fairy | Fire, Water, Electric, Steel | -- |
| Dark | Psychic, Ghost | Fighting, Dark | -- |

For dual-type monsters, multiply both type multipliers:

```
total_multiplier = type1_multiplier * type2_multiplier
```

This means a 4x weakness is possible (e.g., Ground move vs. Fire/Steel monster).

### STAB (Same Type Attack Bonus)

When a monster uses a move matching its own type, the move gets a 1.5x damage bonus.

## Battle System

### Turn Structure

Each turn:

1. Both participants select a move
2. Speed comparison determines who acts first
3. First monster executes move
4. If target is still standing, second monster executes move
5. End-of-turn effects apply (poison, burn, etc.)

### Speed Priority

The faster monster acts first. If speeds are equal, a coin flip determines order. Some moves have priority modifiers (+1 or -1) that override speed.

### Damage Formula

```
damage = floor(
  ((2 * level / 5 + 2) * power * atk / def / 50 + 2)
  * stab
  * type_effectiveness
  * critical
  * random_factor
)
```

Where:

- `level` = attacker's level
- `power` = move's base power
- `atk` = attacker's ATK or SP.ATK (depending on move category)
- `def` = defender's DEF or SP.DEF (depending on move category)
- `stab` = 1.5 if move type matches attacker type, else 1.0
- `type_effectiveness` = 0, 0.25, 0.5, 1, 2, or 4
- `critical` = 1.5 on critical hit (6.25% base chance), else 1.0
- `random_factor` = random value from 0.85 to 1.00

Minimum damage is always 1 (unless immune).

### Status Conditions

| Status | Effect | Duration |
|--------|--------|----------|
| Burn | Lose 1/16 max HP per turn, ATK halved | Until healed |
| Poison | Lose 1/8 max HP per turn | Until healed |
| Paralysis | 25% chance to skip turn, SPD halved | Until healed |
| Sleep | Cannot act | 1-3 turns |
| Freeze | Cannot act | Thaws 20% chance per turn |
| Confusion | 33% chance to hit self | 1-4 turns |

A monster can only have one primary status (burn/poison/paralysis/sleep/freeze) at a time. Confusion stacks with primary status.

### Capture Mechanics

Wild monsters can be captured during battle. Capture probability:

```
capture_rate = base_rate * hp_modifier * status_modifier

hp_modifier = (3 * max_hp - 2 * current_hp) / (3 * max_hp)
status_modifier:
  sleep/freeze = 2.0
  paralysis/burn/poison = 1.5
  none = 1.0

base_rate = species_capture_rate / 255
```

A random roll from 0-1 is compared against `capture_rate`. If the roll is less than or equal, capture succeeds.

Rare monsters have lower base capture rates (as low as 3/255). Common monsters have higher rates (up to 200/255).

### Battle Outcomes

**Wild battle victory**: Gain XP, monster faints, encounter ends.

**Wild battle capture**: Gain the monster, it joins the team (or storage if team is full).

**Wild battle flee**: No XP gain, encounter ends. Flee success rate is 100% if your monster is faster.

**Gym battle victory**: Gain XP, earn the gym badge, unlock next tier.

**Gym battle defeat**: No badge, can retry after healing.

## Gyms

### Gym List

| # | Name | Type | Leader Level | Tier |
|---|------|------|-------------|------|
| 1 | Stoneguard | Rock | 14 | Bronze |
| 2 | Tidecrest | Water | 18 | Bronze |
| 3 | Thornveil | Grass | 22 | Bronze |
| 4 | Emberpeak | Fire | 26 | Bronze |
| 5 | Voltspire | Electric | 32 | Silver |
| 6 | Frostholm | Ice | 36 | Silver |
| 7 | Shadowmere | Dark | 40 | Silver |
| 8 | Irondeep | Steel | 44 | Silver |
| 9 | Windreach | Flying | 50 | Gold |
| 10 | Mindspire | Psychic | 54 | Gold |
| 11 | Drakemaw | Dragon | 58 | Gold |
| 12 | Voidgate | Ghost | 62 | Gold |

### Gym Rules

- Trainers must have the required badge count to challenge a gym
- Gym leaders have a fixed team of 3-6 monsters depending on tier
- No items allowed during gym battles
- Gym battles use standard battle rules
- Defeating a gym leader awards one badge (non-repeatable)
- All 12 badges qualify a trainer for the Champion League

### Champion League

Trainers with all 12 badges enter a bracket tournament against other qualified trainers. The Champion League resets every epoch (7 days). The top-ranked trainer at the end of an epoch receives the Champion title.

## Healing

Heal stations are located in specific zones (roughly every 3-4 zones). Healing restores all team monsters to full HP and removes all status conditions. Healing is free but has a cooldown of 10 minutes.

## Team Management

- Maximum team size: 6 monsters
- Captured monsters beyond 6 go to storage
- Monsters can be swapped between team and storage at heal stations
- Team order determines which monster leads (first to battle)

## Economy

There is no in-game currency. All progression is through battles, captures, and badges. This keeps the system purely skill-based and prevents pay-to-win dynamics.