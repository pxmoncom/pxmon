use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::{BattleCompleted, LevelUp};

#[derive(Accounts)]
#[instruction(wild_species: u16, wild_level: u8)]
pub struct PveBattle<'info> {
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
            b"battle",
            agent.key().as_ref(),
            &agent.wins.saturating_add(agent.losses).to_le_bytes(),
        ],
        bump,
    )]
    pub battle_record: Account<'info, BattleRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PveBattle>,
    wild_species: u16,
    wild_level: u8,
) -> Result<()> {
    let wild_data = get_species(wild_species).ok_or(PxmonError::InvalidSpeciesId)?;
    require!(wild_level >= 1 && wild_level <= MAX_LEVEL, PxmonError::InvalidBattleParams);

    let monster = &mut ctx.accounts.monster;
    require!(!monster.is_fainted, PxmonError::MonsterFainted);
    require!(monster.current_hp > 0, PxmonError::MonsterFainted);

    // Verify monster is in agent's team
    let agent = &ctx.accounts.agent;
    require!(
        agent.find_in_team(monster.key()).is_some(),
        PxmonError::MonsterNotInTeam
    );

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let slot = clock.slot;

    // Build RNG from on-chain entropy
    let seed_material = [
        slot.to_le_bytes().as_ref(),
        timestamp.to_le_bytes().as_ref(),
        monster.key().as_ref(),
        &[wild_level, wild_species as u8],
    ]
    .concat();
    let mut rng = Rng::from_chain(slot, timestamp, &seed_material);

    // Generate wild monster stats
    let wild_ivs = IVs {
        hp: rng.next_u8() % 32,
        atk: rng.next_u8() % 32,
        def: rng.next_u8() % 32,
        spd: rng.next_u8() % 32,
        sp_atk: rng.next_u8() % 32,
        sp_def: rng.next_u8() % 32,
    };

    let wild_hp = MonsterAccount::calc_stat(wild_data.base_stats.hp, wild_ivs.hp, wild_level, true);
    let wild_atk = MonsterAccount::calc_stat(wild_data.base_stats.atk, wild_ivs.atk, wild_level, false);
    let wild_def = MonsterAccount::calc_stat(wild_data.base_stats.def, wild_ivs.def, wild_level, false);
    let wild_spd = MonsterAccount::calc_stat(wild_data.base_stats.spd, wild_ivs.spd, wild_level, false);
    let wild_sp_atk = MonsterAccount::calc_stat(wild_data.base_stats.sp_atk, wild_ivs.sp_atk, wild_level, false);
    let _wild_sp_def = MonsterAccount::calc_stat(wild_data.base_stats.sp_def, wild_ivs.sp_def, wild_level, false);

    let wild_moves = get_default_moves(wild_species, wild_data.primary_type, wild_level);

    let mut player_hp = monster.current_hp as i32;
    let mut enemy_hp = wild_hp as i32;
    let mut total_damage_dealt: u32 = 0;
    let mut total_damage_taken: u32 = 0;
    let mut turns: u8 = 0;
    let max_turns: u8 = 30;

    // Battle simulation loop
    while player_hp > 0 && enemy_hp > 0 && turns < max_turns {
        turns += 1;

        // Determine turn order by speed
        let player_goes_first = if monster.stats.spd == wild_spd {
            rng.chance(50)
        } else {
            monster.stats.spd > wild_spd
        };

        if player_goes_first {
            // Player attacks
            let move_idx = select_best_move(
                &monster.moves,
                monster.num_moves,
                monster.primary_type,
                wild_data.primary_type,
                wild_data.secondary_type,
                ctx.accounts.agent.strategy,
            );
            let player_move = &monster.moves[move_idx];

            let atk_stat = if player_move.category == 1 { monster.stats.sp_atk } else { monster.stats.atk };
            let def_stat = if player_move.category == 1 { _wild_sp_def } else { wild_def };

            // Accuracy check
            if rng.next_range(100) < player_move.accuracy as u32 {
                let dmg = calculate_damage(
                    monster.level,
                    atk_stat,
                    def_stat,
                    player_move.power,
                    player_move.move_type,
                    monster.primary_type,
                    wild_data.primary_type,
                    wild_data.secondary_type,
                    &mut rng,
                );
                enemy_hp -= dmg as i32;
                total_damage_dealt += dmg;
            }

            if enemy_hp <= 0 {
                break;
            }

            // Wild monster attacks
            let wild_move_idx = rng.next_range(count_valid_moves(&wild_moves)) as usize;
            let wild_move = &wild_moves[wild_move_idx];

            let w_atk = if wild_move.category == 1 { wild_sp_atk } else { wild_atk };
            let w_def = if wild_move.category == 1 { monster.stats.sp_def } else { monster.stats.def };

            if rng.next_range(100) < wild_move.accuracy as u32 {
                let dmg = calculate_damage(
                    wild_level,
                    w_atk,
                    w_def,
                    wild_move.power,
                    wild_move.move_type,
                    wild_data.primary_type,
                    monster.primary_type,
                    monster.secondary_type,
                    &mut rng,
                );
                player_hp -= dmg as i32;
                total_damage_taken += dmg;
            }
        } else {
            // Wild monster goes first
            let wild_move_idx = rng.next_range(count_valid_moves(&wild_moves)) as usize;
            let wild_move = &wild_moves[wild_move_idx];

            let w_atk = if wild_move.category == 1 { wild_sp_atk } else { wild_atk };
            let w_def = if wild_move.category == 1 { monster.stats.sp_def } else { monster.stats.def };

            if rng.next_range(100) < wild_move.accuracy as u32 {
                let dmg = calculate_damage(
                    wild_level,
                    w_atk,
                    w_def,
                    wild_move.power,
                    wild_move.move_type,
                    wild_data.primary_type,
                    monster.primary_type,
                    monster.secondary_type,
                    &mut rng,
                );
                player_hp -= dmg as i32;
                total_damage_taken += dmg;
            }

            if player_hp <= 0 {
                break;
            }

            // Player attacks
            let move_idx = select_best_move(
                &monster.moves,
                monster.num_moves,
                monster.primary_type,
                wild_data.primary_type,
                wild_data.secondary_type,
                ctx.accounts.agent.strategy,
            );
            let player_move = &monster.moves[move_idx];

            let atk_stat = if player_move.category == 1 { monster.stats.sp_atk } else { monster.stats.atk };
            let def_stat = if player_move.category == 1 { _wild_sp_def } else { wild_def };

            if rng.next_range(100) < player_move.accuracy as u32 {
                let dmg = calculate_damage(
                    monster.level,
                    atk_stat,
                    def_stat,
                    player_move.power,
                    player_move.move_type,
                    monster.primary_type,
                    wild_data.primary_type,
                    wild_data.secondary_type,
                    &mut rng,
                );
                enemy_hp -= dmg as i32;
                total_damage_dealt += dmg;
            }
        }
    }

    let agent_won = enemy_hp <= 0 && player_hp > 0;

    // Update monster state
    let monster = &mut ctx.accounts.monster;
    monster.current_hp = if player_hp > 0 { player_hp as u16 } else { 0 };
    monster.is_fainted = player_hp <= 0;
    monster.battles_fought += 1;

    // Calculate experience
    let mut exp_gained: u32 = 0;
    if agent_won {
        monster.battles_won += 1;
        // EXP formula: base * wild_level * (wild_level / player_level + 1) / 2
        let level_ratio = (wild_level as u32 * 100) / (monster.level as u32).max(1);
        exp_gained = BASE_EXP
            .saturating_mul(wild_level as u32)
            .saturating_mul(level_ratio + 100)
            / 200;
        exp_gained = exp_gained.max(10);

        let leveled = monster.gain_exp(exp_gained);
        if leveled {
            emit!(LevelUp {
                monster: monster.key(),
                owner: ctx.accounts.owner.key(),
                new_level: monster.level,
                timestamp,
            });
        }
    }

    // Update agent
    let agent = &mut ctx.accounts.agent;
    if agent_won {
        agent.wins += 1;
    } else {
        agent.losses += 1;
    }
    agent.total_exp = agent.total_exp.saturating_add(exp_gained as u64);
    agent.last_action_ts = timestamp;

    // Recalculate agent level (every 1000 total exp = 1 level, max 50)
    agent.agent_level = ((agent.total_exp / 1000) as u8).min(50).max(1);

    // Write battle record
    let record = &mut ctx.accounts.battle_record;
    record.agent = agent.key();
    record.agent_monster = monster.key();
    record.opponent_species = wild_species;
    record.opponent_level = wild_level;
    record.agent_won = agent_won;
    record.damage_dealt = total_damage_dealt;
    record.damage_taken = total_damage_taken;
    record.exp_gained = exp_gained;
    record.turns = turns;
    record.rng_seed = slot ^ (timestamp as u64);
    record.timestamp = timestamp;
    record.bump = ctx.bumps.battle_record;

    emit!(BattleCompleted {
        agent: agent.key(),
        agent_monster: monster.key(),
        wild_species,
        wild_level,
        agent_won,
        exp_gained,
        timestamp,
    });

    Ok(())
}

/// Count valid (non-zero power or non-zero move_id) moves
fn count_valid_moves(moves: &[Move; MAX_MOVES]) -> u32 {
    let mut count = 0u32;
    for m in moves.iter() {
        if m.move_id > 0 {
            count += 1;
        }
    }
    count.max(1)
}

/// Select the best move based on agent strategy and type matchups
fn select_best_move(
    moves: &[Move; MAX_MOVES],
    num_moves: u8,
    attacker_type: u8,
    defender_primary: u8,
    defender_secondary: u8,
    strategy: u8,
) -> usize {
    let n = (num_moves as usize).min(MAX_MOVES).max(1);

    match AgentStrategy::from_u8(strategy) {
        Some(AgentStrategy::Aggressive) => {
            // Pick highest raw power move
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
        Some(AgentStrategy::TypeExploit) => {
            // Pick move with best type effectiveness
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
                // STAB bonus
                let stab = if moves[i].move_type == attacker_type { 3u32 } else { 2u32 };
                let eff = (moves[i].power as u32) * (e1n as u32) * (e2n as u32) * stab
                    / ((e1d as u32) * (e2d as u32) * 2);
                if eff > best_eff {
                    best_eff = eff;
                    best_idx = i;
                }
            }
            best_idx
        }
        Some(AgentStrategy::Defensive) => {
            // Pick lowest power move that is still effective (conserve PP on big moves)
            let mut best_idx = 0;
            let mut lowest_power: u8 = 255;
            for i in 0..n {
                if moves[i].move_id == 0 || moves[i].pp == 0 || moves[i].power == 0 {
                    continue;
                }
                let (e1n, _) = type_effectiveness(moves[i].move_type, defender_primary);
                if e1n > 0 && moves[i].power < lowest_power {
                    lowest_power = moves[i].power;
                    best_idx = i;
                }
            }
            best_idx
        }
        Some(AgentStrategy::SpeedRush) => {
            // Pick highest accuracy move with decent power
            let mut best_idx = 0;
            let mut best_score: u32 = 0;
            for i in 0..n {
                if moves[i].move_id == 0 || moves[i].pp == 0 {
                    continue;
                }
                let score = (moves[i].accuracy as u32) * 3 + (moves[i].power as u32);
                if score > best_score {
                    best_score = score;
                    best_idx = i;
                }
            }
            best_idx
        }
        _ => {
            // Balanced: pick best effective power considering accuracy
            let mut best_idx = 0;
            let mut best_score: u32 = 0;
            for i in 0..n {
                if moves[i].move_id == 0 || moves[i].pp == 0 {
                    continue;
                }
                let (e1n, e1d) = type_effectiveness(moves[i].move_type, defender_primary);
                let stab = if moves[i].move_type == attacker_type { 3u32 } else { 2u32 };
                let eff_power = (moves[i].power as u32) * (e1n as u32) * stab * (moves[i].accuracy as u32)
                    / ((e1d as u32) * 2 * 100);
                if eff_power > best_score {
                    best_score = eff_power;
                    best_idx = i;
                }
            }
            best_idx
        }
    }
}