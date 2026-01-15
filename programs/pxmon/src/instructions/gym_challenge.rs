use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::{GymChallengeCompleted, LevelUp};

#[derive(Accounts)]
#[instruction(gym_id: u8)]
pub struct GymChallenge<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner,
    )]
    pub agent: Account<'info, AgentAccount>,

    #[account(
        mut,
        constraint = monster.owner == agent.key() @ PxmonError::MonsterOwnerMismatch,
    )]
    pub monster: Account<'info, MonsterAccount>,

    #[account(
        init,
        payer = owner,
        space = BattleRecord::LEN,
        seeds = [
            b"gym_battle",
            agent.key().as_ref(),
            &[gym_id],
        ],
        bump,
    )]
    pub battle_record: Account<'info, BattleRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<GymChallenge>, gym_id: u8) -> Result<()> {
    let gym = get_gym_leader(gym_id).ok_or(PxmonError::InvalidGymId)?;
    let agent = &ctx.accounts.agent;

    // Check prerequisites
    require!(!agent.has_badge(gym_id), PxmonError::GymAlreadyDefeated);
    require!(agent.badge_count() >= gym.badge_required, PxmonError::InsufficientBadges);

    let monster = &ctx.accounts.monster;
    require!(!monster.is_fainted, PxmonError::MonsterFainted);
    require!(monster.current_hp > 0, PxmonError::MonsterFainted);
    require!(
        agent.find_in_team(monster.key()).is_some(),
        PxmonError::MonsterNotInTeam
    );

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let slot = clock.slot;

    let gym_species = get_species(gym.monster_species).ok_or(PxmonError::InvalidSpeciesId)?;

    // Build RNG
    let entropy = [
        slot.to_le_bytes().as_ref(),
        timestamp.to_le_bytes().as_ref(),
        ctx.accounts.owner.key().as_ref(),
        &[gym_id],
    ]
    .concat();
    let mut rng = Rng::from_chain(slot, timestamp, &entropy);

    // Gym leader monster stats (fixed IVs of 20 for gym leaders)
    let gym_ivs = IVs {
        hp: 20,
        atk: 20,
        def: 20,
        spd: 20,
        sp_atk: 20,
        sp_def: 20,
    };

    let gym_hp = MonsterAccount::calc_stat(gym_species.base_stats.hp, gym_ivs.hp, gym.monster_level, true);
    let gym_atk = MonsterAccount::calc_stat(gym_species.base_stats.atk, gym_ivs.atk, gym.monster_level, false);
    let gym_def = MonsterAccount::calc_stat(gym_species.base_stats.def, gym_ivs.def, gym.monster_level, false);
    let gym_spd = MonsterAccount::calc_stat(gym_species.base_stats.spd, gym_ivs.spd, gym.monster_level, false);
    let gym_sp_atk = MonsterAccount::calc_stat(gym_species.base_stats.sp_atk, gym_ivs.sp_atk, gym.monster_level, false);
    let gym_sp_def = MonsterAccount::calc_stat(gym_species.base_stats.sp_def, gym_ivs.sp_def, gym.monster_level, false);

    let gym_moves = get_default_moves(gym.monster_species, gym_species.primary_type, gym.monster_level);

    let mut player_hp = monster.current_hp as i32;
    let mut enemy_hp = gym_hp as i32;
    let mut total_damage_dealt: u32 = 0;
    let mut total_damage_taken: u32 = 0;
    let mut turns: u8 = 0;
    let max_turns: u8 = 40;

    // Gym battle simulation
    while player_hp > 0 && enemy_hp > 0 && turns < max_turns {
        turns += 1;

        let player_faster = if monster.stats.spd == gym_spd {
            rng.chance(50)
        } else {
            monster.stats.spd > gym_spd
        };

        // First attacker
        let (first_is_player, second_is_player) = if player_faster {
            (true, false)
        } else {
            (false, true)
        };

        for pass in 0..2 {
            let is_player = if pass == 0 { first_is_player } else { second_is_player };

            if is_player {
                if player_hp <= 0 { break; }

                let move_idx = select_gym_move(
                    &monster.moves,
                    monster.num_moves,
                    monster.primary_type,
                    gym_species.primary_type,
                    gym_species.secondary_type,
                    ctx.accounts.agent.strategy,
                );
                let player_move = &monster.moves[move_idx];
                let atk_stat = if player_move.category == 1 { monster.stats.sp_atk } else { monster.stats.atk };
                let def_stat = if player_move.category == 1 { gym_sp_def } else { gym_def };

                if rng.next_range(100) < player_move.accuracy as u32 {
                    let dmg = calculate_damage(
                        monster.level,
                        atk_stat,
                        def_stat,
                        player_move.power,
                        player_move.move_type,
                        monster.primary_type,
                        gym_species.primary_type,
                        gym_species.secondary_type,
                        &mut rng,
                    );
                    enemy_hp -= dmg as i32;
                    total_damage_dealt += dmg;
                }
            } else {
                if enemy_hp <= 0 { break; }

                let gym_move_idx = select_gym_leader_move(
                    &gym_moves,
                    gym_species.primary_type,
                    monster.primary_type,
                    monster.secondary_type,
                    &mut rng,
                );
                let gym_move = &gym_moves[gym_move_idx];
                let g_atk = if gym_move.category == 1 { gym_sp_atk } else { gym_atk };
                let g_def = if gym_move.category == 1 { monster.stats.sp_def } else { monster.stats.def };

                if rng.next_range(100) < gym_move.accuracy as u32 {
                    let dmg = calculate_damage(
                        gym.monster_level,
                        g_atk,
                        g_def,
                        gym_move.power,
                        gym_move.move_type,
                        gym_species.primary_type,
                        monster.primary_type,
                        monster.secondary_type,
                        &mut rng,
                    );
                    player_hp -= dmg as i32;
                    total_damage_taken += dmg;
                }
            }
        }
    }

    let agent_won = enemy_hp <= 0 && player_hp > 0;

    // Update monster
    let monster = &mut ctx.accounts.monster;
    monster.current_hp = if player_hp > 0 { player_hp as u16 } else { 0 };
    monster.is_fainted = player_hp <= 0;
    monster.battles_fought += 1;

    // Gym battles give more experience
    let exp_gained: u32 = if agent_won {
        monster.battles_won += 1;
        let base = BASE_EXP
            .saturating_mul(gym.monster_level as u32)
            .saturating_mul(150) / 100;
        // Gym bonus: 1.5x multiplier
        (base * 3) / 2
    } else {
        // Still get some exp for trying
        BASE_EXP.saturating_mul(gym.monster_level as u32) / 4
    };

    let leveled = monster.gain_exp(exp_gained);
    if leveled {
        emit!(LevelUp {
            monster: monster.key(),
            owner: ctx.accounts.owner.key(),
            new_level: monster.level,
            timestamp,
        });
    }

    // Update agent
    let agent = &mut ctx.accounts.agent;
    if agent_won {
        agent.set_badge(gym_id);
        agent.gyms_cleared += 1;
        agent.wins += 1;
        // Heal monster after winning a gym
        monster.full_heal();
    } else {
        agent.losses += 1;
    }
    agent.total_exp = agent.total_exp.saturating_add(exp_gained as u64);
    agent.last_action_ts = timestamp;
    agent.agent_level = ((agent.total_exp / 1000) as u8).min(50).max(1);

    // Write battle record
    let record = &mut ctx.accounts.battle_record;
    record.agent = agent.key();
    record.agent_monster = monster.key();
    record.opponent_species = gym.monster_species;
    record.opponent_level = gym.monster_level;
    record.agent_won = agent_won;
    record.damage_dealt = total_damage_dealt;
    record.damage_taken = total_damage_taken;
    record.exp_gained = exp_gained;
    record.turns = turns;
    record.rng_seed = slot ^ (timestamp as u64);
    record.timestamp = timestamp;
    record.bump = ctx.bumps.battle_record;

    emit!(GymChallengeCompleted {
        agent: agent.key(),
        gym_id,
        won: agent_won,
        badge_count: agent.badge_count(),
        timestamp,
    });

    Ok(())
}

/// Gym leader move selection: prioritize type-effective moves
fn select_gym_leader_move(
    moves: &[Move; MAX_MOVES],
    leader_type: u8,
    target_primary: u8,
    target_secondary: u8,
    rng: &mut Rng,
) -> usize {
    let mut best_idx = 0;
    let mut best_score: u32 = 0;
    let mut valid_count = 0u32;

    for i in 0..MAX_MOVES {
        if moves[i].move_id == 0 {
            continue;
        }
        valid_count += 1;

        let (e1n, e1d) = type_effectiveness(moves[i].move_type, target_primary);
        let (e2n, e2d) = if target_secondary < NUM_TYPES as u8 {
            type_effectiveness(moves[i].move_type, target_secondary)
        } else {
            (1, 1)
        };
        let stab = if moves[i].move_type == leader_type { 3u32 } else { 2u32 };
        let score = (moves[i].power as u32) * (e1n as u32) * (e2n as u32) * stab
            / ((e1d as u32) * (e2d as u32) * 2);

        if score > best_score {
            best_score = score;
            best_idx = i;
        }
    }

    // 80% chance to pick optimal move, 20% random
    if rng.chance(80) || valid_count <= 1 {
        best_idx
    } else {
        let r = rng.next_range(valid_count.max(1)) as usize;
        let mut count = 0;
        for i in 0..MAX_MOVES {
            if moves[i].move_id > 0 {
                if count == r {
                    return i;
                }
                count += 1;
            }
        }
        best_idx
    }
}

/// Player move selection for gym battles (same as PvE but can be extended)
fn select_gym_move(
    moves: &[Move; MAX_MOVES],
    num_moves: u8,
    attacker_type: u8,
    defender_primary: u8,
    defender_secondary: u8,
    strategy: u8,
) -> usize {
    let n = (num_moves as usize).min(MAX_MOVES).max(1);

    // Type exploit is strongly favored in gym battles regardless of strategy
    let use_type_exploit = strategy == AgentStrategy::TypeExploit as u8
        || strategy == AgentStrategy::Balanced as u8;

    if use_type_exploit {
        let mut best_idx = 0;
        let mut best_eff: u32 = 0;
        for i in 0..n {
            if moves[i].move_id == 0 || moves[i].pp == 0 {
                continue;
            }
            let (e1n, e1d) = type_effectiveness(moves[i].move_type, defender_primary);
            let (e2n, e2d) = if defender_secondary < NUM_TYPES as u8 {
                type_effectiveness(moves[i].move_type, defender_secondary)
            } else {
                (1, 1)
            };
            let stab = if moves[i].move_type == attacker_type { 3u32 } else { 2u32 };
            let eff = (moves[i].power as u32) * (e1n as u32) * (e2n as u32) * stab
                * (moves[i].accuracy as u32)
                / ((e1d as u32) * (e2d as u32) * 2 * 100);
            if eff > best_eff {
                best_eff = eff;
                best_idx = i;
            }
        }
        return best_idx;
    }

    // Aggressive: highest power
    let mut best_idx = 0;
    let mut best_power: u8 = 0;
    for i in 0..n {
        if moves[i].move_id > 0 && moves[i].power > best_power && moves[i].pp > 0 {
            best_power = moves[i].power;
            best_idx = i;
        }
    }
    best_idx
}