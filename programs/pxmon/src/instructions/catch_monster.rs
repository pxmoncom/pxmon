use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::MonsterCaught;

#[derive(Accounts)]
#[instruction(species_id: u16, monster_index: u8)]
pub struct CatchMonster<'info> {
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
        init,
        payer = owner,
        space = MonsterAccount::LEN,
        seeds = [b"monster", agent.key().as_ref(), &[monster_index]],
        bump,
    )]
    pub new_monster: Account<'info, MonsterAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CatchMonster>,
    species_id: u16,
    _monster_index: u8,
) -> Result<()> {
    let agent = &ctx.accounts.agent;
    require!(agent.has_team_space(), PxmonError::TeamFull);

    let species = get_species(species_id).ok_or(PxmonError::InvalidSpeciesId)?;

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let slot = clock.slot;

    // Build RNG
    let entropy = [
        slot.to_le_bytes().as_ref(),
        timestamp.to_le_bytes().as_ref(),
        ctx.accounts.owner.key().as_ref(),
        &species_id.to_le_bytes(),
    ]
    .concat();
    let mut rng = Rng::from_chain(slot, timestamp, &entropy);

    // Catch rate calculation
    // catch_chance = (catch_rate * agent_level_bonus) / 255
    // Agent level gives a small bonus to catch rate
    let agent_bonus = 100u32 + (agent.agent_level as u32 * 2);
    let modified_rate = (species.catch_rate as u32 * agent_bonus) / 100;
    let catch_roll = rng.next_range(256);

    // Three shake checks (like the original games)
    let shake_threshold = modified_rate.min(255);
    let shake1 = rng.next_range(256) < shake_threshold;
    let shake2 = rng.next_range(256) < shake_threshold;
    let shake3 = rng.next_range(256) < shake_threshold;

    let caught = catch_roll < modified_rate && shake1 && shake2 && shake3;
    require!(caught, PxmonError::CatchFailed);

    // Determine wild monster level based on agent level and location
    let base_level = (agent.agent_level as u8).max(3);
    let level_variance = rng.next_range(5) as u8;
    let wild_level = base_level.saturating_sub(2).saturating_add(level_variance).max(2).min(MAX_LEVEL);

    // Initialize the caught monster
    let monster = &mut ctx.accounts.new_monster;
    monster.owner = ctx.accounts.agent.key();
    monster.species_id = species.species_id;
    monster.level = wild_level;
    monster.experience = 0;
    monster.exp_to_next = MonsterAccount::calc_exp_to_next(wild_level);
    monster.primary_type = species.primary_type;
    monster.secondary_type = species.secondary_type;
    monster.base_stats = species.base_stats;
    monster.evolution_id = species.evolution_id;
    monster.evolution_level = species.evolution_level;
    monster.original_trainer = ctx.accounts.owner.key();
    monster.is_traded = false;
    monster.battles_fought = 0;
    monster.battles_won = 0;
    monster.caught_at = timestamp;
    monster.is_fainted = false;
    monster.bump = ctx.bumps.new_monster;
    monster._reserved = [0u8; 32];

    // Random IVs
    monster.ivs = IVs {
        hp: rng.next_u8() % 32,
        atk: rng.next_u8() % 32,
        def: rng.next_u8() % 32,
        spd: rng.next_u8() % 32,
        sp_atk: rng.next_u8() % 32,
        sp_def: rng.next_u8() % 32,
    };

    monster.recalculate_stats();
    monster.current_hp = monster.stats.hp;

    // Set moves based on level
    monster.moves = get_default_moves(species.species_id, species.primary_type, wild_level);
    monster.num_moves = count_known_moves(&monster.moves);

    monster.nickname = [0u8; MAX_NAME_LEN];
    monster.nickname_len = 0;

    // Update agent
    let agent = &mut ctx.accounts.agent;
    agent.add_to_team(ctx.accounts.new_monster.key());
    agent.catches += 1;
    agent.last_action_ts = timestamp;

    emit!(MonsterCaught {
        agent: agent.key(),
        monster: ctx.accounts.new_monster.key(),
        species_id,
        level: wild_level,
        catch_roll: catch_roll as u16,
        timestamp,
    });

    Ok(())
}

fn count_known_moves(moves: &[Move; MAX_MOVES]) -> u8 {
    let mut count = 0u8;
    for m in moves.iter() {
        if m.move_id > 0 {
            count += 1;
        }
    }
    count
}