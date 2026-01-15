"""Balanced strategy - heal when low, smart gym timing, catch selectively."""

from typing import Optional
from .base import BaseStrategy, ActionDecision, Action
from ..models.agent_state import AgentState
from ..models.monster import Monster
from ..utils.type_chart import get_dual_effectiveness, MonsterType


class BalancedStrategy(BaseStrategy):
    name = "balanced"
    description = "Well-rounded approach. Heal when low, smart gym timing, selective catching."

    HEAL_THRESHOLD = 50.0
    CRITICAL_THRESHOLD = 25.0
    GYM_HP_REQUIREMENT = 70.0
    GYM_LEVEL_BUFFER = 5
    DESIRED_TEAM_SIZE = 4

    def decide_action(self, state: AgentState) -> ActionDecision:
        item_decision = self.should_use_item(state)
        if item_decision:
            return item_decision

        if state.team_alive_count == 0:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="All fainted",
                priority=100.0,
            )

        if state.team_hp_percentage < self.CRITICAL_THRESHOLD:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason=f"Critical HP ({state.team_hp_percentage:.0f}%), go to center",
                priority=95.0,
            )

        if state.team_hp_percentage < self.HEAL_THRESHOLD and state.can_heal():
            return ActionDecision(
                action=Action.HEAL,
                reason=f"Healing at {state.team_hp_percentage:.0f}%",
                priority=80.0,
            )

        if state.inventory.total_balls() < 3 or state.inventory.total_healing() < 2:
            if state.money >= 500:
                return ActionDecision(
                    action=Action.SHOP,
                    reason="Restock supplies",
                    priority=60.0,
                )

        gym = self.choose_gym_target(state)
        if gym and state.team_hp_percentage >= self.GYM_HP_REQUIREMENT:
            return ActionDecision(
                action=Action.GYM_CHALLENGE,
                target=gym,
                reason=f"Ready for gym {gym}",
                priority=75.0,
            )

        if len(state.team) < self.DESIRED_TEAM_SIZE and state.can_catch():
            return ActionDecision(
                action=Action.HUNT,
                reason=f"Building team ({len(state.team)}/{self.DESIRED_TEAM_SIZE})",
                priority=65.0,
                data={"prefer_catch": True},
            )

        return ActionDecision(
            action=Action.HUNT,
            reason="Training and leveling",
            priority=50.0,
        )

    def should_catch(self, state: AgentState, wild_monster: Monster) -> bool:
        if not state.can_catch():
            return False
        if wild_monster.is_shiny:
            return True
        if len(state.team) < self.DESIRED_TEAM_SIZE:
            existing_types = state.unique_types_in_team()
            for t in wild_monster.types:
                if t not in existing_types:
                    return True
        if wild_monster.level >= state.average_team_level + 3:
            return True
        team_species = {m.species.species_id for m in state.team}
        box_species = {m.species.species_id for m in state.box}
        if wild_monster.species.species_id not in team_species | box_species:
            return True
        return False

    def should_heal(self, state: AgentState) -> bool:
        return state.team_hp_percentage < self.HEAL_THRESHOLD

    def pick_battle_move(self, attacker: Monster, defender: Monster) -> Optional[str]:
        best_move_name: Optional[str] = None
        best_score = -1.0
        for move in attacker.moves:
            if not move.has_pp():
                continue
            if move.power == 0:
                if move.effect == "paralyze" and defender.status is None:
                    return move.name
                continue
            eff = get_dual_effectiveness(move.move_type, defender.types)
            if move.is_special:
                raw = move.power * (attacker.sp_attack / max(defender.sp_defense, 1))
            else:
                raw = move.power * (attacker.attack / max(defender.defense, 1))
            accuracy_factor = move.accuracy / 100.0
            score = raw * eff * accuracy_factor
            if score > best_score:
                best_score = score
                best_move_name = move.name
        return best_move_name

    def pick_switch(self, state: AgentState, opponent: Monster) -> Optional[int]:
        lead = state.lead_monster
        if lead and not lead.is_fainted:
            lead_eff = max(
                (get_dual_effectiveness(m.move_type, opponent.types) for m in lead.moves if m.has_pp() and m.power > 0),
                default=1.0,
            )
            if lead_eff >= 1.0 and lead.hp_percentage > 30:
                return None

        best_idx: Optional[int] = None
        best_score = -1.0
        for i, monster in enumerate(state.team):
            if monster.is_fainted or monster == lead:
                continue
            type_score = 1.0
            for move in monster.moves:
                if move.has_pp() and move.power > 0:
                    eff = get_dual_effectiveness(move.move_type, opponent.types)
                    type_score = max(type_score, eff)
            hp_score = monster.hp_percentage / 100.0
            score = type_score * 2.0 + hp_score
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
            if state.average_team_level >= required + self.GYM_LEVEL_BUFFER:
                if state.team_alive_count >= min(3, len(state.team)):
                    return gym_id
            break
        return None