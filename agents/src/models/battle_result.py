"""Battle result models for PXMON."""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple


@dataclass
class TurnAction:
    turn: int
    attacker: str
    defender: str
    move_used: str
    damage_dealt: int
    effectiveness: float
    critical: bool
    missed: bool
    defender_hp_after: int
    status_applied: Optional[str] = None
    message: str = ""


@dataclass
class BattleResult:
    battle_id: str
    battle_type: str  # "wild", "trainer", "gym"
    winner: str  # agent_id or "wild"
    loser: str
    attacker_id: str
    defender_id: str
    attacker_team_before: List[dict] = field(default_factory=list)
    defender_team_before: List[dict] = field(default_factory=list)
    turns: List[TurnAction] = field(default_factory=list)
    total_turns: int = 0
    xp_gained: int = 0
    money_gained: int = 0
    evs_gained: dict = field(default_factory=dict)
    caught: bool = False
    caught_monster_uid: Optional[str] = None
    fled: bool = False
    timestamp: int = 0

    @property
    def attacker_won(self) -> bool:
        return self.winner == self.attacker_id

    @property
    def was_close(self) -> bool:
        """Check if the battle was close (went to many turns)."""
        return self.total_turns >= 8

    def damage_summary(self) -> dict:
        attacker_damage = sum(t.damage_dealt for t in self.turns if t.attacker == self.attacker_id)
        defender_damage = sum(t.damage_dealt for t in self.turns if t.attacker == self.defender_id)
        return {
            "attacker_total_damage": attacker_damage,
            "defender_total_damage": defender_damage,
            "total_turns": self.total_turns,
            "critical_hits": sum(1 for t in self.turns if t.critical),
            "misses": sum(1 for t in self.turns if t.missed),
        }

    def to_dict(self) -> dict:
        return {
            "battle_id": self.battle_id,
            "battle_type": self.battle_type,
            "winner": self.winner,
            "loser": self.loser,
            "total_turns": self.total_turns,
            "xp_gained": self.xp_gained,
            "money_gained": self.money_gained,
            "caught": self.caught,
            "fled": self.fled,
            "damage_summary": self.damage_summary(),
        }

    def replay_log(self) -> List[str]:
        """Generate a human-readable replay log."""
        lines: List[str] = []
        lines.append(f"=== Battle: {self.battle_type} ===")
        lines.append(f"  {self.attacker_id} vs {self.defender_id}")
        lines.append("")
        for turn in self.turns:
            if turn.missed:
                lines.append(f"  Turn {turn.turn}: {turn.attacker} used {turn.move_used} - MISSED!")
            else:
                eff_str = ""
                if turn.effectiveness > 1.0:
                    eff_str = " (super effective!)"
                elif turn.effectiveness < 1.0 and turn.effectiveness > 0:
                    eff_str = " (not very effective)"
                elif turn.effectiveness == 0:
                    eff_str = " (no effect)"
                crit_str = " CRITICAL!" if turn.critical else ""
                lines.append(
                    f"  Turn {turn.turn}: {turn.attacker} used {turn.move_used} "
                    f"-> {turn.damage_dealt} dmg{eff_str}{crit_str} "
                    f"[{turn.defender}: {turn.defender_hp_after} HP]"
                )
                if turn.status_applied:
                    lines.append(f"    {turn.defender} was {turn.status_applied}!")
        lines.append("")
        lines.append(f"  Winner: {self.winner} in {self.total_turns} turns")
        if self.xp_gained > 0:
            lines.append(f"  XP gained: {self.xp_gained}")
        if self.caught:
            lines.append(f"  Caught monster: {self.caught_monster_uid}")
        return lines


@dataclass
class CatchAttempt:
    ball_used: str
    ball_modifier: float
    catch_rate: int
    hp_percentage: float
    status_bonus: float
    shake_count: int  # 0-3, 3 = caught
    success: bool
    calculated_chance: float

    @staticmethod
    def ball_modifier_for(ball_type: str) -> float:
        modifiers = {
            "pokeball": 1.0,
            "great_ball": 1.5,
            "ultra_ball": 2.0,
        }
        return modifiers.get(ball_type, 1.0)

    @staticmethod
    def status_bonus_for(status: Optional[str]) -> float:
        if status in ("sleep", "freeze"):
            return 2.0
        if status in ("paralyze", "burn", "poison"):
            return 1.5
        return 1.0