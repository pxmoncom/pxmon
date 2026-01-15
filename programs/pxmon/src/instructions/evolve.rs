use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::MonsterEvolved;

#[derive(Accounts)]
pub struct EvolveMonster<'info> {
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
}

pub fn handler(ctx: Context<EvolveMonster>) -> Result<()> {
    let agent = &ctx.accounts.agent;
    let monster = &mut ctx.accounts.monster;

    // Validate evolution prerequisites
    require!(monster.evolution_id > 0, PxmonError::NoEvolutionAvailable);
    require!(monster.evolution_level > 0, PxmonError::NoEvolutionAvailable);
    require!(monster.level >= monster.evolution_level, PxmonError::EvolutionLevelNotMet);
    require!(
        agent.find_in_team(monster.key()).is_some(),
        PxmonError::MonsterNotInTeam
    );

    let evolved_species = get_species(monster.evolution_id).ok_or(PxmonError::InvalidSpeciesId)?;

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    let from_species = monster.species_id;
    let to_species = evolved_species.species_id;

    // Store old HP ratio for proportional healing
    let hp_ratio_num = monster.current_hp as u32;
    let hp_ratio_den = monster.stats.hp as u32;

    // Update species data
    monster.species_id = evolved_species.species_id;
    monster.primary_type = evolved_species.primary_type;
    monster.secondary_type = evolved_species.secondary_type;
    monster.base_stats = evolved_species.base_stats;
    monster.evolution_id = evolved_species.evolution_id;
    monster.evolution_level = evolved_species.evolution_level;

    // Recalculate stats with new base stats
    monster.recalculate_stats();

    // Restore HP proportionally + small heal bonus for evolving
    let new_hp = if hp_ratio_den > 0 {
        let proportional = (monster.stats.hp as u32 * hp_ratio_num) / hp_ratio_den;
        let bonus = monster.stats.hp as u32 / 10; // 10% bonus HP on evolution
        proportional.saturating_add(bonus).min(monster.stats.hp as u32) as u16
    } else {
        monster.stats.hp
    };
    monster.current_hp = new_hp;
    monster.is_fainted = false;

    // Upgrade moves for evolved form
    let new_moves = get_default_moves(evolved_species.species_id, evolved_species.primary_type, monster.level);
    // Keep existing moves but upgrade if new ones are stronger
    for i in 0..MAX_MOVES {
        if new_moves[i].move_id > 0 {
            if monster.moves[i].move_id == 0 || new_moves[i].power > monster.moves[i].power {
                monster.moves[i] = new_moves[i];
            }
        }
    }
    monster.num_moves = {
        let mut count = 0u8;
        for m in monster.moves.iter() {
            if m.move_id > 0 { count += 1; }
        }
        count
    };

    // Update agent
    let agent = &mut ctx.accounts.agent;
    agent.last_action_ts = timestamp;

    emit!(MonsterEvolved {
        monster: monster.key(),
        owner: ctx.accounts.owner.key(),
        from_species,
        to_species,
        level: monster.level,
        timestamp,
    });

    Ok(())
}