"""Tests for PxmonAgent core functionality."""

import pytest
from src.agent import PxmonAgent, ZONE_ENCOUNTERS, ZONE_CONNECTIONS, GYM_DATA


class TestAgentRegistration:
    def test_register_creates_starter(self):
        agent = PxmonAgent("test_001", "Tester", "balanced", seed=100)
        result = agent.register("flamelet")
        assert "agent_id" in result
        assert result["agent_id"] == "test_001"
        assert result["starter"]["species_id"] == "flamelet"
        assert len(agent.state.team) == 1

    def test_register_different_starters(self):
        for starter in ["flamelet", "tidalin", "sproutix"]:
            agent = PxmonAgent(f"test_{starter}", "Tester", "balanced", seed=42)
            result = agent.register(starter)
            assert result["starter"]["species_id"] == starter

    def test_double_register_fails(self):
        agent = PxmonAgent("test_001", "Tester", "balanced", seed=100)
        agent.register("flamelet")
        result = agent.register("flamelet")
        assert "error" in result

    def test_register_sets_stats(self):
        agent = PxmonAgent("test_001", "Tester", "balanced", seed=100)
        agent.register("flamelet")
        assert agent.state.stats.monsters_caught == 1
        assert agent.state.stats.monsters_seen == 1

    def test_register_starter_level(self):
        agent = PxmonAgent("test_001", "Tester", "balanced", seed=100)
        result = agent.register("flamelet")
        assert agent.state.team[0].level == 5


class TestAgentHunting:
    def setup_method(self):
        self.agent = PxmonAgent("hunt_test", "Hunter", "aggressive", seed=42)
        self.agent.register("flamelet")

    def test_hunt_returns_result(self):
        result = self.agent.hunt()
        assert "result" in result

    def test_hunt_increments_seen(self):
        initial_seen = self.agent.state.stats.monsters_seen
        self.agent.hunt()
        assert self.agent.state.stats.monsters_seen > initial_seen

    def test_hunt_in_empty_zone(self):
        self.agent.state.position.zone = "town_1"
        result = self.agent.hunt()
        assert result["result"] == "no_encounters"

    def test_hunt_updates_last_action(self):
        self.agent.hunt()
        assert self.agent.state.last_action in ("hunt", "catch", "catch_failed")

    def test_hunt_multiple_times(self):
        for _ in range(10):
            result = self.agent.hunt()
            assert "result" in result


class TestAgentMovement:
    def setup_method(self):
        self.agent = PxmonAgent("move_test", "Mover", "balanced", seed=42)
        self.agent.register("tidalin")

    def test_move_to_adjacent(self):
        result = self.agent.move("route_2")
        assert result["result"] == "moved"
        assert self.agent.state.position.zone == "route_2"

    def test_move_invalid_zone(self):
        result = self.agent.move("route_3")
        assert "error" in result

    def test_move_updates_distance(self):
        initial = self.agent.state.stats.total_distance
        self.agent.move("route_2")
        assert self.agent.state.stats.total_distance == initial + 1

    def test_move_chain(self):
        self.agent.move("route_2")
        self.agent.move("route_3")
        assert self.agent.state.position.zone == "route_3"


class TestAgentHealing:
    def setup_method(self):
        self.agent = PxmonAgent("heal_test", "Healer", "balanced", seed=42)
        self.agent.register("sproutix")

    def test_heal_center_full_restore(self):
        self.agent.state.team[0].current_hp = 1
        result = self.agent.heal_center()
        assert result["result"] == "healed_at_center"
        assert self.agent.state.team[0].current_hp == self.agent.state.team[0].max_hp

    def test_heal_with_potions(self):
        self.agent.state.team[0].current_hp = 1
        result = self.agent.heal()
        assert result["result"] == "healed"
        assert len(result["actions"]) > 0

    def test_heal_center_clears_status(self):
        self.agent.state.team[0].status = "burn"
        self.agent.heal_center()
        assert self.agent.state.team[0].status is None


class TestAgentGym:
    def setup_method(self):
        self.agent = PxmonAgent("gym_test", "Challenger", "aggressive", seed=42)
        self.agent.register("tidalin")
        # Level up to be gym-ready
        self.agent.state.team[0].level = 20
        self.agent.state.team[0].attack = 50
        self.agent.state.team[0].defense = 50
        self.agent.state.team[0].sp_attack = 50
        self.agent.state.team[0].sp_defense = 50
        self.agent.state.team[0].speed = 50
        self.agent.state.team[0].max_hp = 80
        self.agent.state.team[0].current_hp = 80

    def test_gym_challenge_returns_result(self):
        result = self.agent.gym_challenge("gym_1")
        assert result["gym_id"] == "gym_1"
        assert result["result"] in ("gym_won", "gym_lost")

    def test_invalid_gym(self):
        result = self.agent.gym_challenge("gym_99")
        assert "error" in result

    def test_no_double_badge(self):
        from src.models.agent_state import GymBadge
        self.agent.state.badges.append(GymBadge("gym_1", "Stone Gym", "Boulder Badge", "rock", 0))
        result = self.agent.gym_challenge("gym_1")
        assert "error" in result


class TestAutoTick:
    def test_auto_tick_returns_structure(self):
        agent = PxmonAgent("tick_test", "Ticker", "balanced", seed=42)
        agent.register("flamelet")
        result = agent.auto_tick()
        assert "tick" in result
        assert "decision" in result
        assert "result" in result
        assert "state_summary" in result

    def test_auto_tick_increments(self):
        agent = PxmonAgent("tick_test", "Ticker", "balanced", seed=42)
        agent.register("flamelet")
        agent.auto_tick()
        agent.auto_tick()
        assert agent.state.current_tick == 2

    def test_auto_tick_all_strategies(self):
        for strat in ["aggressive", "balanced", "collector", "speedrunner"]:
            agent = PxmonAgent(f"tick_{strat}", "Ticker", strat, seed=42)
            agent.register("flamelet")
            for _ in range(5):
                result = agent.auto_tick()
                assert "tick" in result

    def test_auto_tick_with_fainted_team(self):
        agent = PxmonAgent("tick_faint", "Ticker", "balanced", seed=42)
        agent.register("flamelet")
        agent.state.team[0].current_hp = 0
        result = agent.auto_tick()
        assert result["decision"]["action"] == "heal_center"

    def test_deterministic_replay(self):
        """Same seed should produce identical results."""
        results_a = []
        results_b = []
        for label, results in [("a", results_a), ("b", results_b)]:
            agent = PxmonAgent(f"det_{label}", "Det", "balanced", seed=999)
            agent.register("flamelet")
            for _ in range(10):
                r = agent.auto_tick()
                results.append(r["decision"]["action"])
        assert results_a == results_b