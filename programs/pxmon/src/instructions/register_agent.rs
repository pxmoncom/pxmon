use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::AgentRegistered;

#[derive(Accounts)]
#[instruction(name: String, strategy: u8, starter_species: u16)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = AgentAccount::LEN,
        seeds = [b"agent", owner.key().as_ref()],
        bump,
    )]
    pub agent: Account<'info, AgentAccount>,

    #[account(
        init,
        payer = owner,
        space = MonsterAccount::LEN,
        seeds = [b"monster", agent.key().as_ref(), &[0u8]],
        bump,
    )]
    pub starter_monster: Account<'info, MonsterAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    name: String,
    strategy: u8,
    starter_species: u16,
) -> Result<()> {
    require!(name.len() >= 1, PxmonError::AgentNameEmpty);
    require!(name.len() <= MAX_NAME_LEN, PxmonError::AgentNameTooLong);
    require!(strategy <= 4, PxmonError::InvalidStrategy);

    // Validate starter species (must be one of the three starters)
    require!(
        starter_species == 1 || starter_species == 4 || starter_species == 7,
        PxmonError::InvalidSpeciesId
    );

    let species = get_species(starter_species).ok_or(PxmonError::InvalidSpeciesId)?;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let slot = clock.slot;

    // Initialize agent account
    let agent = &mut ctx.accounts.agent;
    agent.owner = ctx.accounts.owner.key();
    agent.bump = ctx.bumps.agent;
    agent.created_at = timestamp;
    agent.last_action_ts = timestamp;
    agent.strategy = strategy;
    agent.agent_level = 1;
    agent.location = 0;
    agent.badges = 0;
    agent.wins = 0;
    agent.losses = 0;
    agent.catches = 0;
    agent.total_exp = 0;
    agent.gyms_cleared = 0;
    agent.trades = 0;
    agent.team_size = 0;
    agent._reserved = [0u8; 64];

    // Copy name
    let name_bytes = name.as_bytes();
    let len = name_bytes.len().min(MAX_NAME_LEN);
    agent.name[..len].copy_from_slice(&name_bytes[..len]);
    agent.name_len = len as u8;

    // Initialize starter monster
    let monster = &mut ctx.accounts.starter_monster;
    let mut rng = Rng::from_chain(slot, timestamp, ctx.accounts.owner.key().as_ref());

    monster.owner = agent.key();
    monster.species_id = species.species_id;
    monster.level = 5;
    monster.experience = 0;
    monster.exp_to_next = MonsterAccount::calc_exp_to_next(5);
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
    monster.bump = ctx.bumps.starter_monster;
    monster._reserved = [0u8; 32];

    // Generate random IVs (0-31 each)
    monster.ivs = IVs {
        hp: (rng.next_u8() % 32),
        atk: (rng.next_u8() % 32),
        def: (rng.next_u8() % 32),
        spd: (rng.next_u8() % 32),
        sp_atk: (rng.next_u8() % 32),
        sp_def: (rng.next_u8() % 32),
    };

    // Calculate initial stats
    monster.recalculate_stats();
    monster.current_hp = monster.stats.hp;

    // Set default moves
    monster.moves = get_default_moves(species.species_id, species.primary_type, 5);
    monster.num_moves = if monster.level >= 15 { 3 } else { 2 };

    // No nickname by default
    monster.nickname = [0u8; MAX_NAME_LEN];
    monster.nickname_len = 0;

    // Add starter to team
    agent.add_to_team(ctx.accounts.starter_monster.key());
    agent.catches = 1;

    emit!(AgentRegistered {
        agent: agent.key(),
        owner: ctx.accounts.owner.key(),
        name,
        timestamp,
    });

    Ok(())
}