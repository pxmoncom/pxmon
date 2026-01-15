use anchor_lang::prelude::*;

#[error_code]
pub enum PxmonError {
    #[msg("Agent name exceeds maximum length of 16 characters")]
    AgentNameTooLong,

    #[msg("Agent name must be at least 1 character")]
    AgentNameEmpty,

    #[msg("Agent team is full, cannot add more monsters")]
    TeamFull,

    #[msg("Monster not found in agent team")]
    MonsterNotInTeam,

    #[msg("Monster level is too low for this action")]
    LevelTooLow,

    #[msg("Monster has fainted and cannot battle")]
    MonsterFainted,

    #[msg("Not enough experience to level up")]
    InsufficientExperience,

    #[msg("Monster cannot evolve at this level")]
    CannotEvolve,

    #[msg("Evolution level requirement not met")]
    EvolutionLevelNotMet,

    #[msg("Monster species does not have an evolution")]
    NoEvolutionAvailable,

    #[msg("Invalid monster species ID")]
    InvalidSpeciesId,

    #[msg("Catch attempt failed")]
    CatchFailed,

    #[msg("Battle already resolved")]
    BattleAlreadyResolved,

    #[msg("Invalid move index")]
    InvalidMoveIndex,

    #[msg("Not enough badges for this gym")]
    InsufficientBadges,

    #[msg("Gym already defeated")]
    GymAlreadyDefeated,

    #[msg("Invalid gym ID")]
    InvalidGymId,

    #[msg("Trade partner mismatch")]
    TradePartnerMismatch,

    #[msg("Cannot trade with yourself")]
    CannotTradeWithSelf,

    #[msg("Monster does not belong to this agent")]
    MonsterOwnerMismatch,

    #[msg("Invalid type ID")]
    InvalidTypeId,

    #[msg("Strategy value out of range")]
    InvalidStrategy,

    #[msg("Location value out of range")]
    InvalidLocation,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Agent is not initialized")]
    AgentNotInitialized,

    #[msg("Agent is already initialized")]
    AgentAlreadyInitialized,

    #[msg("Cooldown period has not elapsed")]
    CooldownActive,

    #[msg("Insufficient funds for this action")]
    InsufficientFunds,

    #[msg("Monster HP is already full")]
    AlreadyFullHp,

    #[msg("Invalid battle parameters")]
    InvalidBattleParams,

    #[msg("Leaderboard is full")]
    LeaderboardFull,

    #[msg("No active monsters in team")]
    NoActiveMonsters,
}