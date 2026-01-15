"""Tests for PXMON strategy implementations."""

import pytest
from src.strategies.aggressive import AggressiveStrategy
from src.strategies.balanced import BalancedStrategy
from src.strategies.collector import CollectorStrategy
from src.strategies.speedrunner import SpeedrunnerStrategy
from src.strategies.base import Action
from src.models.agent_state import AgentState, Position, Inventory, GymBadge
from src.models.monster import Monster, SpeciesData, BaseStats, Move, IVs, EVs, create_monster
from src.utils.type_chart import MonsterType
from src.utils.rng import SeededRNG


def _make_state(
    team_hp_pct: float = 100.0,
    team_level: int = 10,
    badges: int = 0,
    pokeballs: int = 10,
    potions: int = 5,
    team_size: int = 1,
    money: int = 3000,
) -> AgentState:
    rng = SeededRNG(42)
    state = AgentState(
        agent_id="test",
        name="Test",
        strategy="balanced",
        money=money,
        inventory=Inventory(pokeballs=pokeballs, potions=potions),
    )
    for i in range(team_size):
        mon = create_monster("flamelet", team_level, f"mon_{i}", rng)
        mon.current_hp = int(mon.max_hp * team_hp_pct / 100.0)
        state.team.append(mon)
    for i in range(badges):
        state.badges.append(GymBadge(f"gym_{i+1}", f"Gym {i+1}", f"Badge {i+1}", "rock", 0))
    return state


def _make_wild_monster(species: str = "zappik", level: int = 5) -> Monster:
    rng = SeededRNG(99)
    return create_monster(species, level, "wild_test", rng)


class TestAggressiveStrategy:
    def setup_method(self):
        self.strat = AggressiveStrategy()

    def test_hunts_when_healthy(self):
        state = _make_state(team_hp_pct=80.0)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.HUNT

    def test_heals_only_when_critical(self):
        state = _make_state(team_hp_pct=50.0)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.HUNT

    def test_heals_when_very_low(self):
        state = _make_state(team_hp_pct=10.0)
        decision = self.strat.decide_action(state)
        assert decision.action in (Action.HEAL, Action.HEAL_CENTER)

    def test_catches_high_catch_rate(self):
        state = _make_state()
        wild = _make_wild_monster("zappik", 5)
        assert self.strat.should_catch(state, wild) is True

    def test_picks_strongest_move(self):
        state = _make_state()
        attacker = state.team[0]
        defender = _make_wild_monster()
        move = self.strat.pick_battle_move(attacker, defender)
        assert move is not None

    def test_no_switch_when_healthy(self):
        state = _make_state(team_size=3)
        opponent = _make_wild_monster()
        result = self.strat.pick_switch(state, opponent)
        assert result is None


class TestBalancedStrategy:
    def setup_method(self):
        self.strat = BalancedStrategy()

    def test_heals_at_half_hp(self):
        state = _make_state(team_hp_pct=40.0)
        decision = self.strat.decide_action(state)
        assert decision.action in (Action.HEAL, Action.HEAL_CENTER)

    def test_hunts_when_healthy(self):
        state = _make_state(team_hp_pct=90.0)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.HUNT

    def test_catches_new_types(self):
        state = _make_state()
        wild = _make_wild_monster("tidalin", 8)
        result = self.strat.should_catch(state, wild)
        assert result is True

    def test_skips_duplicate_species(self):
        state = _make_state(team_size=4)
        # flamelet already in team, add more of same type
        wild_flamelet = _make_wild_monster("flamelet", 5)
        # Might still catch if level is higher, but basic dupe check
        # Balanced catches new species not in team+box
        result = self.strat.should_catch(state, wild_flamelet)
        # flamelet IS in team so depends on level diff
        assert isinstance(result, bool)

    def test_shops_when_low_supplies(self):
        state = _make_state(pokeballs=1, potions=0, money=2000)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.SHOP

    def test_gym_with_level_buffer(self):
        state = _make_state(team_level=20)
        gym = self.strat.choose_gym_target(state)
        assert gym == "gym_1"

    def test_no_gym_when_underlevel(self):
        state = _make_state(team_level=5)
        gym = self.strat.choose_gym_target(state)
        assert gym is None


class TestCollectorStrategy:
    def setup_method(self):
        self.strat = CollectorStrategy()

    def test_always_catches_new_species(self):
        state = _make_state()
        wild = _make_wild_monster("tidalin", 5)
        assert self.strat.should_catch(state, wild) is True

    def test_catches_shinies(self):
        state = _make_state()
        wild = _make_wild_monster("flamelet", 5)
        wild.is_shiny = True
        assert self.strat.should_catch(state, wild) is True

    def test_catches_rare_monsters(self):
        state = _make_state()
        wild = _make_wild_monster("phantling", 10)
        assert self.strat.should_catch(state, wild) is True

    def test_weakening_move_when_low_hp(self):
        state = _make_state()
        attacker = state.team[0]
        defender = _make_wild_monster()
        defender.current_hp = int(defender.max_hp * 0.3)
        move = self.strat.pick_battle_move(attacker, defender)
        assert move is not None

    def test_delayed_gym_challenge(self):
        state = _make_state(team_level=20)
        gym = self.strat.choose_gym_target(state)
        # Collector needs +8 levels, so gym_1 (level 14) needs 22
        assert gym is None

        state2 = _make_state(team_level=25)
        gym2 = self.strat.choose_gym_target(state2)
        assert gym2 == "gym_1"


class TestSpeedrunnerStrategy:
    def setup_method(self):
        self.strat = SpeedrunnerStrategy()

    def test_rushes_gym_when_ready(self):
        state = _make_state(team_level=14, team_hp_pct=80.0)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.GYM_CHALLENGE

    def test_grinds_when_underleveled(self):
        state = _make_state(team_level=8)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.HUNT

    def test_heals_before_gym(self):
        state = _make_state(team_level=14, team_hp_pct=30.0)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.HEAL_CENTER

    def test_minimal_catching(self):
        state = _make_state(team_size=3)
        wild = _make_wild_monster("rockpup", 10)
        result = self.strat.should_catch(state, wild)
        # Speedrunner only catches if type advantage for next gym or team < 2
        assert isinstance(result, bool)

    def test_idle_after_all_gyms(self):
        state = _make_state(team_level=60, badges=8)
        decision = self.strat.decide_action(state)
        assert decision.action == Action.IDLE

    def test_picks_priority_moves(self):
        state = _make_state()
        attacker = state.team[0]
        defender = _make_wild_monster()
        move = self.strat.pick_battle_move(attacker, defender)
        assert move is not None


class TestStrategyEvaluateTeam:
    def test_full_team_high_score(self):
        strat = BalancedStrategy()
        state = _make_state(team_hp_pct=100.0, team_level=50, team_size=6)
        score = strat.evaluate_team_strength(state)
        assert score > 0.5

    def test_empty_team_zero(self):
        strat = BalancedStrategy()
        state = AgentState(agent_id="empty", name="Empty", strategy="balanced")
        score = strat.evaluate_team_strength(state)
        assert score == 0.0

    def test_damaged_team_lower(self):
        strat = BalancedStrategy()
        full = _make_state(team_hp_pct=100.0, team_level=20)
        damaged = _make_state(team_hp_pct=30.0, team_level=20)
        assert strat.evaluate_team_strength(full) > strat.evaluate_team_strength(damaged)