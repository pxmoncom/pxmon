"""Speedrunner strategy - rush gyms with minimum battles, optimal pathing."""

from typing import Optional
from .base import BaseStrategy, ActionDecision, Action
from ..models.agent_state import AgentState
from ..models.monster import Monster
from ..utils.type_chart import get_dual_effectiveness, MonsterType


GYM_TYPE_MAP: dict[str, MonsterType] = {
    "gym_1": MonsterType.ROCK,
    "gym_2": MonsterType.WATER,
    "gym_3": MonsterType.ELECTRIC,
    "gym_4": MonsterType.GRASS,
    "gym_5": MonsterType.FIGHTING,
    "gym_6": MonsterType.PSYCHIC,
    "gym_7": MonsterType.ICE,
    "gym_8": MonsterType.DRAGON,
}


class SpeedrunnerStrategy(BaseStrategy):
    name = "speedrunner"
    description = "Rush through gyms as fast as possible. Minimal catching, focused grinding."

    HEAL_THRESHOLD = 35.0
    GYM_HP_REQUIREMENT = 60.0

    def decide_action(self, state: AgentState) -> ActionDecision:
        item_decision = self.should_use_item(state)
        if item_decision:
            return item_decision

        if state.team_alive_count == 0:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="Team wiped, must heal",
                priority=100.0,
            )

        next_gym = self._next_gym(state)
        if next_gym is None:
            return ActionDecision(
                action=Action.IDLE,
                reason="All gyms complete",
                priority=0.0,
            )

        gym_level = self._gym_level(next_gym)

        if state.team_hp_percentage < self.HEAL_THRESHOLD:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="Quick heal at center",
                priority=90.0,
            )

        if state.average_team_level >= gym_level - 2 and state.team_hp_percentage >= self.GYM_HP_REQUIREMENT:
            return ActionDecision(
                action=Action.GYM_CHALLENGE,
                target=next_gym,
                reason=f"Speed-rushing {next_gym}",
                priority=85.0,
            )

        if state.average_team_level < gym_level - 2:
            return ActionDecision(
                action=Action.HUNT,
                reason=f"Grinding for {next_gym} (need lvl {gym_level})",
                priority=70.0,
            )

        if state.can_heal():
            return ActionDecision(
                action=Action.HEAL,
                reason="Top off before gym",
                priority=75.0,
            )
        return ActionDecision(
            action=Action.HEAL_CENTER,
            reason="Center heal before gym",
            priority=75.0,
        )

    def should_catch(self, state: AgentState, wild_monster: Monster) -> bool:
        if not state.can_catch():
            return False
        if wild_monster.is_shiny:
            return True
        if len(state.team) < 2:
            return True
        next_gym = self._next_gym_from_badges(state)
        if next_gym and next_gym in GYM_TYPE_MAP:
            gym_type = GYM_TYPE_MAP[next_gym]
            for mt in wild_monster.types:
                from ..utils.type_chart import get_effectiveness, SUPER_EFFECTIVE
                if get_effectiveness(mt, gym_type) >= SUPER_EFFECTIVE:
                    return True
        return False

    def should_heal(self, state: AgentState) -> bool:
        return state.team_hp_percentage < self.HEAL_THRESHOLD

    def pick_battle_move(self, attacker: Monster, defender: Monster) -> Optional[str]:
        best_name: Optional[str] = None
        best_score = -1.0
        for move in attacker.moves:
            if not move.has_pp() or move.power == 0:
                continue
            eff = get_dual_effectiveness(move.move_type, defender.types)
            if move.is_special:
                raw = move.power * (attacker.sp_attack / max(defender.sp_defense, 1))
            else:
                raw = move.power * (attacker.attack / max(defender.defense, 1))
            score = raw * eff * (move.accuracy / 100.0)
            if move.priority > 0:
                score *= 1.2
            if score > best_score:
                best_score = score
                best_name = move.name
        return best_name

    def pick_switch(self, state: AgentState, opponent: Monster) -> Optional[int]:
        lead = state.lead_monster
        if lead and not lead.is_fainted:
            has_se = any(
                get_dual_effectiveness(m.move_type, opponent.types) > 1.0
                for m in lead.moves if m.has_pp() and m.power > 0
            )
            if has_se and lead.hp_percentage > 25:
                return None

        best_idx: Optional[int] = None
        best_score = -1.0
        for i, monster in enumerate(state.team):
            if monster.is_fainted or monster == lead:
                continue
            se_bonus = 1.0
            for move in monster.moves:
                if move.has_pp() and move.power > 0:
                    eff = get_dual_effectiveness(move.move_type, opponent.types)
                    se_bonus = max(se_bonus, eff)
            score = se_bonus * 3.0 + (monster.speed / 100.0) + (monster.hp_percentage / 100.0)
            if score > best_score:
                best_score = score
                best_idx = i
        return best_idx

    def choose_gym_target(self, state: AgentState) -> Optional[str]:
        return self._next_gym(state)

    def _next_gym(self, state: AgentState) -> Optional[str]:
        return self._next_gym_from_badges(state)

    def _next_gym_from_badges(self, state: AgentState) -> Optional[str]:
        gym_order = ["gym_1", "gym_2", "gym_3", "gym_4", "gym_5", "gym_6", "gym_7", "gym_8"]
        for gym_id in gym_order:
            if not state.has_badge(gym_id):
                return gym_id
        return None

    def _gym_level(self, gym_id: str) -> int:
        levels = {
            "gym_1": 14, "gym_2": 20, "gym_3": 26, "gym_4": 32,
            "gym_5": 38, "gym_6": 42, "gym_7": 48, "gym_8": 55,
        }
        return levels.get(gym_id, 50)