"""Aggressive strategy - always hunt, skip healing, maximize battles."""

from typing import Optional
from .base import BaseStrategy, ActionDecision, Action
from ..models.agent_state import AgentState
from ..models.monster import Monster
from ..utils.type_chart import get_dual_effectiveness


class AggressiveStrategy(BaseStrategy):
    name = "aggressive"
    description = "Maximum battle output. Hunt constantly, heal only when critical."

    CRITICAL_HP_THRESHOLD = 15.0
    MIN_CATCH_RATE = 180
    GYM_LEVEL_BUFFER = 2

    def decide_action(self, state: AgentState) -> ActionDecision:
        item_decision = self.should_use_item(state)
        if item_decision:
            return item_decision

        if state.team_alive_count == 0:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="All monsters fainted, forced heal",
                priority=100.0,
            )

        if self.team_hp_percentage_alive(state) < self.CRITICAL_HP_THRESHOLD:
            if state.can_heal():
                return ActionDecision(
                    action=Action.HEAL,
                    reason=f"Critical HP at {state.team_hp_percentage:.0f}%",
                    priority=90.0,
                )
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="Critical HP and no items",
                priority=90.0,
            )

        gym = self.choose_gym_target(state)
        if gym:
            return ActionDecision(
                action=Action.GYM_CHALLENGE,
                target=gym,
                reason=f"Challenge gym {gym} aggressively",
                priority=70.0,
            )

        return ActionDecision(
            action=Action.HUNT,
            reason="Aggressive hunting for battles",
            priority=50.0,
        )

    def should_catch(self, state: AgentState, wild_monster: Monster) -> bool:
        if not state.can_catch():
            return False
        if wild_monster.species.catch_rate >= self.MIN_CATCH_RATE:
            return True
        if wild_monster.level > state.average_team_level:
            return True
        return False

    def should_heal(self, state: AgentState) -> bool:
        return self.team_hp_percentage_alive(state) < self.CRITICAL_HP_THRESHOLD

    def pick_battle_move(self, attacker: Monster, defender: Monster) -> Optional[str]:
        best_move_name: Optional[str] = None
        best_damage = -1.0
        for move in attacker.moves:
            if not move.has_pp() or move.power == 0:
                continue
            eff = get_dual_effectiveness(move.move_type, defender.types)
            if move.is_special:
                raw = move.power * (attacker.sp_attack / max(defender.sp_defense, 1))
            else:
                raw = move.power * (attacker.attack / max(defender.defense, 1))
            estimated = raw * eff
            if estimated > best_damage:
                best_damage = estimated
                best_move_name = move.name
        return best_move_name

    def pick_switch(self, state: AgentState, opponent: Monster) -> Optional[int]:
        """Aggressive: only switch if current lead is fainted."""
        if state.lead_monster and not state.lead_monster.is_fainted:
            return None
        best_idx: Optional[int] = None
        best_score = -1.0
        for i, monster in enumerate(state.team):
            if monster.is_fainted:
                continue
            score = float(monster.attack + monster.sp_attack) * (monster.current_hp / max(monster.max_hp, 1))
            for move in monster.moves:
                if move.has_pp() and move.power > 0:
                    eff = get_dual_effectiveness(move.move_type, opponent.types)
                    if eff > 1.0:
                        score *= 1.5
                        break
            if score > best_score:
                best_score = score
                best_idx = i
        return best_idx

    def choose_gym_target(self, state: AgentState) -> Optional[str]:
        gym_order = ["gym_1", "gym_2", "gym_3", "gym_4", "gym_5", "gym_6", "gym_7", "gym_8"]
        gym_levels = {
            "gym_1": 14, "gym_2": 20, "gym_3": 26, "gym_4": 32,
            "gym_5": 38, "gym_6": 42, "gym_7": 48, "gym_8": 55,
        }
        for gym_id in gym_order:
            if state.has_badge(gym_id):
                continue
            required = gym_levels.get(gym_id, 999)
            if state.average_team_level >= required - self.GYM_LEVEL_BUFFER:
                return gym_id
            break
        return None

    def team_hp_percentage_alive(self, state: AgentState) -> float:
        alive = [m for m in state.team if not m.is_fainted]
        if not alive:
            return 0.0
        total_hp = sum(m.current_hp for m in alive)
        total_max = sum(m.max_hp for m in alive)
        if total_max == 0:
            return 0.0
        return (total_hp / total_max) * 100.0