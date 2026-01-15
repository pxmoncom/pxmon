"""Monster model with stats, types, moves, and evolution data."""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from ..utils.type_chart import MonsterType


@dataclass
class Move:
    name: str
    move_type: MonsterType
    power: int
    accuracy: int  # 0-100
    pp: int
    max_pp: int
    priority: int = 0
    is_special: bool = False
    effect: Optional[str] = None
    effect_chance: int = 0

    def has_pp(self) -> bool:
        return self.pp > 0

    def use(self) -> None:
        if self.pp > 0:
            self.pp -= 1

    def restore_pp(self, amount: Optional[int] = None) -> None:
        if amount is None:
            self.pp = self.max_pp
        else:
            self.pp = min(self.pp + amount, self.max_pp)


@dataclass
class BaseStats:
    hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int

    def total(self) -> int:
        return self.hp + self.attack + self.defense + self.sp_attack + self.sp_defense + self.speed


@dataclass
class IVs:
    hp: int = 0
    attack: int = 0
    defense: int = 0
    sp_attack: int = 0
    sp_defense: int = 0
    speed: int = 0


@dataclass
class EVs:
    hp: int = 0
    attack: int = 0
    defense: int = 0
    sp_attack: int = 0
    sp_defense: int = 0
    speed: int = 0

    def total(self) -> int:
        return self.hp + self.attack + self.defense + self.sp_attack + self.sp_defense + self.speed

    def can_gain(self) -> bool:
        return self.total() < 510


@dataclass
class EvolutionData:
    target_species_id: str
    method: str  # "level", "item", "trade"
    level_required: Optional[int] = None
    item_required: Optional[str] = None
    trade_species: Optional[str] = None


@dataclass
class SpeciesData:
    species_id: str
    name: str
    types: Tuple[MonsterType, ...]
    base_stats: BaseStats
    base_xp_yield: int
    catch_rate: int  # 0-255
    ev_yield: EVs
    evolutions: List[EvolutionData] = field(default_factory=list)
    learnset: dict[int, str] = field(default_factory=dict)  # level -> move name
    sprite_id: str = ""
    description: str = ""


@dataclass
class Monster:
    uid: str
    species: SpeciesData
    nickname: Optional[str]
    level: int
    xp: int
    ivs: IVs
    evs: EVs
    current_hp: int
    max_hp: int
    attack: int
    defense: int
    sp_attack: int
    sp_defense: int
    speed: int
    moves: List[Move]
    status: Optional[str] = None  # "burn", "paralyze", "sleep", "poison", "freeze"
    friendship: int = 70
    held_item: Optional[str] = None
    is_shiny: bool = False
    caught_in: str = "pokeball"
    original_trainer: str = ""

    @property
    def display_name(self) -> str:
        return self.nickname if self.nickname else self.species.name

    @property
    def types(self) -> Tuple[MonsterType, ...]:
        return self.species.types

    @property
    def is_fainted(self) -> bool:
        return self.current_hp <= 0

    @property
    def hp_percentage(self) -> float:
        if self.max_hp == 0:
            return 0.0
        return (self.current_hp / self.max_hp) * 100.0

    def take_damage(self, amount: int) -> int:
        """Apply damage and return actual damage dealt."""
        actual = min(amount, self.current_hp)
        self.current_hp = max(0, self.current_hp - amount)
        return actual

    def heal(self, amount: int) -> int:
        """Heal HP and return actual amount healed."""
        actual = min(amount, self.max_hp - self.current_hp)
        self.current_hp = min(self.current_hp + amount, self.max_hp)
        return actual

    def full_heal(self) -> None:
        """Fully restore HP, PP, and clear status."""
        self.current_hp = self.max_hp
        self.status = None
        for move in self.moves:
            move.restore_pp()

    def can_fight(self) -> bool:
        """Check if monster can participate in battle."""
        return not self.is_fainted and any(m.has_pp() for m in self.moves)

    def get_best_move_against(self, defender_types: Tuple[MonsterType, ...]) -> Optional[Move]:
        """Select the most effective move against a defender's types."""
        from ..utils.type_chart import get_dual_effectiveness
        best_move: Optional[Move] = None
        best_score = -1.0
        for move in self.moves:
            if not move.has_pp():
                continue
            eff = get_dual_effectiveness(move.move_type, defender_types)
            score = move.power * eff
            if move.is_special:
                score *= self.sp_attack / 100.0
            else:
                score *= self.attack / 100.0
            if score > best_score:
                best_score = score
                best_move = move
        return best_move

    def to_dict(self) -> dict:
        """Serialize monster to dictionary."""
        return {
            "uid": self.uid,
            "species_id": self.species.species_id,
            "nickname": self.nickname,
            "level": self.level,
            "xp": self.xp,
            "current_hp": self.current_hp,
            "max_hp": self.max_hp,
            "attack": self.attack,
            "defense": self.defense,
            "sp_attack": self.sp_attack,
            "sp_defense": self.sp_defense,
            "speed": self.speed,
            "status": self.status,
            "is_shiny": self.is_shiny,
            "moves": [
                {
                    "name": m.name,
                    "type": m.move_type.value,
                    "power": m.power,
                    "pp": m.pp,
                    "max_pp": m.max_pp,
                }
                for m in self.moves
            ],
        }


# Default starter species for quick testing
STARTER_SPECIES: dict[str, SpeciesData] = {
    "flamelet": SpeciesData(
        species_id="flamelet",
        name="Flamelet",
        types=(MonsterType.FIRE,),
        base_stats=BaseStats(hp=45, attack=60, defense=40, sp_attack=70, sp_defense=50, speed=65),
        base_xp_yield=64,
        catch_rate=45,
        ev_yield=EVs(sp_attack=1),
        evolutions=[EvolutionData(target_species_id="blazetail", method="level", level_required=16)],
        learnset={1: "ember", 5: "scratch", 9: "smokescreen", 13: "flame_charge"},
    ),
    "tidalin": SpeciesData(
        species_id="tidalin",
        name="Tidalin",
        types=(MonsterType.WATER,),
        base_stats=BaseStats(hp=50, attack=50, defense=65, sp_attack=55, sp_defense=65, speed=45),
        base_xp_yield=64,
        catch_rate=45,
        ev_yield=EVs(defense=1),
        evolutions=[EvolutionData(target_species_id="torrentis", method="level", level_required=16)],
        learnset={1: "water_gun", 5: "tackle", 9: "bubble", 13: "aqua_jet"},
    ),
    "sproutix": SpeciesData(
        species_id="sproutix",
        name="Sproutix",
        types=(MonsterType.GRASS,),
        base_stats=BaseStats(hp=55, attack=50, defense=55, sp_attack=65, sp_defense=55, speed=50),
        base_xp_yield=64,
        catch_rate=45,
        ev_yield=EVs(sp_attack=1),
        evolutions=[EvolutionData(target_species_id="thornbloom", method="level", level_required=16)],
        learnset={1: "vine_whip", 5: "tackle", 9: "leech_seed", 13: "razor_leaf"},
    ),
    "zappik": SpeciesData(
        species_id="zappik",
        name="Zappik",
        types=(MonsterType.ELECTRIC,),
        base_stats=BaseStats(hp=35, attack=55, defense=40, sp_attack=50, sp_defense=50, speed=90),
        base_xp_yield=112,
        catch_rate=190,
        ev_yield=EVs(speed=2),
        evolutions=[EvolutionData(target_species_id="voltrode", method="level", level_required=22)],
        learnset={1: "thunder_shock", 5: "quick_attack", 9: "spark", 13: "thunder_wave"},
    ),
    "rockpup": SpeciesData(
        species_id="rockpup",
        name="Rockpup",
        types=(MonsterType.ROCK, MonsterType.GROUND),
        base_stats=BaseStats(hp=60, attack=70, defense=80, sp_attack=30, sp_defense=45, speed=35),
        base_xp_yield=75,
        catch_rate=120,
        ev_yield=EVs(defense=1, attack=1),
        evolutions=[EvolutionData(target_species_id="boulderhound", method="level", level_required=25)],
        learnset={1: "rock_throw", 5: "tackle", 9: "harden", 13: "rock_slide"},
    ),
    "phantling": SpeciesData(
        species_id="phantling",
        name="Phantling",
        types=(MonsterType.GHOST,),
        base_stats=BaseStats(hp=40, attack=35, defense=30, sp_attack=80, sp_defense=70, speed=75),
        base_xp_yield=95,
        catch_rate=80,
        ev_yield=EVs(sp_attack=2),
        evolutions=[EvolutionData(target_species_id="spectragon", method="level", level_required=30)],
        learnset={1: "shadow_ball", 5: "lick", 9: "hypnosis", 13: "curse"},
    ),
}


# Default move database
MOVE_DATABASE: dict[str, Move] = {
    "ember": Move(name="Ember", move_type=MonsterType.FIRE, power=40, accuracy=100, pp=25, max_pp=25, is_special=True, effect="burn", effect_chance=10),
    "scratch": Move(name="Scratch", move_type=MonsterType.NORMAL, power=40, accuracy=100, pp=35, max_pp=35),
    "smokescreen": Move(name="Smokescreen", move_type=MonsterType.NORMAL, power=0, accuracy=100, pp=20, max_pp=20, effect="accuracy_down", effect_chance=100),
    "flame_charge": Move(name="Flame Charge", move_type=MonsterType.FIRE, power=50, accuracy=100, pp=20, max_pp=20, effect="speed_up", effect_chance=100),
    "water_gun": Move(name="Water Gun", move_type=MonsterType.WATER, power=40, accuracy=100, pp=25, max_pp=25, is_special=True),
    "tackle": Move(name="Tackle", move_type=MonsterType.NORMAL, power=40, accuracy=100, pp=35, max_pp=35),
    "bubble": Move(name="Bubble", move_type=MonsterType.WATER, power=40, accuracy=100, pp=30, max_pp=30, is_special=True, effect="speed_down", effect_chance=10),
    "aqua_jet": Move(name="Aqua Jet", move_type=MonsterType.WATER, power=40, accuracy=100, pp=20, max_pp=20, priority=1),
    "vine_whip": Move(name="Vine Whip", move_type=MonsterType.GRASS, power=45, accuracy=100, pp=25, max_pp=25),
    "leech_seed": Move(name="Leech Seed", move_type=MonsterType.GRASS, power=0, accuracy=90, pp=10, max_pp=10, effect="leech", effect_chance=100),
    "razor_leaf": Move(name="Razor Leaf", move_type=MonsterType.GRASS, power=55, accuracy=95, pp=25, max_pp=25),
    "thunder_shock": Move(name="Thunder Shock", move_type=MonsterType.ELECTRIC, power=40, accuracy=100, pp=30, max_pp=30, is_special=True, effect="paralyze", effect_chance=10),
    "quick_attack": Move(name="Quick Attack", move_type=MonsterType.NORMAL, power=40, accuracy=100, pp=30, max_pp=30, priority=1),
    "spark": Move(name="Spark", move_type=MonsterType.ELECTRIC, power=65, accuracy=100, pp=20, max_pp=20, effect="paralyze", effect_chance=30),
    "thunder_wave": Move(name="Thunder Wave", move_type=MonsterType.ELECTRIC, power=0, accuracy=90, pp=20, max_pp=20, effect="paralyze", effect_chance=100),
    "rock_throw": Move(name="Rock Throw", move_type=MonsterType.ROCK, power=50, accuracy=90, pp=15, max_pp=15),
    "harden": Move(name="Harden", move_type=MonsterType.NORMAL, power=0, accuracy=100, pp=30, max_pp=30, effect="defense_up", effect_chance=100),
    "rock_slide": Move(name="Rock Slide", move_type=MonsterType.ROCK, power=75, accuracy=90, pp=10, max_pp=10, effect="flinch", effect_chance=30),
    "shadow_ball": Move(name="Shadow Ball", move_type=MonsterType.GHOST, power=80, accuracy=100, pp=15, max_pp=15, is_special=True, effect="sp_def_down", effect_chance=20),
    "lick": Move(name="Lick", move_type=MonsterType.GHOST, power=30, accuracy=100, pp=30, max_pp=30, effect="paralyze", effect_chance=30),
    "hypnosis": Move(name="Hypnosis", move_type=MonsterType.PSYCHIC, power=0, accuracy=60, pp=20, max_pp=20, effect="sleep", effect_chance=100),
    "curse": Move(name="Curse", move_type=MonsterType.GHOST, power=0, accuracy=100, pp=10, max_pp=10, effect="curse", effect_chance=100),
}


def create_monster(
    species_id: str,
    level: int,
    uid: str,
    rng: "SeededRNG",
    nickname: Optional[str] = None,
    trainer_id: str = "",
) -> Monster:
    """Factory function to create a monster with random IVs."""
    from ..utils.rng import SeededRNG
    from ..utils.xp_calculator import calculate_stat_at_level, xp_for_level

    species = STARTER_SPECIES.get(species_id)
    if species is None:
        raise ValueError(f"Unknown species: {species_id}")

    ivs = IVs(
        hp=rng.next_int(0, 31),
        attack=rng.next_int(0, 31),
        defense=rng.next_int(0, 31),
        sp_attack=rng.next_int(0, 31),
        sp_defense=rng.next_int(0, 31),
        speed=rng.next_int(0, 31),
    )
    evs = EVs()

    hp = calculate_stat_at_level(species.base_stats.hp, ivs.hp, evs.hp, level, is_hp=True)
    atk = calculate_stat_at_level(species.base_stats.attack, ivs.attack, evs.attack, level)
    dfn = calculate_stat_at_level(species.base_stats.defense, ivs.defense, evs.defense, level)
    spa = calculate_stat_at_level(species.base_stats.sp_attack, ivs.sp_attack, evs.sp_attack, level)
    spd = calculate_stat_at_level(species.base_stats.sp_defense, ivs.sp_defense, evs.sp_defense, level)
    spe = calculate_stat_at_level(species.base_stats.speed, ivs.speed, evs.speed, level)

    moves: List[Move] = []
    for lv, move_name in sorted(species.learnset.items()):
        if lv <= level and move_name in MOVE_DATABASE:
            from copy import deepcopy
            moves.append(deepcopy(MOVE_DATABASE[move_name]))
    moves = moves[-4:]  # keep last 4

    is_shiny = rng.next_int(1, 4096) == 1

    return Monster(
        uid=uid,
        species=species,
        nickname=nickname,
        level=level,
        xp=xp_for_level(level),
        ivs=ivs,
        evs=evs,
        current_hp=hp,
        max_hp=hp,
        attack=atk,
        defense=dfn,
        sp_attack=spa,
        sp_defense=spd,
        speed=spe,
        moves=moves,
        is_shiny=is_shiny,
        original_trainer=trainer_id,
    )