use anchor_lang::prelude::*;

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct BattleCompleted {
    pub agent: Pubkey,
    pub agent_monster: Pubkey,
    pub wild_species: u16,
    pub wild_level: u8,
    pub agent_won: bool,
    pub exp_gained: u32,
    pub timestamp: i64,
}

#[event]
pub struct MonsterCaught {
    pub agent: Pubkey,
    pub monster: Pubkey,
    pub species_id: u16,
    pub level: u8,
    pub catch_roll: u16,
    pub timestamp: i64,
}

#[event]
pub struct MonsterEvolved {
    pub monster: Pubkey,
    pub owner: Pubkey,
    pub from_species: u16,
    pub to_species: u16,
    pub level: u8,
    pub timestamp: i64,
}

#[event]
pub struct GymChallengeCompleted {
    pub agent: Pubkey,
    pub gym_id: u8,
    pub won: bool,
    pub badge_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct TradeCompleted {
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub monster_a: Pubkey,
    pub monster_b: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct LevelUp {
    pub monster: Pubkey,
    pub owner: Pubkey,
    pub new_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct LeaderboardUpdated {
    pub agent: Pubkey,
    pub score: u64,
    pub rank: u16,
    pub timestamp: i64,
}