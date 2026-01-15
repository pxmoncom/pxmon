"""Collector strategy - prioritize catching, type diversity, fill the dex."""

from typing import Optional
from .base import BaseStrategy, ActionDecision, Action
from ..models.agent_state import AgentState
from ..models.monster import Monster
from ..utils.type_chart import get_dual_effectiveness, MonsterType


class CollectorStrategy(BaseStrategy):
    name = "collector"
    description = "Catch 'em all. Prioritize catching new species and type coverage."

    HEAL_THRESHOLD = 40.0
    MAX_TEAM_SIZE = 6
    ALWAYS_CATCH_BELOW_RATE = 120

    def decide_action(self, state: AgentState) -> ActionDecision:
        item_decision = self.should_use_item(state)
        if item_decision:
            return item_decision

        if state.team_alive_count == 0:
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="Team wiped",
                priority=100.0,
            )

        if self.should_heal(state):
            if state.can_heal():
                return ActionDecision(
                    action=Action.HEAL,
                    reason="Heal before hunting",
                    priority=85.0,
                )
            return ActionDecision(
                action=Action.HEAL_CENTER,
                reason="Need healing center",
                priority=85.0,
            )

        if state.inventory.total_balls() == 0:
            if state.money >= 200:
                return ActionDecision(
                    action=Action.SHOP,
                    reason="Need pokeballs for catching",
                    priority=90.0,
                )

        return ActionDecision(
            action=Action.HUNT,
            reason="Searching for new species to catch",
            priority=50.0,
            data={"prefer_catch": True},
        )

    def should_catch(self, state: AgentState, wild_monster: Monster) -> bool:
        if not state.can_catch():
            if len(state.team) >= 6 and state.inventory.total_balls() > 0:
                return self._is_new_species(state, wild_monster)
            return False

        if wild_monster.is_shiny:
            return True

        if self._is_new_species(state, wild_monster):
            return True

        if wild_monster.species.catch_rate <= self.ALWAYS_CATCH_BELOW_RATE:
            return True

        team_types = state.unique_types_in_team()
        for t in wild_monster.types:
            if t not in team_types:
                return True

        if wild_monster.level > state.average_team_level + 5:
            return True

        return False

    def should_heal(self, state: AgentState) -> bool:
        return state.team_hp_percentage < self.HEAL_THRESHOLD

    def pick_battle_move(self, attacker: Monster, defender: Monster) -> Optional[str]:
        """Collector tries to weaken, not KO, when catching."""
        best_weak_move: Optional[str] = None
        best_strong_move: Optional[str] = None
        lowest_power = 999
        best_damage = -1.0

        for move in attacker.moves:
            if not move.has_pp():
                continue
            if move.power == 0:
                if move.effect in ("sleep", "paralyze") and defender.status is None:
                    return move.name
                continue
            eff = get_dual_effectiveness(move.move_type, defender.types)
            if move.is_special:
                raw = move.power * (attacker.sp_attack / max(defender.sp_defense, 1))
            else:
                raw = move.power * (attacker.attack / max(defender.defense, 1))
            score = raw * eff
            if move.power < lowest_power:
                lowest_power = move.power
                best_weak_move = move.name
            if score > best_damage:
                best_damage = score
                best_strong_move = move.name

        if defender.hp_percentage > 50:
            return best_strong_move
        return best_weak_move or best_strong_move

    def pick_switch(self, state: AgentState, opponent: Monster) -> Optional[int]:
        lead = state.lead_monster
        if lead and not lead.is_fainted and lead.hp_percentage > 20:
            return None

        best_idx: Optional[int] = None
        best_hp = -1.0
        for i, monster in enumerate(state.team):
            if monster.is_fainted:
                continue
            if monster == lead:
                continue
            if monster.hp_percentage > best_hp:
                best_hp = monster.hp_percentage
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
            if state.average_team_level >= required + 8:
                return gym_id
            break
        return None

    def _is_new_species(self, state: AgentState, monster: Monster) -> bool:
        all_owned = {m.species.species_id for m in state.team} | {m.species.species_id for m in state.box}
        return monster.species.species_id not in all_owned