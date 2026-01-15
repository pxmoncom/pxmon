"""XP curve and level-up logic for PXMON monsters."""

from dataclasses import dataclass
from typing import Optional


# Medium-fast XP curve: xp_for_level = level^3
# Total XP needed to reach a given level
def xp_for_level(level: int) -> int:
    """Calculate total XP required to reach a specific level."""
    if level <= 1:
        return 0
    return level ** 3


def xp_to_next_level(current_level: int) -> int:
    """Calculate XP needed from current level to next level."""
    if current_level >= 100:
        return 0
    return xp_for_level(current_level + 1) - xp_for_level(current_level)


def xp_remaining(current_level: int, current_xp: int) -> int:
    """Calculate remaining XP needed to level up."""
    needed = xp_for_level(current_level + 1)
    return max(0, needed - current_xp)


@dataclass
class XpGainResult:
    xp_gained: int
    new_total_xp: int
    old_level: int
    new_level: int
    levels_gained: int
    leftover_xp: int


def calculate_xp_gain(
    current_xp: int,
    current_level: int,
    base_xp_yield: int,
    enemy_level: int,
    is_wild: bool = True,
    lucky_egg: bool = False,
    traded: bool = False,
) -> XpGainResult:
    """
    Calculate XP gained from defeating a monster.

    Formula based on classic RPG mechanics:
    base = (base_xp_yield * enemy_level) / 5
    wild_mod = 1.0 if wild, 1.5 if trainer
    lucky_mod = 1.5 if lucky_egg
    trade_mod = 1.5 if traded
    level_scale = (2 * enemy_level + 10) / (enemy_level + current_level + 10)
    total = base * wild_mod * lucky_mod * trade_mod * level_scale
    """
    base = (base_xp_yield * enemy_level) / 5.0
    wild_mod = 1.0 if is_wild else 1.5
    lucky_mod = 1.5 if lucky_egg else 1.0
    trade_mod = 1.5 if traded else 1.0
    level_scale = (2.0 * enemy_level + 10.0) / (enemy_level + current_level + 10.0)

    raw_xp = base * wild_mod * lucky_mod * trade_mod * level_scale
    xp_gained = max(1, int(raw_xp))

    new_total = current_xp + xp_gained
    old_level = current_level
    new_level = current_level

    while new_level < 100:
        threshold = xp_for_level(new_level + 1)
        if new_total >= threshold:
            new_level += 1
        else:
            break

    levels_gained = new_level - old_level
    leftover = new_total - xp_for_level(new_level) if new_level < 100 else 0

    return XpGainResult(
        xp_gained=xp_gained,
        new_total_xp=new_total,
        old_level=old_level,
        new_level=new_level,
        levels_gained=levels_gained,
        leftover_xp=leftover,
    )


@dataclass
class StatGrowth:
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int


def calculate_stat_at_level(
    base_stat: int,
    iv: int,
    ev: int,
    level: int,
    is_hp: bool = False,
) -> int:
    """
    Calculate a stat value at a given level.

    HP formula: ((2*base + iv + ev/4) * level / 100) + level + 10
    Other stats: ((2*base + iv + ev/4) * level / 100) + 5
    """
    core = ((2 * base_stat + iv + ev // 4) * level) // 100
    if is_hp:
        return core + level + 10
    return core + 5


def calculate_level_up_stats(
    base_stats: StatGrowth,
    ivs: StatGrowth,
    evs: StatGrowth,
    new_level: int,
) -> StatGrowth:
    """Calculate all stats for a monster at a given level."""
    return StatGrowth(
        hp=calculate_stat_at_level(base_stats.hp, ivs.hp, evs.hp, new_level, is_hp=True),
        attack=calculate_stat_at_level(base_stats.attack, ivs.attack, evs.attack, new_level),
        defense=calculate_stat_at_level(base_stats.defense, ivs.defense, evs.defense, new_level),
        sp_attack=calculate_stat_at_level(base_stats.sp_attack, ivs.sp_attack, evs.sp_attack, new_level),
        sp_defense=calculate_stat_at_level(base_stats.sp_defense, ivs.sp_defense, evs.sp_defense, new_level),
        speed=calculate_stat_at_level(base_stats.speed, ivs.speed, evs.speed, new_level),
    )


@dataclass
class EvolutionCheck:
    can_evolve: bool
    evolution_id: Optional[str]
    method: str


def check_evolution(
    species_id: str,
    current_level: int,
    evolution_table: dict[str, list[dict]],
) -> EvolutionCheck:
    """Check if a monster can evolve at the current level."""
    if species_id not in evolution_table:
        return EvolutionCheck(can_evolve=False, evolution_id=None, method="none")

    for evo in evolution_table[species_id]:
        method = evo.get("method", "level")
        if method == "level" and current_level >= evo.get("level", 999):
            return EvolutionCheck(
                can_evolve=True,
                evolution_id=evo["target"],
                method="level",
            )
        elif method == "item" and evo.get("item_available", False):
            return EvolutionCheck(
                can_evolve=True,
                evolution_id=evo["target"],
                method="item",
            )
        elif method == "trade" and evo.get("trade_pending", False):
            return EvolutionCheck(
                can_evolve=True,
                evolution_id=evo["target"],
                method="trade",
            )

    return EvolutionCheck(can_evolve=False, evolution_id=None, method="none")