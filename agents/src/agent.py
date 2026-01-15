"""PxmonAgent - Core agent class that drives autonomous monster battling."""

import uuid
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from copy import deepcopy

from .models.monster import Monster, SpeciesData, Move, create_monster, STARTER_SPECIES, MOVE_DATABASE
from .models.agent_state import AgentState, Position, Inventory, AgentStats, GymBadge
from .models.battle_result import BattleResult, TurnAction, CatchAttempt
from .strategies.base import BaseStrategy, ActionDecision, Action
from .strategies import STRATEGY_MAP
from .utils.type_chart import MonsterType, get_dual_effectiveness, get_effectiveness
from .utils.xp_calculator import calculate_xp_gain, xp_for_level, check_evolution
from .utils.rng import SeededRNG


# Zone encounter tables
ZONE_ENCOUNTERS: dict[str, list[tuple[str, int, int, float]]] = {
    "route_1": [
        ("zappik", 3, 7, 0.35),
        ("rockpup", 3, 6, 0.30),
        ("sproutix", 4, 7, 0.20),
        ("phantling", 5, 8, 0.15),
    ],
    "route_2": [
        ("flamelet", 8, 14, 0.25),
        ("tidalin", 8, 14, 0.25),
        ("zappik", 10, 15, 0.20),
        ("rockpup", 10, 16, 0.15),
        ("phantling", 12, 18, 0.15),
    ],
    "route_3": [
        ("flamelet", 15, 22, 0.20),
        ("tidalin", 15, 22, 0.20),
        ("sproutix", 15, 22, 0.20),
        ("zappik", 18, 25, 0.15),
        ("rockpup", 18, 25, 0.15),
        ("phantling", 20, 28, 0.10),
    ],
    "cave_1": [
        ("rockpup", 12, 20, 0.40),
        ("phantling", 14, 22, 0.30),
        ("zappik", 15, 22, 0.30),
    ],
}

ZONE_CONNECTIONS: dict[str, list[str]] = {
    "route_1": ["route_2", "town_1"],
    "route_2": ["route_1", "route_3", "cave_1", "town_2"],
    "route_3": ["route_2", "town_3"],
    "cave_1": ["route_2"],
    "town_1": ["route_1"],
    "town_2": ["route_2"],
    "town_3": ["route_3"],
}

GYM_DATA: dict[str, dict] = {
    "gym_1": {"name": "Stone Gym", "type": MonsterType.ROCK, "badge": "Boulder Badge", "zone": "town_1", "leader_level": 14, "team_size": 2},
    "gym_2": {"name": "Tide Gym", "type": MonsterType.WATER, "badge": "Cascade Badge", "zone": "town_2", "leader_level": 20, "team_size": 3},
    "gym_3": {"name": "Volt Gym", "type": MonsterType.ELECTRIC, "badge": "Thunder Badge", "zone": "town_2", "leader_level": 26, "team_size": 3},
    "gym_4": {"name": "Thorn Gym", "type": MonsterType.GRASS, "badge": "Leaf Badge", "zone": "town_3", "leader_level": 32, "team_size": 3},
    "gym_5": {"name": "Brawl Gym", "type": MonsterType.FIGHTING, "badge": "Fist Badge", "zone": "town_3", "leader_level": 38, "team_size": 4},
    "gym_6": {"name": "Mind Gym", "type": MonsterType.PSYCHIC, "badge": "Mind Badge", "zone": "town_3", "leader_level": 42, "team_size": 4},
    "gym_7": {"name": "Frost Gym", "type": MonsterType.ICE, "badge": "Glacier Badge", "zone": "town_3", "leader_level": 48, "team_size": 5},
    "gym_8": {"name": "Scale Gym", "type": MonsterType.DRAGON, "badge": "Dragon Badge", "zone": "town_3", "leader_level": 55, "team_size": 5},
}


class BattleEngine:
    """Handles turn-by-turn battle resolution."""

    def __init__(self, rng: SeededRNG) -> None:
        self.rng = rng

    def resolve_battle(
        self,
        attacker: Monster,
        defender: Monster,
        attacker_id: str,
        defender_id: str,
        battle_type: str,
        attacker_strategy: BaseStrategy,
    ) -> BattleResult:
        battle_id = uuid.uuid4().hex[:12]
        turns: list[TurnAction] = []
        turn_count = 0
        max_turns = 50

        atk = attacker
        dfn = defender

        while turn_count < max_turns:
            if atk.is_fainted or dfn.is_fainted:
                break

            turn_count += 1

            # Determine turn order by speed
            first, second = (atk, dfn) if atk.speed >= dfn.speed else (dfn, atk)
            first_id = attacker_id if first == atk else defender_id
            second_id = defender_id if first == atk else attacker_id

            # First attacker's turn
            turn_action = self._execute_turn(
                turn_count, first, second, first_id, second_id, attacker_strategy if first == atk else None
            )
            turns.append(turn_action)
            if second.is_fainted:
                break

            # Second attacker's turn
            turn_action = self._execute_turn(
                turn_count, second, first, second_id, first_id, attacker_strategy if second == atk else None
            )
            turns.append(turn_action)
            if first.is_fainted:
                break

        winner = attacker_id if not atk.is_fainted else defender_id
        loser = defender_id if winner == attacker_id else attacker_id

        xp_gained = 0
        money_gained = 0
        if winner == attacker_id:
            xp_result = calculate_xp_gain(
                current_xp=atk.xp,
                current_level=atk.level,
                base_xp_yield=dfn.species.base_xp_yield,
                enemy_level=dfn.level,
                is_wild=(battle_type == "wild"),
            )
            xp_gained = xp_result.xp_gained
            money_gained = dfn.level * 20 if battle_type != "wild" else dfn.level * 8

        return BattleResult(
            battle_id=battle_id,
            battle_type=battle_type,
            winner=winner,
            loser=loser,
            attacker_id=attacker_id,
            defender_id=defender_id,
            turns=turns,
            total_turns=turn_count,
            xp_gained=xp_gained,
            money_gained=money_gained,
        )

    def _execute_turn(
        self,
        turn: int,
        attacker: Monster,
        defender: Monster,
        atk_id: str,
        def_id: str,
        strategy: Optional[BaseStrategy],
    ) -> TurnAction:
        if attacker.is_fainted:
            return TurnAction(
                turn=turn, attacker=atk_id, defender=def_id,
                move_used="(fainted)", damage_dealt=0, effectiveness=0,
                critical=False, missed=True, defender_hp_after=defender.current_hp,
            )

        # Pick move
        move: Optional[Move] = None
        if strategy:
            move_name = strategy.pick_battle_move(attacker, defender)
            if move_name:
                for m in attacker.moves:
                    if m.name == move_name and m.has_pp():
                        move = m
                        break
        if move is None:
            usable = [m for m in attacker.moves if m.has_pp()]
            if usable:
                move = self.rng.choice(usable)

        if move is None:
            return TurnAction(
                turn=turn, attacker=atk_id, defender=def_id,
                move_used="Struggle", damage_dealt=10, effectiveness=1.0,
                critical=False, missed=False, defender_hp_after=defender.current_hp,
                message="No PP left, used Struggle",
            )

        move.use()

        # Accuracy check
        hit_roll = self.rng.next_int(1, 100)
        if hit_roll > move.accuracy:
            return TurnAction(
                turn=turn, attacker=atk_id, defender=def_id,
                move_used=move.name, damage_dealt=0, effectiveness=1.0,
                critical=False, missed=True, defender_hp_after=defender.current_hp,
            )

        # Damage calculation
        if move.power == 0:
            status_applied = None
            if move.effect and self.rng.next_int(1, 100) <= move.effect_chance:
                if move.effect in ("sleep", "paralyze", "burn", "poison", "freeze"):
                    defender.status = move.effect
                    status_applied = move.effect
            return TurnAction(
                turn=turn, attacker=atk_id, defender=def_id,
                move_used=move.name, damage_dealt=0, effectiveness=1.0,
                critical=False, missed=False, defender_hp_after=defender.current_hp,
                status_applied=status_applied,
                message=f"{move.name} used as status move",
            )

        effectiveness = get_dual_effectiveness(move.move_type, defender.types)

        # Critical hit: 1/16 chance
        is_critical = self.rng.next_int(1, 16) == 1
        crit_mult = 1.5 if is_critical else 1.0

        # STAB
        stab = 1.5 if move.move_type in attacker.types else 1.0

        # Core damage formula
        if move.is_special:
            atk_stat = attacker.sp_attack
            def_stat = defender.sp_defense
        else:
            atk_stat = attacker.attack
            def_stat = defender.defense

        level_factor = (2.0 * attacker.level / 5.0 + 2.0)
        base_damage = (level_factor * move.power * atk_stat / def_stat) / 50.0 + 2.0
        random_factor = self.rng.next_int(85, 100) / 100.0
        total_damage = int(base_damage * stab * effectiveness * crit_mult * random_factor)
        total_damage = max(1, total_damage) if effectiveness > 0 else 0

        defender.take_damage(total_damage)

        # Status effect from damaging move
        status_applied = None
        if move.effect and move.effect_chance > 0 and defender.status is None:
            if self.rng.next_int(1, 100) <= move.effect_chance:
                if move.effect in ("burn", "paralyze", "poison", "freeze"):
                    defender.status = move.effect
                    status_applied = move.effect

        return TurnAction(
            turn=turn, attacker=atk_id, defender=def_id,
            move_used=move.name, damage_dealt=total_damage,
            effectiveness=effectiveness, critical=is_critical, missed=False,
            defender_hp_after=defender.current_hp, status_applied=status_applied,
        )

    def attempt_catch(
        self,
        monster: Monster,
        ball_type: str,
    ) -> CatchAttempt:
        ball_mod = CatchAttempt.ball_modifier_for(ball_type)
        status_mod = CatchAttempt.status_bonus_for(monster.status)
        hp_factor = (3.0 * monster.max_hp - 2.0 * monster.current_hp) / (3.0 * monster.max_hp)

        catch_value = monster.species.catch_rate * ball_mod * hp_factor * status_mod
        catch_chance = min(catch_value / 255.0, 1.0)

        shake_checks = 0
        for _ in range(3):
            if self.rng.next_float() < catch_chance:
                shake_checks += 1
            else:
                break

        success = shake_checks >= 3

        return CatchAttempt(
            ball_used=ball_type,
            ball_modifier=ball_mod,
            catch_rate=monster.species.catch_rate,
            hp_percentage=monster.hp_percentage,
            status_bonus=status_mod,
            shake_count=shake_checks,
            success=success,
            calculated_chance=catch_chance,
        )


class PxmonAgent:
    """
    Autonomous agent that plays PXMON using a configurable strategy.
    Supports: register, hunt, battle, catch, heal, gym_challenge, move, auto_tick.
    """

    def __init__(
        self,
        agent_id: str,
        name: str,
        strategy_name: str = "balanced",
        seed: int = 42,
    ) -> None:
        self.state = AgentState(
            agent_id=agent_id,
            name=name,
            strategy=strategy_name,
        )
        self.rng = SeededRNG(seed)
        self.battle_engine = BattleEngine(self.rng)
        self.history: list[dict] = []

        strategy_cls = STRATEGY_MAP.get(strategy_name)
        if strategy_cls is None:
            raise ValueError(f"Unknown strategy: {strategy_name}. Options: {list(STRATEGY_MAP.keys())}")
        self.strategy: BaseStrategy = strategy_cls()

    def register(self, starter_species: str = "flamelet") -> dict:
        """Register the agent with a starter monster."""
        if self.state.team:
            return {"error": "Already registered", "agent_id": self.state.agent_id}

        uid = f"mon_{uuid.uuid4().hex[:8]}"
        starter = create_monster(
            species_id=starter_species,
            level=5,
            uid=uid,
            rng=self.rng,
            trainer_id=self.state.agent_id,
        )
        self.state.team.append(starter)
        self.state.stats.monsters_caught = 1
        self.state.stats.monsters_seen = 1
        self.state.last_action = "register"
        self.state.last_action_result = f"Registered with {starter.display_name}"

        self._log_event("register", {"starter": starter.species.species_id, "uid": uid})

        return {
            "agent_id": self.state.agent_id,
            "starter": starter.to_dict(),
            "position": self.state.position.to_dict(),
        }

    def hunt(self) -> dict:
        """Search for wild encounters in the current zone."""
        zone = self.state.position.zone
        encounters = ZONE_ENCOUNTERS.get(zone)

        if not encounters:
            self.state.last_action = "hunt"
            self.state.last_action_result = "No encounters in this zone"
            return {"result": "no_encounters", "zone": zone}

        if not self.state.lead_monster:
            self.state.last_action = "hunt"
            self.state.last_action_result = "No usable monsters"
            return {"result": "no_usable_monsters"}

        # Roll for encounter
        species_ids = [e[0] for e in encounters]
        weights = [e[3] for e in encounters]
        chosen_idx = 0
        roll = self.rng.next_float()
        cumulative = 0.0
        for i, w in enumerate(weights):
            cumulative += w
            if roll < cumulative:
                chosen_idx = i
                break

        species_id, min_lvl, max_lvl, _ = encounters[chosen_idx]
        wild_level = self.rng.next_int(min_lvl, max_lvl)
        wild_uid = f"wild_{uuid.uuid4().hex[:8]}"
        wild_monster = create_monster(species_id, wild_level, wild_uid, self.rng)

        self.state.stats.monsters_seen += 1

        # Decide: catch or battle
        should_catch = self.strategy.should_catch(self.state, wild_monster)

        if should_catch and self.state.can_catch():
            return self._attempt_catch_sequence(wild_monster)

        return self._wild_battle(wild_monster)

    def _wild_battle(self, wild_monster: Monster) -> dict:
        """Execute a battle against a wild monster."""
        lead = self.state.lead_monster
        if not lead:
            return {"result": "no_usable_monsters"}

        result = self.battle_engine.resolve_battle(
            attacker=lead,
            defender=wild_monster,
            attacker_id=self.state.agent_id,
            defender_id="wild",
            battle_type="wild",
            attacker_strategy=self.strategy,
        )

        if result.attacker_won:
            self.state.stats.battles_won += 1
            xp_result = calculate_xp_gain(
                lead.xp, lead.level,
                wild_monster.species.base_xp_yield,
                wild_monster.level, is_wild=True,
            )
            lead.xp = xp_result.new_total_xp
            if xp_result.levels_gained > 0:
                lead.level = xp_result.new_level
                self._recalculate_stats(lead)
                if lead.level > self.state.stats.highest_level_reached:
                    self.state.stats.highest_level_reached = lead.level
            self.state.stats.total_xp_earned += xp_result.xp_gained
            self.state.money += result.money_gained
        else:
            self.state.stats.battles_lost += 1

        self.state.last_action = "hunt"
        self.state.last_action_result = f"{'Won' if result.attacker_won else 'Lost'} vs wild {wild_monster.display_name} Lv{wild_monster.level}"
        self._log_event("battle", result.to_dict())

        return {
            "result": "battle",
            "battle": result.to_dict(),
            "wild_monster": wild_monster.to_dict(),
        }

    def _attempt_catch_sequence(self, wild_monster: Monster) -> dict:
        """Try to catch: weaken then throw ball."""
        lead = self.state.lead_monster
        if not lead:
            return {"result": "no_usable_monsters"}

        # Weaken phase: attack once to lower HP
        if wild_monster.hp_percentage > 50:
            turn_action = self.battle_engine._execute_turn(
                1, lead, wild_monster, self.state.agent_id, "wild", self.strategy
            )

        # Throw ball
        ball_type = self.state.inventory.best_ball()
        if not ball_type:
            return self._wild_battle(wild_monster)

        self.state.inventory.use_ball(ball_type)
        catch_result = self.battle_engine.attempt_catch(wild_monster, ball_type)

        if catch_result.success:
            wild_monster.original_trainer = self.state.agent_id
            added_to_team = self.state.add_to_team(wild_monster)
            self.state.stats.monsters_caught += 1
            if wild_monster.is_shiny:
                self.state.stats.shinies_found += 1
            self.state.last_action = "catch"
            self.state.last_action_result = f"Caught {wild_monster.display_name} Lv{wild_monster.level}!"
            self._log_event("catch", {"monster": wild_monster.to_dict(), "ball": ball_type, "in_team": added_to_team})
            return {
                "result": "caught",
                "monster": wild_monster.to_dict(),
                "ball_used": ball_type,
                "in_team": added_to_team,
                "catch_details": {
                    "shake_count": catch_result.shake_count,
                    "chance": round(catch_result.calculated_chance, 3),
                },
            }
        else:
            self.state.last_action = "catch_failed"
            self.state.last_action_result = f"Failed to catch {wild_monster.display_name} ({catch_result.shake_count}/3 shakes)"
            return self._wild_battle(wild_monster)

    def battle(self, opponent_agent: "PxmonAgent") -> dict:
        """Battle another agent's lead monster."""
        my_lead = self.state.lead_monster
        their_lead = opponent_agent.state.lead_monster
        if not my_lead:
            return {"error": "No usable monsters"}
        if not their_lead:
            return {"error": "Opponent has no usable monsters"}

        result = self.battle_engine.resolve_battle(
            attacker=my_lead,
            defender=their_lead,
            attacker_id=self.state.agent_id,
            defender_id=opponent_agent.state.agent_id,
            battle_type="trainer",
            attacker_strategy=self.strategy,
        )

        if result.attacker_won:
            self.state.stats.battles_won += 1
            opponent_agent.state.stats.battles_lost += 1
            xp_result = calculate_xp_gain(
                my_lead.xp, my_lead.level,
                their_lead.species.base_xp_yield,
                their_lead.level, is_wild=False,
            )
            my_lead.xp = xp_result.new_total_xp
            if xp_result.levels_gained > 0:
                my_lead.level = xp_result.new_level
                self._recalculate_stats(my_lead)
            self.state.stats.total_xp_earned += xp_result.xp_gained
            money_transfer = min(their_lead.level * 30, opponent_agent.state.money)
            self.state.money += money_transfer
            opponent_agent.state.money -= money_transfer
        else:
            self.state.stats.battles_lost += 1
            opponent_agent.state.stats.battles_won += 1

        self.state.last_action = "battle"
        self.state.last_action_result = f"{'Won' if result.attacker_won else 'Lost'} vs {opponent_agent.state.name}"
        self._log_event("trainer_battle", result.to_dict())

        return {"result": "battle", "battle": result.to_dict()}

    def heal(self) -> dict:
        """Use items to heal the team."""
        healed: list[dict] = []

        # First revive fainted monsters
        for monster in self.state.team:
            if monster.is_fainted and self.state.inventory.revives > 0:
                self.state.inventory.revives -= 1
                monster.current_hp = monster.max_hp // 2
                healed.append({"uid": monster.uid, "action": "revive", "hp": monster.current_hp})
                self.state.stats.total_healing_used += 1

        # Then heal damaged monsters
        for monster in self.state.team:
            if monster.is_fainted:
                continue
            while monster.current_hp < monster.max_hp:
                item = self.state.inventory.best_healing_item()
                if not item:
                    break
                heal_amount = self.state.inventory.heal_amount(item)
                self.state.inventory.use_healing(item)
                actual = monster.heal(heal_amount)
                if item == "full_restore":
                    monster.status = None
                healed.append({"uid": monster.uid, "action": item, "healed": actual, "hp": monster.current_hp})
                self.state.stats.total_healing_used += 1
                if actual == 0:
                    break

        self.state.last_action = "heal"
        self.state.last_action_result = f"Healed {len(healed)} actions"
        self._log_event("heal", {"actions": healed})

        return {"result": "healed", "actions": healed, "team_hp_pct": self.state.team_hp_percentage}

    def heal_center(self) -> dict:
        """Full heal at a center (free but uses a turn)."""
        for monster in self.state.team:
            monster.full_heal()

        self.state.last_action = "heal_center"
        self.state.last_action_result = "Full team heal at center"
        self._log_event("heal_center", {})

        return {"result": "healed_at_center", "team_hp_pct": 100.0}

    def gym_challenge(self, gym_id: str) -> dict:
        """Challenge a gym leader."""
        if gym_id not in GYM_DATA:
            return {"error": f"Unknown gym: {gym_id}"}

        if self.state.has_badge(gym_id):
            return {"error": f"Already have badge from {gym_id}"}

        gym = GYM_DATA[gym_id]
        leader_type: MonsterType = gym["type"]
        leader_level: int = gym["leader_level"]
        team_size: int = gym["team_size"]

        # Generate gym leader's team
        type_to_species = {
            MonsterType.ROCK: "rockpup",
            MonsterType.WATER: "tidalin",
            MonsterType.ELECTRIC: "zappik",
            MonsterType.GRASS: "sproutix",
            MonsterType.FIRE: "flamelet",
            MonsterType.GHOST: "phantling",
        }
        gym_species = type_to_species.get(leader_type, "rockpup")

        gym_team: list[Monster] = []
        for i in range(team_size):
            lvl = leader_level - (team_size - 1 - i) * 2
            uid = f"gym_{uuid.uuid4().hex[:6]}"
            gym_mon = create_monster(gym_species, max(lvl, 5), uid, self.rng.fork(f"gym_{gym_id}_{i}"))
            gym_team.append(gym_mon)

        self.state.stats.gyms_challenged += 1

        # Battle each gym monster sequentially
        wins = 0
        total_xp = 0
        battle_logs: list[dict] = []

        for gym_mon in gym_team:
            lead = self.state.lead_monster
            if not lead:
                # Try switching
                for i, m in enumerate(self.state.team):
                    if not m.is_fainted:
                        lead = m
                        break
                if not lead:
                    break

            result = self.battle_engine.resolve_battle(
                attacker=lead,
                defender=gym_mon,
                attacker_id=self.state.agent_id,
                defender_id=gym_id,
                battle_type="gym",
                attacker_strategy=self.strategy,
            )

            if result.attacker_won:
                wins += 1
                xp_result = calculate_xp_gain(
                    lead.xp, lead.level,
                    gym_mon.species.base_xp_yield,
                    gym_mon.level, is_wild=False,
                )
                lead.xp = xp_result.new_total_xp
                if xp_result.levels_gained > 0:
                    lead.level = xp_result.new_level
                    self._recalculate_stats(lead)
                total_xp += xp_result.xp_gained
            battle_logs.append(result.to_dict())

        gym_beaten = wins == team_size

        if gym_beaten:
            badge = GymBadge(
                gym_id=gym_id,
                gym_name=gym["name"],
                badge_name=gym["badge"],
                gym_type=leader_type.value,
                earned_at_tick=self.state.current_tick,
            )
            self.state.badges.append(badge)
            self.state.stats.gyms_beaten += 1
            self.state.stats.battles_won += wins
            self.state.money += leader_level * 50
            self.state.last_action = "gym_challenge"
            self.state.last_action_result = f"Beat {gym['name']}! Earned {gym['badge']}"
        else:
            self.state.stats.battles_lost += (team_size - wins)
            self.state.stats.battles_won += wins
            self.state.last_action = "gym_challenge"
            self.state.last_action_result = f"Lost to {gym['name']} ({wins}/{team_size})"

        self._log_event("gym_challenge", {"gym_id": gym_id, "won": gym_beaten, "wins": wins, "xp": total_xp})

        return {
            "result": "gym_won" if gym_beaten else "gym_lost",
            "gym_id": gym_id,
            "gym_name": gym["name"],
            "badge": gym["badge"] if gym_beaten else None,
            "battles_won": wins,
            "battles_total": team_size,
            "xp_gained": total_xp,
            "battle_logs": battle_logs,
        }

    def move(self, target_zone: str) -> dict:
        """Move to an adjacent zone."""
        current = self.state.position.zone
        adjacent = ZONE_CONNECTIONS.get(current, [])

        if target_zone not in adjacent:
            return {"error": f"Cannot move from {current} to {target_zone}. Adjacent: {adjacent}"}

        old_zone = current
        self.state.position.zone = target_zone
        self.state.position.x = 0
        self.state.position.y = 0
        self.state.stats.total_distance += 1

        self.state.last_action = "move"
        self.state.last_action_result = f"Moved from {old_zone} to {target_zone}"
        self._log_event("move", {"from": old_zone, "to": target_zone})

        return {"result": "moved", "from": old_zone, "to": target_zone}

    def auto_tick(self) -> dict:
        """Execute one autonomous tick using the strategy."""
        self.state.current_tick += 1

        decision = self.strategy.decide_action(self.state)
        action = decision.action
        result: dict = {}

        if action == Action.HUNT:
            result = self.hunt()
        elif action == Action.HEAL:
            result = self.heal()
        elif action == Action.HEAL_CENTER:
            result = self.heal_center()
        elif action == Action.GYM_CHALLENGE:
            gym_id = decision.target
            if gym_id:
                result = self.gym_challenge(gym_id)
            else:
                result = {"result": "no_gym_target"}
        elif action == Action.MOVE:
            target = decision.target
            if target:
                result = self.move(target)
            else:
                adjacent = ZONE_CONNECTIONS.get(self.state.position.zone, [])
                if adjacent:
                    target = self.rng.choice(adjacent)
                    result = self.move(target)
                else:
                    result = {"result": "no_movement_options"}
        elif action == Action.SHOP:
            result = self._shop()
        elif action == Action.SWAP_LEAD:
            result = self._swap_lead()
        elif action == Action.USE_ITEM:
            result = self._use_item(decision)
        else:
            result = {"result": "idle", "reason": decision.reason}

        return {
            "tick": self.state.current_tick,
            "decision": {
                "action": action.value,
                "reason": decision.reason,
                "priority": decision.priority,
            },
            "result": result,
            "state_summary": {
                "team_hp_pct": round(self.state.team_hp_percentage, 1),
                "avg_level": round(self.state.average_team_level, 1),
                "badges": self.state.badge_count,
                "zone": self.state.position.zone,
                "money": self.state.money,
            },
        }

    def _shop(self) -> dict:
        """Buy supplies at a shop."""
        bought: list[str] = []
        if self.state.money >= 200 and self.state.inventory.pokeballs < 10:
            count = min(5, (self.state.money - 100) // 200)
            count = max(1, count)
            self.state.inventory.pokeballs += count
            self.state.money -= count * 200
            bought.append(f"{count}x Pokeball")
        if self.state.money >= 300 and self.state.inventory.potions < 5:
            count = min(3, self.state.money // 300)
            count = max(1, count)
            self.state.inventory.potions += count
            self.state.money -= count * 300
            bought.append(f"{count}x Potion")
        if self.state.money >= 700 and self.state.inventory.revives < 2:
            self.state.inventory.revives += 1
            self.state.money -= 700
            bought.append("1x Revive")

        self.state.last_action = "shop"
        self.state.last_action_result = f"Bought: {', '.join(bought) if bought else 'nothing'}"
        return {"result": "shopped", "bought": bought, "money_remaining": self.state.money}

    def _swap_lead(self) -> dict:
        """Swap the lead monster to the healthiest one."""
        best_idx = 0
        best_hp = -1.0
        for i, m in enumerate(self.state.team):
            if not m.is_fainted and m.hp_percentage > best_hp:
                best_hp = m.hp_percentage
                best_idx = i
        if best_idx != 0:
            self.state.team[0], self.state.team[best_idx] = self.state.team[best_idx], self.state.team[0]
        return {"result": "swapped", "new_lead": self.state.team[0].display_name if self.state.team else "none"}

    def _use_item(self, decision: ActionDecision) -> dict:
        """Use an item from decision data."""
        if not decision.data:
            return {"result": "no_item_data"}
        item = decision.data.get("item", "")
        target_uid = decision.target
        if item == "revive" and target_uid:
            for m in self.state.team:
                if m.uid == target_uid and m.is_fainted and self.state.inventory.revives > 0:
                    self.state.inventory.revives -= 1
                    m.current_hp = m.max_hp // 2
                    return {"result": "used_revive", "target": m.display_name, "hp": m.current_hp}
        return {"result": "item_not_used"}

    def _recalculate_stats(self, monster: Monster) -> None:
        """Recalculate stats after level up."""
        from .utils.xp_calculator import calculate_stat_at_level
        s = monster.species.base_stats
        iv = monster.ivs
        ev = monster.evs
        lv = monster.level
        monster.max_hp = calculate_stat_at_level(s.hp, iv.hp, ev.hp, lv, is_hp=True)
        monster.current_hp = min(monster.current_hp + 5, monster.max_hp)  # small heal on level up
        monster.attack = calculate_stat_at_level(s.attack, iv.attack, ev.attack, lv)
        monster.defense = calculate_stat_at_level(s.defense, iv.defense, ev.defense, lv)
        monster.sp_attack = calculate_stat_at_level(s.sp_attack, iv.sp_attack, ev.sp_attack, lv)
        monster.sp_defense = calculate_stat_at_level(s.sp_defense, iv.sp_defense, ev.sp_defense, lv)
        monster.speed = calculate_stat_at_level(s.speed, iv.speed, ev.speed, lv)

    def _log_event(self, event_type: str, data: dict) -> None:
        """Append to event history."""
        self.history.append({
            "tick": self.state.current_tick,
            "type": event_type,
            "agent_id": self.state.agent_id,
            "data": data,
        })

    def get_status(self) -> dict:
        """Get full agent status."""
        return self.state.to_dict()


def main() -> None:
    """Quick demo run."""
    from rich.console import Console
    from rich.table import Table

    console = Console()
    console.print("[bold green]PXMON Agent Demo[/bold green]")

    agent = PxmonAgent("agent_001", "TestBot", "balanced", seed=12345)
    reg = agent.register("flamelet")
    console.print(f"Registered: {reg['starter']['species_id']}")

    for i in range(20):
        tick_result = agent.auto_tick()
        decision = tick_result["decision"]
        summary = tick_result["state_summary"]
        console.print(
            f"Tick {tick_result['tick']:3d} | "
            f"{decision['action']:15s} | "
            f"HP: {summary['team_hp_pct']:5.1f}% | "
            f"Lvl: {summary['avg_level']:4.1f} | "
            f"Badges: {summary['badges']} | "
            f"{decision['reason']}"
        )

    status = agent.get_status()
    table = Table(title="Final Status")
    table.add_column("Stat")
    table.add_column("Value")
    table.add_row("Team Size", str(len(status["team"])))
    table.add_row("Avg Level", str(status["avg_level"]))
    table.add_row("Badges", str(len(status["badges"])))
    table.add_row("Win Rate", str(status["stats"]["win_rate"]))
    table.add_row("Money", str(status["money"]))
    console.print(table)


if __name__ == "__main__":
    main()