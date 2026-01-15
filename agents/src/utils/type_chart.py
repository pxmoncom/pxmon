"""Type effectiveness chart for PXMON - 17 types with full matchup table."""

from enum import Enum
from typing import Dict, Tuple


class MonsterType(Enum):
    NORMAL = "normal"
    FIRE = "fire"
    WATER = "water"
    GRASS = "grass"
    ELECTRIC = "electric"
    ICE = "ice"
    FIGHTING = "fighting"
    POISON = "poison"
    GROUND = "ground"
    FLYING = "flying"
    PSYCHIC = "psychic"
    BUG = "bug"
    ROCK = "rock"
    GHOST = "ghost"
    DRAGON = "dragon"
    DARK = "dark"
    STEEL = "steel"


SUPER_EFFECTIVE = 2.0
NOT_VERY_EFFECTIVE = 0.5
NO_EFFECT = 0.0
NEUTRAL = 1.0

# Attacking type -> Defending type -> multiplier
# Only storing non-neutral matchups to keep it manageable
_CHART: Dict[MonsterType, Dict[MonsterType, float]] = {
    MonsterType.NORMAL: {
        MonsterType.ROCK: NOT_VERY_EFFECTIVE,
        MonsterType.GHOST: NO_EFFECT,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.FIRE: {
        MonsterType.FIRE: NOT_VERY_EFFECTIVE,
        MonsterType.WATER: NOT_VERY_EFFECTIVE,
        MonsterType.GRASS: SUPER_EFFECTIVE,
        MonsterType.ICE: SUPER_EFFECTIVE,
        MonsterType.BUG: SUPER_EFFECTIVE,
        MonsterType.ROCK: NOT_VERY_EFFECTIVE,
        MonsterType.DRAGON: NOT_VERY_EFFECTIVE,
        MonsterType.STEEL: SUPER_EFFECTIVE,
    },
    MonsterType.WATER: {
        MonsterType.FIRE: SUPER_EFFECTIVE,
        MonsterType.WATER: NOT_VERY_EFFECTIVE,
        MonsterType.GRASS: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: SUPER_EFFECTIVE,
        MonsterType.ROCK: SUPER_EFFECTIVE,
        MonsterType.DRAGON: NOT_VERY_EFFECTIVE,
    },
    MonsterType.GRASS: {
        MonsterType.FIRE: NOT_VERY_EFFECTIVE,
        MonsterType.WATER: SUPER_EFFECTIVE,
        MonsterType.GRASS: NOT_VERY_EFFECTIVE,
        MonsterType.POISON: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: SUPER_EFFECTIVE,
        MonsterType.FLYING: NOT_VERY_EFFECTIVE,
        MonsterType.BUG: NOT_VERY_EFFECTIVE,
        MonsterType.ROCK: SUPER_EFFECTIVE,
        MonsterType.DRAGON: NOT_VERY_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.ELECTRIC: {
        MonsterType.WATER: SUPER_EFFECTIVE,
        MonsterType.GRASS: NOT_VERY_EFFECTIVE,
        MonsterType.ELECTRIC: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: NO_EFFECT,
        MonsterType.FLYING: SUPER_EFFECTIVE,
        MonsterType.DRAGON: NOT_VERY_EFFECTIVE,
    },
    MonsterType.ICE: {
        MonsterType.FIRE: NOT_VERY_EFFECTIVE,
        MonsterType.WATER: NOT_VERY_EFFECTIVE,
        MonsterType.GRASS: SUPER_EFFECTIVE,
        MonsterType.ICE: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: SUPER_EFFECTIVE,
        MonsterType.FLYING: SUPER_EFFECTIVE,
        MonsterType.DRAGON: SUPER_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.FIGHTING: {
        MonsterType.NORMAL: SUPER_EFFECTIVE,
        MonsterType.ICE: SUPER_EFFECTIVE,
        MonsterType.POISON: NOT_VERY_EFFECTIVE,
        MonsterType.FLYING: NOT_VERY_EFFECTIVE,
        MonsterType.PSYCHIC: NOT_VERY_EFFECTIVE,
        MonsterType.BUG: NOT_VERY_EFFECTIVE,
        MonsterType.ROCK: SUPER_EFFECTIVE,
        MonsterType.GHOST: NO_EFFECT,
        MonsterType.DARK: SUPER_EFFECTIVE,
        MonsterType.STEEL: SUPER_EFFECTIVE,
    },
    MonsterType.POISON: {
        MonsterType.GRASS: SUPER_EFFECTIVE,
        MonsterType.POISON: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: NOT_VERY_EFFECTIVE,
        MonsterType.ROCK: NOT_VERY_EFFECTIVE,
        MonsterType.GHOST: NOT_VERY_EFFECTIVE,
        MonsterType.STEEL: NO_EFFECT,
    },
    MonsterType.GROUND: {
        MonsterType.FIRE: SUPER_EFFECTIVE,
        MonsterType.GRASS: NOT_VERY_EFFECTIVE,
        MonsterType.ELECTRIC: SUPER_EFFECTIVE,
        MonsterType.POISON: SUPER_EFFECTIVE,
        MonsterType.FLYING: NO_EFFECT,
        MonsterType.BUG: NOT_VERY_EFFECTIVE,
        MonsterType.ROCK: SUPER_EFFECTIVE,
        MonsterType.STEEL: SUPER_EFFECTIVE,
    },
    MonsterType.FLYING: {
        MonsterType.GRASS: SUPER_EFFECTIVE,
        MonsterType.ELECTRIC: NOT_VERY_EFFECTIVE,
        MonsterType.FIGHTING: SUPER_EFFECTIVE,
        MonsterType.BUG: SUPER_EFFECTIVE,
        MonsterType.ROCK: NOT_VERY_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.PSYCHIC: {
        MonsterType.FIGHTING: SUPER_EFFECTIVE,
        MonsterType.POISON: SUPER_EFFECTIVE,
        MonsterType.PSYCHIC: NOT_VERY_EFFECTIVE,
        MonsterType.DARK: NO_EFFECT,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.BUG: {
        MonsterType.FIRE: NOT_VERY_EFFECTIVE,
        MonsterType.GRASS: SUPER_EFFECTIVE,
        MonsterType.FIGHTING: NOT_VERY_EFFECTIVE,
        MonsterType.POISON: NOT_VERY_EFFECTIVE,
        MonsterType.FLYING: NOT_VERY_EFFECTIVE,
        MonsterType.PSYCHIC: SUPER_EFFECTIVE,
        MonsterType.GHOST: NOT_VERY_EFFECTIVE,
        MonsterType.DARK: SUPER_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.ROCK: {
        MonsterType.FIRE: SUPER_EFFECTIVE,
        MonsterType.ICE: SUPER_EFFECTIVE,
        MonsterType.FIGHTING: NOT_VERY_EFFECTIVE,
        MonsterType.GROUND: NOT_VERY_EFFECTIVE,
        MonsterType.FLYING: SUPER_EFFECTIVE,
        MonsterType.BUG: SUPER_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.GHOST: {
        MonsterType.NORMAL: NO_EFFECT,
        MonsterType.PSYCHIC: SUPER_EFFECTIVE,
        MonsterType.GHOST: SUPER_EFFECTIVE,
        MonsterType.DARK: NOT_VERY_EFFECTIVE,
    },
    MonsterType.DRAGON: {
        MonsterType.DRAGON: SUPER_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
    MonsterType.DARK: {
        MonsterType.FIGHTING: NOT_VERY_EFFECTIVE,
        MonsterType.PSYCHIC: SUPER_EFFECTIVE,
        MonsterType.GHOST: SUPER_EFFECTIVE,
        MonsterType.DARK: NOT_VERY_EFFECTIVE,
    },
    MonsterType.STEEL: {
        MonsterType.FIRE: NOT_VERY_EFFECTIVE,
        MonsterType.WATER: NOT_VERY_EFFECTIVE,
        MonsterType.ELECTRIC: NOT_VERY_EFFECTIVE,
        MonsterType.ICE: SUPER_EFFECTIVE,
        MonsterType.ROCK: SUPER_EFFECTIVE,
        MonsterType.STEEL: NOT_VERY_EFFECTIVE,
    },
}


def get_effectiveness(attack_type: MonsterType, defend_type: MonsterType) -> float:
    """Get the type effectiveness multiplier for an attack."""
    if attack_type not in _CHART:
        return NEUTRAL
    return _CHART[attack_type].get(defend_type, NEUTRAL)


def get_dual_effectiveness(
    attack_type: MonsterType,
    defend_types: Tuple[MonsterType, ...],
) -> float:
    """Get combined effectiveness against a dual-type defender."""
    multiplier = 1.0
    for dtype in defend_types:
        multiplier *= get_effectiveness(attack_type, dtype)
    return multiplier


def get_weaknesses(monster_types: Tuple[MonsterType, ...]) -> list[MonsterType]:
    """Return list of types that are super effective against the given type combo."""
    weaknesses: list[MonsterType] = []
    for atk_type in MonsterType:
        eff = get_dual_effectiveness(atk_type, monster_types)
        if eff >= SUPER_EFFECTIVE:
            weaknesses.append(atk_type)
    return weaknesses


def get_resistances(monster_types: Tuple[MonsterType, ...]) -> list[MonsterType]:
    """Return list of types that are not very effective against the given type combo."""
    resistances: list[MonsterType] = []
    for atk_type in MonsterType:
        eff = get_dual_effectiveness(atk_type, monster_types)
        if 0.0 < eff <= NOT_VERY_EFFECTIVE:
            resistances.append(atk_type)
    return resistances


def get_immunities(monster_types: Tuple[MonsterType, ...]) -> list[MonsterType]:
    """Return list of types that have no effect against the given type combo."""
    immunities: list[MonsterType] = []
    for atk_type in MonsterType:
        eff = get_dual_effectiveness(atk_type, monster_types)
        if eff == NO_EFFECT:
            immunities.append(atk_type)
    return immunities


def best_attack_type(
    available_types: list[MonsterType],
    defender_types: Tuple[MonsterType, ...],
) -> MonsterType:
    """Pick the best attack type from available options against a defender."""
    best_type = available_types[0]
    best_eff = 0.0
    for atype in available_types:
        eff = get_dual_effectiveness(atype, defender_types)
        if eff > best_eff:
            best_eff = eff
            best_type = atype
    return best_type