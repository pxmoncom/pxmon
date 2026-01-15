"""Base strategy interface for PXMON agents."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from ..models.agent_state import AgentState
from ..models.monster import Monster


class Action(Enum):
    HUNT = "hunt"
    BATTLE = "battle"
    CATCH = "catch"
    HEAL = "heal"
    HEAL_CENTER = "heal_center"
    GYM_CHALLENGE = "gym_challenge"
    MOVE = "move"
    USE_ITEM = "use_item"
    SWAP_LEAD = "swap_lead"
    IDLE = "idle"
    SHOP = "shop"


@dataclass
class ActionDecision:
    action: Action
    target: Optional[str] = None
    priority: float = 0.0
    reason: str = ""
    data: Optional[dict] = None


class BaseStrategy(ABC):
    """Abstract base class for agent decision-making strategies."""

    name: str = "base"
    description: str = "Base strategy"

    @abstractmethod
    def decide_action(self, state: AgentState) -> ActionDecision:
        """Decide the next action based on current state."""
        ...

    @abstractmethod
    def should_catch(self, state: AgentState, wild_monster: Monster) -> bool:
        """Decide whether to attempt catching a wild monster."""
        ...

    @abstractmethod
    def should_heal(self, state: AgentState) -> bool:
        """Decide whether to heal the team."""
        ...

    @abstractmethod
    def pick_battle_move(self, attacker: Monster, defender: Monster) -> Optional[str]:
        """Pick which move to use in battle."""
        ...

    @abstractmethod
    def pick_switch(self, state: AgentState, opponent: Monster) -> Optional[int]:
        """Pick which team member to switch to (index), or None to stay."""
        ...

    @abstractmethod
    def choose_gym_target(self, state: AgentState) -> Optional[str]:
        """Pick which gym to challenge next, or None if not ready."""
        ...

    def evaluate_team_strength(self, state: AgentState) -> float:
        """Score the team's overall combat readiness 0.0-1.0."""
        if not state.team:
            return 0.0
        alive = sum(1 for m in state.team if not m.is_fainted)
        hp_ratio = state.team_hp_percentage / 100.0
        level_score = min(state.average_team_level / 100.0, 1.0)
        team_score = alive / max(len(state.team), 1)
        return (hp_ratio * 0.4 + level_score * 0.3 + team_score * 0.3)

    def should_use_item(self, state: AgentState) -> Optional[ActionDecision]:
        """Check if using an item is optimal right now."""
        for monster in state.team:
            if monster.is_fainted and state.inventory.revives > 0:
                return ActionDecision(
                    action=Action.USE_ITEM,
                    target=monster.uid,
                    reason=f"Revive fainted {monster.display_name}",
                    data={"item": "revive"},
                )
        return None