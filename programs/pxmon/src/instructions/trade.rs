use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PxmonError;
use crate::events::TradeCompleted;

#[derive(Accounts)]
pub struct TradeMonsters<'info> {
    #[account(mut)]
    pub owner_a: Signer<'info>,

    /// CHECK: Validated through agent_b ownership
    pub owner_b: Signer<'info>,

    #[account(
        mut,
        seeds = [b"agent", owner_a.key().as_ref()],
        bump = agent_a.bump,
        constraint = agent_a.owner == owner_a.key() @ PxmonError::MonsterOwnerMismatch,
    )]
    pub agent_a: Account<'info, AgentAccount>,

    #[account(
        mut,
        seeds = [b"agent", owner_b.key().as_ref()],
        bump = agent_b.bump,
        constraint = agent_b.owner == owner_b.key() @ PxmonError::TradePartnerMismatch,
    )]
    pub agent_b: Account<'info, AgentAccount>,

    #[account(
        mut,
        constraint = monster_a.owner == agent_a.key() @ PxmonError::MonsterOwnerMismatch,
    )]
    pub monster_a: Account<'info, MonsterAccount>,

    #[account(
        mut,
        constraint = monster_b.owner == agent_b.key() @ PxmonError::MonsterOwnerMismatch,
    )]
    pub monster_b: Account<'info, MonsterAccount>,
}

pub fn handler(ctx: Context<TradeMonsters>) -> Result<()> {
    // Cannot trade with yourself
    require!(
        ctx.accounts.agent_a.key() != ctx.accounts.agent_b.key(),
        PxmonError::CannotTradeWithSelf
    );

    let agent_a = &ctx.accounts.agent_a;
    let agent_b = &ctx.accounts.agent_b;

    // Verify monsters are in respective teams
    require!(
        agent_a.find_in_team(ctx.accounts.monster_a.key()).is_some(),
        PxmonError::MonsterNotInTeam
    );
    require!(
        agent_b.find_in_team(ctx.accounts.monster_b.key()).is_some(),
        PxmonError::MonsterNotInTeam
    );

    // Ensure both agents still have at least 1 monster after trade
    // (they swap, so count stays the same, but verify they both have the monster)

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // Swap ownership
    let monster_a = &mut ctx.accounts.monster_a;
    let monster_b = &mut ctx.accounts.monster_b;

    // Remove from old teams
    let agent_a = &mut ctx.accounts.agent_a;
    agent_a.remove_from_team(monster_a.key());

    let agent_b = &mut ctx.accounts.agent_b;
    agent_b.remove_from_team(monster_b.key());

    // Swap owners
    monster_a.owner = agent_b.key();
    monster_a.is_traded = true;

    monster_b.owner = agent_a.key();
    monster_b.is_traded = true;

    // Add to new teams
    agent_a.add_to_team(monster_b.key());
    agent_b.add_to_team(monster_a.key());

    // Trade experience bonus: traded monsters gain 1.5x exp
    // This is tracked via the is_traded flag and applied during battles

    // Update trade counters
    agent_a.trades += 1;
    agent_b.trades += 1;
    agent_a.last_action_ts = timestamp;
    agent_b.last_action_ts = timestamp;

    // Traded monsters get a small HP heal
    let heal_a = monster_a.stats.hp / 10;
    monster_a.current_hp = monster_a.current_hp.saturating_add(heal_a).min(monster_a.stats.hp);
    if monster_a.current_hp > 0 {
        monster_a.is_fainted = false;
    }

    let heal_b = monster_b.stats.hp / 10;
    monster_b.current_hp = monster_b.current_hp.saturating_add(heal_b).min(monster_b.stats.hp);
    if monster_b.current_hp > 0 {
        monster_b.is_fainted = false;
    }

    emit!(TradeCompleted {
        agent_a: ctx.accounts.agent_a.key(),
        agent_b: ctx.accounts.agent_b.key(),
        monster_a: monster_a.key(),
        monster_b: monster_b.key(),
        timestamp,
    });

    Ok(())
}