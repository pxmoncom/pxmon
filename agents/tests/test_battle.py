"""Tests for battle logic and mechanics."""

import pytest
from src.agent import BattleEngine
from src.models.monster import Monster, create_monster, MOVE_DATABASE, Move
from src.models.battle_result import BattleResult, TurnAction, CatchAttempt
from src.utils.type_chart import MonsterType, get_effectiveness, get_dual_effectiveness, get_weaknesses, get_resistances
from src.utils.xp_calculator import xp_for_level, xp_to_next_level, calculate_xp_gain, calculate_stat_at_level
from src.utils.rng import SeededRNG
from src.strategies.balanced import BalancedStrategy


class TestTypeChart:
    def test_fire_vs_grass(self):
        assert get_effectiveness(MonsterType.FIRE, MonsterType.GRASS) == 2.0

    def test_water_vs_fire(self):
        assert get_effectiveness(MonsterType.WATER, MonsterType.FIRE) == 2.0

    def test_electric_vs_ground(self):
        assert get_effectiveness(MonsterType.ELECTRIC, MonsterType.GROUND) == 0.0

    def test_normal_vs_ghost(self):
        assert get_effectiveness(MonsterType.NORMAL, MonsterType.GHOST) == 0.0

    def test_fighting_vs_dark(self):
        assert get_effectiveness(MonsterType.FIGHTING, MonsterType.DARK) == 2.0

    def test_neutral_matchup(self):
        assert get_effectiveness(MonsterType.NORMAL, MonsterType.NORMAL) == 1.0

    def test_dual_type_effectiveness(self):
        eff = get_dual_effectiveness(MonsterType.GRASS, (MonsterType.ROCK, MonsterType.GROUND))
        assert eff == 4.0  # super effective against both

    def test_weaknesses(self):
        weak = get_weaknesses((MonsterType.FIRE,))
        assert MonsterType.WATER in weak
        assert MonsterType.GROUND in weak
        assert MonsterType.ROCK in weak

    def test_resistances(self):
        resist = get_resistances((MonsterType.FIRE,))
        assert MonsterType.GRASS in resist
        assert MonsterType.BUG in resist


class TestXPCalculator:
    def test_level_1_needs_no_xp(self):
        assert xp_for_level(1) == 0

    def test_level_increases(self):
        assert xp_for_level(10) > xp_for_level(5)

    def test_xp_to_next(self):
        to_next = xp_to_next_level(5)
        assert to_next == xp_for_level(6) - xp_for_level(5)
        assert to_next > 0

    def test_max_level_no_xp_needed(self):
        assert xp_to_next_level(100) == 0

    def test_xp_gain_calculation(self):
        result = calculate_xp_gain(
            current_xp=0, current_level=5,
            base_xp_yield=64, enemy_level=10,
            is_wild=True,
        )
        assert result.xp_gained > 0
        assert result.new_total_xp == result.xp_gained

    def test_xp_gain_level_up(self):
        result = calculate_xp_gain(
            current_xp=xp_for_level(5) - 1,
            current_level=4,
            base_xp_yield=200,
            enemy_level=50,
            is_wild=False,
        )
        assert result.new_level >= 5

    def test_stat_calculation(self):
        hp = calculate_stat_at_level(45, 15, 0, 10, is_hp=True)
        assert hp > 0
        atk = calculate_stat_at_level(60, 15, 0, 10, is_hp=False)
        assert atk > 0

    def test_higher_level_higher_stats(self):
        hp_10 = calculate_stat_at_level(45, 15, 0, 10, is_hp=True)
        hp_50 = calculate_stat_at_level(45, 15, 0, 50, is_hp=True)
        assert hp_50 > hp_10


class TestRNG:
    def test_deterministic(self):
        rng1 = SeededRNG(42)
        rng2 = SeededRNG(42)
        for _ in range(100):
            assert rng1.next_float() == rng2.next_float()

    def test_different_seeds(self):
        rng1 = SeededRNG(42)
        rng2 = SeededRNG(43)
        vals1 = [rng1.next_float() for _ in range(10)]
        vals2 = [rng2.next_float() for _ in range(10)]
        assert vals1 != vals2

    def test_int_range(self):
        rng = SeededRNG(42)
        for _ in range(100):
            val = rng.next_int(1, 10)
            assert 1 <= val <= 10

    def test_choice(self):
        rng = SeededRNG(42)
        items = ["a", "b", "c", "d"]
        result = rng.choice(items)
        assert result in items

    def test_shuffle(self):
        rng = SeededRNG(42)
        items = [1, 2, 3, 4, 5]
        shuffled = rng.shuffle(items)
        assert sorted(shuffled) == sorted(items)
        assert len(shuffled) == len(items)

    def test_weighted_choice(self):
        rng = SeededRNG(42)
        items = ["common", "rare"]
        weights = [0.9, 0.1]
        results = [rng.weighted_choice(items, weights) for _ in range(1000)]
        common_count = results.count("common")
        assert common_count > 700

    def test_snapshot_restore(self):
        rng = SeededRNG(42)
        for _ in range(50):
            rng.next_float()
        snap = rng.snapshot()
        val1 = rng.next_float()
        restored = SeededRNG.restore(snap)
        val2 = restored.next_float()
        assert val1 == val2

    def test_fork(self):
        rng = SeededRNG(42)
        child1 = rng.fork("battle")
        child2 = rng.fork("catch")
        assert child1.next_float() != child2.next_float()

    def test_from_string(self):
        rng1 = SeededRNG.from_string("hello")
        rng2 = SeededRNG.from_string("hello")
        assert rng1.next_float() == rng2.next_float()


class TestBattleEngine:
    def setup_method(self):
        self.rng = SeededRNG(42)
        self.engine = BattleEngine(self.rng)
        self.strategy = BalancedStrategy()

    def _make_monster(self, species: str, level: int) -> Monster:
        return create_monster(species, level, f"test_{species}", SeededRNG(99))

    def test_battle_produces_result(self):
        atk = self._make_monster("flamelet", 10)
        dfn = self._make_monster("sproutix", 8)
        result = self.engine.resolve_battle(atk, dfn, "agent_1", "wild", "wild", self.strategy)
        assert isinstance(result, BattleResult)
        assert result.winner in ("agent_1", "wild")
        assert result.total_turns > 0

    def test_type_advantage_matters(self):
        """Fire should generally beat Grass."""
        wins = 0
        for seed in range(20):
            rng = SeededRNG(seed)
            engine = BattleEngine(rng)
            atk = create_monster("flamelet", 15, f"fire_{seed}", SeededRNG(seed + 100))
            dfn = create_monster("sproutix", 15, f"grass_{seed}", SeededRNG(seed + 200))
            result = engine.resolve_battle(atk, dfn, "fire", "grass", "wild", self.strategy)
            if result.winner == "fire":
                wins += 1
        assert wins > 10  # Should win most of the time

    def test_higher_level_advantage(self):
        wins = 0
        for seed in range(20):
            rng = SeededRNG(seed)
            engine = BattleEngine(rng)
            atk = create_monster("flamelet", 30, f"high_{seed}", SeededRNG(seed + 100))
            dfn = create_monster("flamelet", 10, f"low_{seed}", SeededRNG(seed + 200))
            result = engine.resolve_battle(atk, dfn, "high", "low", "wild", self.strategy)
            if result.winner == "high":
                wins += 1
        assert wins >= 15

    def test_battle_xp_gain(self):
        atk = self._make_monster("flamelet", 10)
        dfn = self._make_monster("zappik", 12)
        result = self.engine.resolve_battle(atk, dfn, "agent", "wild", "wild", self.strategy)
        if result.attacker_won:
            assert result.xp_gained > 0

    def test_battle_turn_actions(self):
        atk = self._make_monster("flamelet", 10)
        dfn = self._make_monster("tidalin", 10)
        result = self.engine.resolve_battle(atk, dfn, "a", "b", "wild", self.strategy)
        assert len(result.turns) > 0
        for turn in result.turns:
            assert isinstance(turn, TurnAction)
            assert turn.move_used != ""

    def test_battle_replay_log(self):
        atk = self._make_monster("flamelet", 10)
        dfn = self._make_monster("sproutix", 8)
        result = self.engine.resolve_battle(atk, dfn, "a", "b", "wild", self.strategy)
        log = result.replay_log()
        assert len(log) > 0
        assert "Battle" in log[0]


class TestCatchMechanics:
    def setup_method(self):
        self.rng = SeededRNG(42)
        self.engine = BattleEngine(self.rng)

    def test_catch_attempt_structure(self):
        mon = create_monster("zappik", 5, "test", SeededRNG(99))
        mon.current_hp = mon.max_hp // 4
        result = self.engine.attempt_catch(mon, "pokeball")
        assert isinstance(result, CatchAttempt)
        assert result.ball_used == "pokeball"
        assert 0 <= result.shake_count <= 3

    def test_ultra_ball_better_than_pokeball(self):
        catches_poke = 0
        catches_ultra = 0
        for seed in range(100):
            mon = create_monster("phantling", 10, f"p_{seed}", SeededRNG(seed + 500))
            mon.current_hp = mon.max_hp // 3
            engine = BattleEngine(SeededRNG(seed))
            r1 = engine.attempt_catch(mon, "pokeball")
            if r1.success:
                catches_poke += 1
            mon2 = create_monster("phantling", 10, f"u_{seed}", SeededRNG(seed + 500))
            mon2.current_hp = mon2.max_hp // 3
            engine2 = BattleEngine(SeededRNG(seed))
            r2 = engine2.attempt_catch(mon2, "ultra_ball")
            if r2.success:
                catches_ultra += 1
        assert catches_ultra >= catches_poke

    def test_low_hp_easier_catch(self):
        catches_full = 0
        catches_low = 0
        for seed in range(100):
            mon_full = create_monster("zappik", 10, f"f_{seed}", SeededRNG(seed + 300))
            engine1 = BattleEngine(SeededRNG(seed))
            r1 = engine1.attempt_catch(mon_full, "pokeball")
            if r1.success:
                catches_full += 1
            mon_low = create_monster("zappik", 10, f"l_{seed}", SeededRNG(seed + 300))
            mon_low.current_hp = 1
            engine2 = BattleEngine(SeededRNG(seed))
            r2 = engine2.attempt_catch(mon_low, "pokeball")
            if r2.success:
                catches_low += 1
        assert catches_low >= catches_full

    def test_status_bonus(self):
        assert CatchAttempt.status_bonus_for("sleep") == 2.0
        assert CatchAttempt.status_bonus_for("paralyze") == 1.5
        assert CatchAttempt.status_bonus_for(None) == 1.0

    def test_ball_modifiers(self):
        assert CatchAttempt.ball_modifier_for("pokeball") == 1.0
        assert CatchAttempt.ball_modifier_for("great_ball") == 1.5
        assert CatchAttempt.ball_modifier_for("ultra_ball") == 2.0


class TestMonsterCreation:
    def test_create_all_species(self):
        rng = SeededRNG(42)
        for species in ["flamelet", "tidalin", "sproutix", "zappik", "rockpup", "phantling"]:
            mon = create_monster(species, 10, f"test_{species}", rng)
            assert mon.level == 10
            assert mon.max_hp > 0
            assert len(mon.moves) > 0

    def test_invalid_species(self):
        rng = SeededRNG(42)
        with pytest.raises(ValueError):
            create_monster("nonexistent", 10, "test", rng)

    def test_moves_learned_by_level(self):
        rng = SeededRNG(42)
        mon_low = create_monster("flamelet", 3, "low", rng)
        mon_high = create_monster("flamelet", 15, "high", SeededRNG(42))
        assert len(mon_high.moves) >= len(mon_low.moves)

    def test_shiny_rate(self):
        shiny_count = 0
        for seed in range(5000):
            rng = SeededRNG(seed)
            mon = create_monster("zappik", 5, f"s_{seed}", rng)
            if mon.is_shiny:
                shiny_count += 1
        assert shiny_count < 20  # ~1/4096 chance

    def test_monster_damage_and_heal(self):
        rng = SeededRNG(42)
        mon = create_monster("flamelet", 10, "test", rng)
        original_hp = mon.current_hp
        mon.take_damage(10)
        assert mon.current_hp == original_hp - 10
        mon.heal(5)
        assert mon.current_hp == original_hp - 5

    def test_monster_faint(self):
        rng = SeededRNG(42)
        mon = create_monster("flamelet", 10, "test", rng)
        mon.take_damage(9999)
        assert mon.is_fainted
        assert mon.current_hp == 0

    def test_full_heal(self):
        rng = SeededRNG(42)
        mon = create_monster("flamelet", 10, "test", rng)
        mon.take_damage(20)
        mon.status = "burn"
        mon.moves[0].use()
        mon.full_heal()
        assert mon.current_hp == mon.max_hp
        assert mon.status is None
        assert all(m.pp == m.max_pp for m in mon.moves)