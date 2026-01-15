use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PXMNa8Jg2yKBfRAqpVoL6kM3xEoDF7HA5g9vRzwU1Dh");

#[program]
pub mod pxmon {
    use super::*;

    /// Register a new agent with a starter monster.
    /// Starter species must be 1 (Fire), 4 (Water), or 7 (Grass).
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        strategy: u8,
        starter_species: u16,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, name, strategy, starter_species)
    }

    /// Initiate a PvE battle against a wild monster.
    pub fn pve_battle(
        ctx: Context<PveBattle>,
        wild_species: u16,
        wild_level: u8,
    ) -> Result<()> {
        instructions::battle::handler(ctx, wild_species, wild_level)
    }

    /// Attempt to catch a wild monster.
    pub fn catch_monster(
        ctx: Context<CatchMonster>,
        species_id: u16,
        monster_index: u8,
    ) -> Result<()> {
        instructions::catch_monster::handler(ctx, species_id, monster_index)
    }

    /// Challenge a gym leader.
    pub fn gym_challenge(
        ctx: Context<GymChallenge>,
        gym_id: u8,
    ) -> Result<()> {
        instructions::gym_challenge::handler(ctx, gym_id)
    }

    /// Evolve a monster that has met its evolution requirements.
    pub fn evolve_monster(ctx: Context<EvolveMonster>) -> Result<()> {
        instructions::evolve::handler(ctx)
    }

    /// Trade monsters between two agents. Both owners must sign.
    pub fn trade_monsters(ctx: Context<TradeMonsters>) -> Result<()> {
        instructions::trade::handler(ctx)
    }
}