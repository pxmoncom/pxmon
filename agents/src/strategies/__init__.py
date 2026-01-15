from .base import BaseStrategy, ActionDecision, Action
from .aggressive import AggressiveStrategy
from .balanced import BalancedStrategy
from .collector import CollectorStrategy
from .speedrunner import SpeedrunnerStrategy

STRATEGY_MAP: dict[str, type[BaseStrategy]] = {
    "aggressive": AggressiveStrategy,
    "balanced": BalancedStrategy,
    "collector": CollectorStrategy,
    "speedrunner": SpeedrunnerStrategy,
}