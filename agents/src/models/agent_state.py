"""Agent state tracking for PXMON agents."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from .monster import Monster


@dataclass
class Position:
    x: int
    y: int
    zone: str = "route_1"

    def distance_to(self, other: "Position") -> int:
        return abs(self.x - other.x) + abs(self.y - other.y)

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "zone": self.zone}


@dataclass
class Inventory:
    pokeballs: int = 10
    great_balls: int = 0
    ultra_balls: int = 0
    potions: int = 5
    super_potions: int = 0
    hyper_potions: int = 0
    full_restores: int = 0
    revives: int = 2
    max_revives: int = 0
    rare_candies: int = 0
    evolution_stones: Dict[str, int] = field(default_factory=dict)

    def total_balls(self) -> int:
        return self.pokeballs + self.great_balls + self.ultra_balls

    def total_healing(self) -> int:
        return self.potions + self.super_potions + self.hyper_potions + self.full_restores

    def best_ball(self) -> Optional[str]:
        if self.ultra_balls > 0:
            return "ultra_ball"
        if self.great_balls > 0:
            return "great_ball"
        if self.pokeballs > 0:
            return "pokeball"
        return None

    def use_ball(self, ball_type: str) -> bool:
        if ball_type == "ultra_ball" and self.ultra_balls > 0:
            self.ultra_balls -= 1
            return True
        if ball_type == "great_ball" and self.great_balls > 0:
            self.great_balls -= 1
            return True
        if ball_type == "pokeball" and self.pokeballs > 0:
            self.pokeballs -= 1
            return True
        return False

    def heal_amount(self, item: str) -> int:
        amounts = {
            "potion": 20,
            "super_potion": 60,
            "hyper_potion": 120,
            "full_restore": 9999,
        }
        return amounts.get(item, 0)

    def use_healing(self, item: str) -> bool:
        if item == "full_restore" and self.full_restores > 0:
            self.full_restores -= 1
            return True
        if item == "hyper_potion" and self.hyper_potions > 0:
            self.hyper_potions -= 1
            return True
        if item == "super_potion" and self.super_potions > 0:
            self.super_potions -= 1
            return True
        if item == "potion" and self.potions > 0:
            self.potions -= 1
            return True
        return False

    def best_healing_item(self) -> Optional[str]:
        if self.full_restores > 0:
            return "full_restore"
        if self.hyper_potions > 0:
            return "hyper_potion"
        if self.super_potions > 0:
            return "super_potion"
        if self.potions > 0:
            return "potion"
        return None

    def to_dict(self) -> dict:
        return {
            "pokeballs": self.pokeballs,
            "great_balls": self.great_balls,
            "ultra_balls": self.ultra_balls,
            "potions": self.potions,
            "super_potions": self.super_potions,
            "hyper_potions": self.hyper_potions,
            "full_restores": self.full_restores,
            "revives": self.revives,
            "max_revives": self.max_revives,
            "rare_candies": self.rare_candies,
        }


@dataclass
class GymBadge:
    gym_id: str
    gym_name: str
    badge_name: str
    gym_type: str
    earned_at_tick: int


@dataclass
class AgentStats:
    battles_won: int = 0
    battles_lost: int = 0
    monsters_caught: int = 0
    monsters_seen: int = 0
    total_xp_earned: int = 0
    gyms_challenged: int = 0
    gyms_beaten: int = 0
    total_distance: int = 0
    total_healing_used: int = 0
    total_damage_dealt: int = 0
    total_damage_taken: int = 0
    highest_level_reached: int = 0
    shinies_found: int = 0

    def win_rate(self) -> float:
        total = self.battles_won + self.battles_lost
        if total == 0:
            return 0.0
        return self.battles_won / total

    def to_dict(self) -> dict:
        return {
            "battles_won": self.battles_won,
            "battles_lost": self.battles_lost,
            "monsters_caught": self.monsters_caught,
            "monsters_seen": self.monsters_seen,
            "total_xp_earned": self.total_xp_earned,
            "gyms_beaten": self.gyms_beaten,
            "total_distance": self.total_distance,
            "win_rate": round(self.win_rate(), 3),
            "highest_level_reached": self.highest_level_reached,
            "shinies_found": self.shinies_found,
        }


@dataclass
class AgentState:
    agent_id: str
    name: str
    strategy: str
    team: List[Monster] = field(default_factory=list)
    box: List[Monster] = field(default_factory=list)
    position: Position = field(default_factory=lambda: Position(0, 0, "route_1"))
    inventory: Inventory = field(default_factory=Inventory)
    badges: List[GymBadge] = field(default_factory=list)
    stats: AgentStats = field(default_factory=AgentStats)
    money: int = 3000
    current_tick: int = 0
    registered_at_tick: int = 0
    is_active: bool = True
    last_action: str = "idle"
    last_action_result: str = ""

    @property
    def team_size(self) -> int:
        return len(self.team)

    @property
    def badge_count(self) -> int:
        return len(self.badges)

    @property
    def lead_monster(self) -> Optional[Monster]:
        for m in self.team:
            if not m.is_fainted:
                return m
        return None

    @property
    def team_alive_count(self) -> int:
        return sum(1 for m in self.team if not m.is_fainted)

    @property
    def team_hp_percentage(self) -> float:
        if not self.team:
            return 0.0
        total_current = sum(m.current_hp for m in self.team)
        total_max = sum(m.max_hp for m in self.team)
        if total_max == 0:
            return 0.0
        return (total_current / total_max) * 100.0

    @property
    def average_team_level(self) -> float:
        if not self.team:
            return 0.0
        return sum(m.level for m in self.team) / len(self.team)

    def has_badge(self, gym_id: str) -> bool:
        return any(b.gym_id == gym_id for b in self.badges)

    def can_catch(self) -> bool:
        return self.inventory.total_balls() > 0 and len(self.team) < 6

    def can_heal(self) -> bool:
        return self.inventory.total_healing() > 0 or self.inventory.revives > 0

    def needs_healing(self, threshold: float = 50.0) -> bool:
        return self.team_hp_percentage < threshold

    def add_to_team(self, monster: Monster) -> bool:
        if len(self.team) < 6:
            self.team.append(monster)
            return True
        self.box.append(monster)
        return False

    def unique_types_in_team(self) -> set:
        types = set()
        for m in self.team:
            for t in m.types:
                types.add(t)
        return types

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "strategy": self.strategy,
            "team": [m.to_dict() for m in self.team],
            "box_count": len(self.box),
            "position": self.position.to_dict(),
            "inventory": self.inventory.to_dict(),
            "badges": [{"gym_id": b.gym_id, "badge_name": b.badge_name} for b in self.badges],
            "stats": self.stats.to_dict(),
            "money": self.money,
            "current_tick": self.current_tick,
            "is_active": self.is_active,
            "last_action": self.last_action,
            "team_hp_pct": round(self.team_hp_percentage, 1),
            "avg_level": round(self.average_team_level, 1),
        }