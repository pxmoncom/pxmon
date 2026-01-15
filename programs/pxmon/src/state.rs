use anchor_lang::prelude::*;

/// Maximum number of monsters an agent can carry
pub const MAX_TEAM_SIZE: usize = 4;
/// Maximum number of gyms in the game
pub const MAX_GYMS: usize = 8;
/// Maximum number of moves a monster can know
pub const MAX_MOVES: usize = 4;
/// Maximum agent name length
pub const MAX_NAME_LEN: usize = 16;
/// Maximum leaderboard entries
pub const MAX_LEADERBOARD: usize = 50;
/// Base experience per battle
pub const BASE_EXP: u32 = 40;
/// Experience scaling factor per level
pub const EXP_SCALE: u32 = 15;
/// Maximum level
pub const MAX_LEVEL: u8 = 100;
/// Number of monster types
pub const NUM_TYPES: usize = 17;

/// Monster type enumeration matching classic RPG types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum MonsterType {
    Normal = 0,
    Fire = 1,
    Water = 2,
    Grass = 3,
    Electric = 4,
    Ice = 5,
    Fighting = 6,
    Poison = 7,
    Ground = 8,
    Flying = 9,
    Psychic = 10,
    Bug = 11,
    Rock = 12,
    Ghost = 13,
    Dragon = 14,
    Dark = 15,
    Steel = 16,
}

impl MonsterType {
    pub fn from_u8(val: u8) -> Option<Self> {
        match val {
            0 => Some(MonsterType::Normal),
            1 => Some(MonsterType::Fire),
            2 => Some(MonsterType::Water),
            3 => Some(MonsterType::Grass),
            4 => Some(MonsterType::Electric),
            5 => Some(MonsterType::Ice),
            6 => Some(MonsterType::Fighting),
            7 => Some(MonsterType::Poison),
            8 => Some(MonsterType::Ground),
            9 => Some(MonsterType::Flying),
            10 => Some(MonsterType::Psychic),
            11 => Some(MonsterType::Bug),
            12 => Some(MonsterType::Rock),
            13 => Some(MonsterType::Ghost),
            14 => Some(MonsterType::Dragon),
            15 => Some(MonsterType::Dark),
            16 => Some(MonsterType::Steel),
            _ => None,
        }
    }
}

/// Strategy the agent uses in battle decisions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum AgentStrategy {
    Aggressive = 0,
    Defensive = 1,
    Balanced = 2,
    TypeExploit = 3,
    SpeedRush = 4,
}

impl AgentStrategy {
    pub fn from_u8(val: u8) -> Option<Self> {
        match val {
            0 => Some(AgentStrategy::Aggressive),
            1 => Some(AgentStrategy::Defensive),
            2 => Some(AgentStrategy::Balanced),
            3 => Some(AgentStrategy::TypeExploit),
            4 => Some(AgentStrategy::SpeedRush),
            _ => None,
        }
    }
}

/// Move known by a monster
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct Move {
    /// Move identifier
    pub move_id: u16,
    /// Base power of the move (0 for status moves)
    pub power: u8,
    /// Accuracy out of 100
    pub accuracy: u8,
    /// Type of the move
    pub move_type: u8,
    /// PP remaining
    pub pp: u8,
    /// Max PP
    pub max_pp: u8,
    /// 0 = physical, 1 = special, 2 = status
    pub category: u8,
}

/// Stats block for a monster
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct Stats {
    pub hp: u16,
    pub atk: u16,
    pub def: u16,
    pub spd: u16,
    pub sp_atk: u16,
    pub sp_def: u16,
}

/// Individual values (genetics) for a monster
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct IVs {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spd: u8,
    pub sp_atk: u8,
    pub sp_def: u8,
}

/// Base stats for a species, used in stat calculation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct BaseStats {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spd: u8,
    pub sp_atk: u8,
    pub sp_def: u8,
}

/// On-chain account representing a registered agent
#[account]
pub struct AgentAccount {
    /// Owner wallet pubkey
    pub owner: Pubkey,
    /// Agent display name (max 16 bytes)
    pub name: [u8; MAX_NAME_LEN],
    /// Length of the name
    pub name_len: u8,
    /// Team monster pubkeys (up to 4)
    pub team: [Pubkey; MAX_TEAM_SIZE],
    /// Number of active team members
    pub team_size: u8,
    /// Bitmask of gym badges earned (8 gyms)
    pub badges: u8,
    /// Current location zone ID
    pub location: u8,
    /// Agent strategy for battle decisions
    pub strategy: u8,
    /// Total battles won
    pub wins: u32,
    /// Total battles lost
    pub losses: u32,
    /// Total monsters caught
    pub catches: u32,
    /// Total experience accumulated across all actions
    pub total_exp: u64,
    /// Agent level derived from total_exp
    pub agent_level: u8,
    /// Timestamp of last action (cooldown enforcement)
    pub last_action_ts: i64,
    /// Number of gym challenges completed
    pub gyms_cleared: u8,
    /// Number of trades completed
    pub trades: u32,
    /// Account creation timestamp
    pub created_at: i64,
    /// Bump seed for PDA derivation
    pub bump: u8,
    /// Reserved space for future fields
    pub _reserved: [u8; 64],
}

impl AgentAccount {
    pub const LEN: usize = 8  // discriminator
        + 32  // owner
        + MAX_NAME_LEN // name
        + 1   // name_len
        + 32 * MAX_TEAM_SIZE // team
        + 1   // team_size
        + 1   // badges
        + 1   // location
        + 1   // strategy
        + 4   // wins
        + 4   // losses
        + 4   // catches
        + 8   // total_exp
        + 1   // agent_level
        + 8   // last_action_ts
        + 1   // gyms_cleared
        + 4   // trades
        + 8   // created_at
        + 1   // bump
        + 64; // reserved

    pub fn get_name(&self) -> String {
        let len = self.name_len as usize;
        String::from_utf8_lossy(&self.name[..len]).to_string()
    }

    pub fn has_badge(&self, gym_id: u8) -> bool {
        self.badges & (1 << gym_id) != 0
    }

    pub fn set_badge(&mut self, gym_id: u8) {
        self.badges |= 1 << gym_id;
    }

    pub fn badge_count(&self) -> u8 {
        self.badges.count_ones() as u8
    }

    pub fn has_team_space(&self) -> bool {
        (self.team_size as usize) < MAX_TEAM_SIZE
    }

    pub fn add_to_team(&mut self, monster_key: Pubkey) -> bool {
        if !self.has_team_space() {
            return false;
        }
        self.team[self.team_size as usize] = monster_key;
        self.team_size += 1;
        true
    }

    pub fn remove_from_team(&mut self, monster_key: Pubkey) -> bool {
        let mut found = false;
        let mut idx = 0usize;
        for i in 0..self.team_size as usize {
            if self.team[i] == monster_key {
                found = true;
                idx = i;
                break;
            }
        }
        if !found {
            return false;
        }
        // Shift remaining elements
        for i in idx..(self.team_size as usize - 1) {
            self.team[i] = self.team[i + 1];
        }
        self.team_size -= 1;
        self.team[self.team_size as usize] = Pubkey::default();
        true
    }

    pub fn find_in_team(&self, monster_key: Pubkey) -> Option<usize> {
        for i in 0..self.team_size as usize {
            if self.team[i] == monster_key {
                return Some(i);
            }
        }
        None
    }
}

/// On-chain account representing a monster instance
#[account]
pub struct MonsterAccount {
    /// Owner agent pubkey
    pub owner: Pubkey,
    /// Species identifier (dex number)
    pub species_id: u16,
    /// Current level (1-100)
    pub level: u8,
    /// Current experience points
    pub experience: u32,
    /// Experience needed for next level
    pub exp_to_next: u32,
    /// Primary type
    pub primary_type: u8,
    /// Secondary type (255 = none)
    pub secondary_type: u8,
    /// Current computed stats
    pub stats: Stats,
    /// Current HP (can be less than stats.hp if damaged)
    pub current_hp: u16,
    /// Base stats for the species
    pub base_stats: BaseStats,
    /// Individual values (random genetics)
    pub ivs: IVs,
    /// Known moves (up to 4)
    pub moves: [Move; MAX_MOVES],
    /// Number of moves known
    pub num_moves: u8,
    /// Nickname bytes (max 16)
    pub nickname: [u8; MAX_NAME_LEN],
    /// Nickname length
    pub nickname_len: u8,
    /// Whether this monster has been traded before
    pub is_traded: bool,
    /// Original trainer (first owner)
    pub original_trainer: Pubkey,
    /// Evolution species ID (0 = no evolution)
    pub evolution_id: u16,
    /// Level required for evolution (0 = cannot evolve)
    pub evolution_level: u8,
    /// Total battles participated in
    pub battles_fought: u32,
    /// Total battles won
    pub battles_won: u32,
    /// Catch timestamp
    pub caught_at: i64,
    /// Is this monster fainted
    pub is_fainted: bool,
    /// Bump seed
    pub bump: u8,
    /// Reserved space
    pub _reserved: [u8; 32],
}

impl MonsterAccount {
    pub const LEN: usize = 8  // discriminator
        + 32  // owner
        + 2   // species_id
        + 1   // level
        + 4   // experience
        + 4   // exp_to_next
        + 1   // primary_type
        + 1   // secondary_type
        + 12  // stats (6 * u16)
        + 2   // current_hp
        + 6   // base_stats (6 * u8)
        + 6   // ivs (6 * u8)
        + (8 * MAX_MOVES) // moves (8 bytes each * 4)
        + 1   // num_moves
        + MAX_NAME_LEN // nickname
        + 1   // nickname_len
        + 1   // is_traded
        + 32  // original_trainer
        + 2   // evolution_id
        + 1   // evolution_level
        + 4   // battles_fought
        + 4   // battles_won
        + 8   // caught_at
        + 1   // is_fainted
        + 1   // bump
        + 32; // reserved

    /// Calculate actual stat value from base, IV, and level
    pub fn calc_stat(base: u8, iv: u8, level: u8, is_hp: bool) -> u16 {
        let base = base as u32;
        let iv = iv as u32;
        let level = level as u32;
        if is_hp {
            let numerator = (2 * base + iv) * level;
            let result = numerator / 100 + level + 10;
            result as u16
        } else {
            let numerator = (2 * base + iv) * level;
            let result = numerator / 100 + 5;
            result as u16
        }
    }

    /// Recalculate all stats based on current level, base stats, and IVs
    pub fn recalculate_stats(&mut self) {
        self.stats.hp = Self::calc_stat(self.base_stats.hp, self.ivs.hp, self.level, true);
        self.stats.atk = Self::calc_stat(self.base_stats.atk, self.ivs.atk, self.level, false);
        self.stats.def = Self::calc_stat(self.base_stats.def, self.ivs.def, self.level, false);
        self.stats.spd = Self::calc_stat(self.base_stats.spd, self.ivs.spd, self.level, false);
        self.stats.sp_atk = Self::calc_stat(self.base_stats.sp_atk, self.ivs.sp_atk, self.level, false);
        self.stats.sp_def = Self::calc_stat(self.base_stats.sp_def, self.ivs.sp_def, self.level, false);
    }

    /// Calculate experience required for next level
    pub fn calc_exp_to_next(level: u8) -> u32 {
        let l = level as u32;
        // Cubic growth curve: (4 * L^3) / 5
        (4 * l * l * l) / 5
    }

    /// Try to gain experience and level up
    pub fn gain_exp(&mut self, amount: u32) -> bool {
        let mut leveled = false;
        self.experience = self.experience.saturating_add(amount);

        while self.level < MAX_LEVEL && self.experience >= self.exp_to_next {
            self.experience -= self.exp_to_next;
            self.level += 1;
            self.exp_to_next = Self::calc_exp_to_next(self.level);
            leveled = true;
        }

        if self.level >= MAX_LEVEL {
            self.experience = 0;
        }

        if leveled {
            let old_max_hp = self.stats.hp;
            self.recalculate_stats();
            // Heal proportional to HP gain on level up
            let hp_gain = self.stats.hp.saturating_sub(old_max_hp);
            self.current_hp = self.current_hp.saturating_add(hp_gain).min(self.stats.hp);
        }

        leveled
    }

    /// Fully heal this monster
    pub fn full_heal(&mut self) {
        self.current_hp = self.stats.hp;
        self.is_fainted = false;
        for m in self.moves.iter_mut() {
            m.pp = m.max_pp;
        }
    }

    /// Check if monster can evolve
    pub fn can_evolve(&self) -> bool {
        self.evolution_id > 0 && self.evolution_level > 0 && self.level >= self.evolution_level
    }
}

/// On-chain record of a completed battle
#[account]
pub struct BattleRecord {
    /// Agent who participated
    pub agent: Pubkey,
    /// Agent's monster used
    pub agent_monster: Pubkey,
    /// Wild/opponent species
    pub opponent_species: u16,
    /// Opponent level
    pub opponent_level: u8,
    /// Whether agent won
    pub agent_won: bool,
    /// Damage dealt by agent
    pub damage_dealt: u32,
    /// Damage taken by agent
    pub damage_taken: u32,
    /// Experience gained
    pub exp_gained: u32,
    /// Number of turns the battle lasted
    pub turns: u8,
    /// RNG seed used
    pub rng_seed: u64,
    /// Timestamp
    pub timestamp: i64,
    /// Bump seed
    pub bump: u8,
}

impl BattleRecord {
    pub const LEN: usize = 8  // discriminator
        + 32  // agent
        + 32  // agent_monster
        + 2   // opponent_species
        + 1   // opponent_level
        + 1   // agent_won
        + 4   // damage_dealt
        + 4   // damage_taken
        + 4   // exp_gained
        + 1   // turns
        + 8   // rng_seed
        + 8   // timestamp
        + 1;  // bump
}

/// Leaderboard account (single global PDA)
#[account]
pub struct LeaderboardEntry {
    /// Agent pubkey
    pub agent: Pubkey,
    /// Agent owner
    pub owner: Pubkey,
    /// Score (composite of wins, catches, badges)
    pub score: u64,
    /// Total wins
    pub wins: u32,
    /// Total catches
    pub catches: u32,
    /// Badge count
    pub badges: u8,
    /// Agent level
    pub agent_level: u8,
    /// Last updated
    pub last_updated: i64,
    /// Bump seed
    pub bump: u8,
}

impl LeaderboardEntry {
    pub const LEN: usize = 8  // discriminator
        + 32  // agent
        + 32  // owner
        + 8   // score
        + 4   // wins
        + 4   // catches
        + 1   // badges
        + 1   // agent_level
        + 8   // last_updated
        + 1;  // bump

    /// Calculate composite score
    pub fn calculate_score(wins: u32, catches: u32, badges: u8, level: u8) -> u64 {
        let win_score = wins as u64 * 10;
        let catch_score = catches as u64 * 5;
        let badge_score = badges as u64 * 500;
        let level_score = level as u64 * 25;
        win_score + catch_score + badge_score + level_score
    }
}

/// On-chain RNG using xorshift64
pub struct Rng {
    state: u64,
}

impl Rng {
    /// Create new RNG from a seed
    pub fn new(seed: u64) -> Self {
        let state = if seed == 0 { 1 } else { seed };
        Self { state }
    }

    /// Create RNG from on-chain sources: slot, timestamp, and extra entropy
    pub fn from_chain(slot: u64, timestamp: i64, extra: &[u8]) -> Self {
        let mut seed = slot;
        seed ^= timestamp as u64;
        for (i, byte) in extra.iter().enumerate().take(8) {
            seed ^= (*byte as u64) << ((i % 8) * 8);
        }
        Self::new(seed)
    }

    /// Generate next random u64
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    /// Generate random u32
    pub fn next_u32(&mut self) -> u32 {
        (self.next_u64() & 0xFFFFFFFF) as u32
    }

    /// Generate random u16
    pub fn next_u16(&mut self) -> u16 {
        (self.next_u64() & 0xFFFF) as u16
    }

    /// Generate random u8
    pub fn next_u8(&mut self) -> u8 {
        (self.next_u64() & 0xFF) as u8
    }

    /// Generate random number in range [0, max)
    pub fn next_range(&mut self, max: u32) -> u32 {
        if max == 0 {
            return 0;
        }
        self.next_u32() % max
    }

    /// Generate random number in range [min, max]
    pub fn next_range_inclusive(&mut self, min: u32, max: u32) -> u32 {
        if max <= min {
            return min;
        }
        min + self.next_range(max - min + 1)
    }

    /// Generate random bool with given probability (out of 100)
    pub fn chance(&mut self, percent: u8) -> bool {
        self.next_range(100) < percent as u32
    }
}

/// Type effectiveness multipliers
/// Returns (numerator, denominator) to avoid floating point
/// 2/1 = super effective, 1/2 = not very effective, 0/1 = no effect, 1/1 = normal
pub fn type_effectiveness(attacker: u8, defender: u8) -> (u8, u8) {
    // Type chart encoded as compact lookup
    // Row = attacker type, Col = defender type
    // 0 = normal(1x), 1 = super(2x), 2 = not very(0.5x), 3 = immune(0x)
    const CHART: [[u8; NUM_TYPES]; NUM_TYPES] = [
        // Nor Fir Wat Gra Ele Ice Fig Poi Gro Fly Psy Bug Roc Gho Dra Dar Ste
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 2],  // Normal
        [0, 2, 2, 1, 0, 1, 0, 0, 0, 0, 0, 1, 2, 0, 2, 0, 1],  // Fire
        [0, 1, 2, 2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0],  // Water
        [0, 2, 1, 2, 0, 0, 0, 2, 1, 2, 0, 2, 1, 0, 2, 0, 2],  // Grass
        [0, 0, 1, 2, 2, 0, 0, 0, 3, 1, 0, 0, 0, 0, 2, 0, 0],  // Electric
        [0, 2, 2, 1, 0, 2, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 2],  // Ice
        [1, 0, 0, 0, 0, 1, 0, 2, 0, 2, 2, 2, 1, 3, 0, 1, 1],  // Fighting
        [0, 0, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 2, 2, 0, 0, 3],  // Poison
        [0, 1, 0, 2, 1, 0, 0, 1, 0, 3, 0, 2, 1, 0, 0, 0, 1],  // Ground
        [0, 0, 0, 1, 2, 0, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 2],  // Flying
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2, 0, 0, 0, 0, 3, 2],  // Psychic
        [0, 2, 0, 1, 0, 0, 2, 2, 0, 2, 1, 0, 0, 2, 0, 1, 2],  // Bug
        [0, 1, 0, 0, 0, 1, 2, 0, 2, 1, 0, 1, 0, 0, 0, 0, 2],  // Rock
        [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 2, 0],  // Ghost
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2],  // Dragon
        [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 1, 0, 2, 2],  // Dark
        [0, 2, 2, 0, 2, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2],  // Steel
    ];

    if attacker as usize >= NUM_TYPES || defender as usize >= NUM_TYPES {
        return (1, 1);
    }

    match CHART[attacker as usize][defender as usize] {
        1 => (2, 1),  // super effective
        2 => (1, 2),  // not very effective
        3 => (0, 1),  // no effect
        _ => (1, 1),  // normal
    }
}

/// Calculate damage for one attack
pub fn calculate_damage(
    attacker_level: u8,
    attack_stat: u16,
    defense_stat: u16,
    move_power: u8,
    move_type: u8,
    attacker_type: u8,
    defender_type: u8,
    defender_secondary_type: u8,
    rng: &mut Rng,
) -> u32 {
    if move_power == 0 {
        return 0;
    }

    let level = attacker_level as u32;
    let power = move_power as u32;
    let atk = attack_stat as u32;
    let def = if defense_stat == 0 { 1 } else { defense_stat as u32 };

    // Base damage formula
    let base = ((2 * level / 5 + 2) * power * atk / def) / 50 + 2;

    // STAB (Same Type Attack Bonus): 1.5x if move type matches attacker type
    let stab = if move_type == attacker_type { 3u32 } else { 2u32 };

    // Type effectiveness against primary type
    let (eff1_num, eff1_den) = type_effectiveness(move_type, defender_type);

    // Type effectiveness against secondary type
    let (eff2_num, eff2_den) = if defender_secondary_type < NUM_TYPES as u8 {
        type_effectiveness(move_type, defender_secondary_type)
    } else {
        (1, 1)
    };

    // Random factor 85-100 (out of 100)
    let random_factor = 85 + rng.next_range(16);

    // Combine: base * stab/2 * eff1 * eff2 * random/100
    let damage = base as u64
        * stab as u64
        * eff1_num as u64
        * eff2_num as u64
        * random_factor as u64
        / (2 * eff1_den as u64 * eff2_den as u64 * 100);

    // Minimum 1 damage if move has power and not immune
    if eff1_num == 0 || eff2_num == 0 {
        0
    } else if damage == 0 {
        1
    } else {
        damage as u32
    }
}

/// Species database entry for generating monsters
#[derive(Clone, Copy)]
pub struct SpeciesData {
    pub species_id: u16,
    pub primary_type: u8,
    pub secondary_type: u8, // 255 = none
    pub base_stats: BaseStats,
    pub evolution_id: u16,  // 0 = no evolution
    pub evolution_level: u8,
    pub catch_rate: u8,     // 0-255, higher = easier
}

/// Get species data by ID. Returns None for invalid IDs.
pub fn get_species(id: u16) -> Option<SpeciesData> {
    match id {
        1 => Some(SpeciesData {
            species_id: 1,
            primary_type: MonsterType::Fire as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 45, atk: 60, def: 40, spd: 70, sp_atk: 65, sp_def: 50 },
            evolution_id: 2,
            evolution_level: 16,
            catch_rate: 180,
        }),
        2 => Some(SpeciesData {
            species_id: 2,
            primary_type: MonsterType::Fire as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 65, atk: 80, def: 58, spd: 85, sp_atk: 80, sp_def: 65 },
            evolution_id: 3,
            evolution_level: 36,
            catch_rate: 90,
        }),
        3 => Some(SpeciesData {
            species_id: 3,
            primary_type: MonsterType::Fire as u8,
            secondary_type: MonsterType::Fighting as u8,
            base_stats: BaseStats { hp: 80, atk: 105, def: 71, spd: 100, sp_atk: 95, sp_def: 80 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 45,
        }),
        4 => Some(SpeciesData {
            species_id: 4,
            primary_type: MonsterType::Water as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 50, atk: 48, def: 65, spd: 43, sp_atk: 60, sp_def: 64 },
            evolution_id: 5,
            evolution_level: 16,
            catch_rate: 180,
        }),
        5 => Some(SpeciesData {
            species_id: 5,
            primary_type: MonsterType::Water as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 70, atk: 65, def: 80, spd: 58, sp_atk: 80, sp_def: 80 },
            evolution_id: 6,
            evolution_level: 36,
            catch_rate: 90,
        }),
        6 => Some(SpeciesData {
            species_id: 6,
            primary_type: MonsterType::Water as u8,
            secondary_type: MonsterType::Steel as u8,
            base_stats: BaseStats { hp: 84, atk: 86, def: 88, spd: 68, sp_atk: 95, sp_def: 95 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 45,
        }),
        7 => Some(SpeciesData {
            species_id: 7,
            primary_type: MonsterType::Grass as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 50, atk: 55, def: 55, spd: 50, sp_atk: 65, sp_def: 55 },
            evolution_id: 8,
            evolution_level: 16,
            catch_rate: 180,
        }),
        8 => Some(SpeciesData {
            species_id: 8,
            primary_type: MonsterType::Grass as u8,
            secondary_type: MonsterType::Poison as u8,
            base_stats: BaseStats { hp: 70, atk: 70, def: 70, spd: 65, sp_atk: 85, sp_def: 70 },
            evolution_id: 9,
            evolution_level: 36,
            catch_rate: 90,
        }),
        9 => Some(SpeciesData {
            species_id: 9,
            primary_type: MonsterType::Grass as u8,
            secondary_type: MonsterType::Poison as u8,
            base_stats: BaseStats { hp: 85, atk: 85, def: 85, spd: 80, sp_atk: 100, sp_def: 90 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 45,
        }),
        10 => Some(SpeciesData {
            species_id: 10,
            primary_type: MonsterType::Electric as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 40, atk: 50, def: 40, spd: 90, sp_atk: 65, sp_def: 50 },
            evolution_id: 11,
            evolution_level: 22,
            catch_rate: 190,
        }),
        11 => Some(SpeciesData {
            species_id: 11,
            primary_type: MonsterType::Electric as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 60, atk: 75, def: 55, spd: 110, sp_atk: 90, sp_def: 60 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 75,
        }),
        12 => Some(SpeciesData {
            species_id: 12,
            primary_type: MonsterType::Normal as u8,
            secondary_type: MonsterType::Flying as u8,
            base_stats: BaseStats { hp: 55, atk: 50, def: 45, spd: 70, sp_atk: 40, sp_def: 40 },
            evolution_id: 13,
            evolution_level: 20,
            catch_rate: 200,
        }),
        13 => Some(SpeciesData {
            species_id: 13,
            primary_type: MonsterType::Normal as u8,
            secondary_type: MonsterType::Flying as u8,
            base_stats: BaseStats { hp: 80, atk: 80, def: 70, spd: 100, sp_atk: 60, sp_def: 60 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 90,
        }),
        14 => Some(SpeciesData {
            species_id: 14,
            primary_type: MonsterType::Psychic as u8,
            secondary_type: 255,
            base_stats: BaseStats { hp: 55, atk: 45, def: 50, spd: 95, sp_atk: 104, sp_def: 80 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 100,
        }),
        15 => Some(SpeciesData {
            species_id: 15,
            primary_type: MonsterType::Ghost as u8,
            secondary_type: MonsterType::Poison as u8,
            base_stats: BaseStats { hp: 60, atk: 50, def: 45, spd: 100, sp_atk: 100, sp_def: 75 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 80,
        }),
        16 => Some(SpeciesData {
            species_id: 16,
            primary_type: MonsterType::Dragon as u8,
            secondary_type: MonsterType::Flying as u8,
            base_stats: BaseStats { hp: 91, atk: 110, def: 80, spd: 100, sp_atk: 95, sp_def: 80 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 30,
        }),
        17 => Some(SpeciesData {
            species_id: 17,
            primary_type: MonsterType::Rock as u8,
            secondary_type: MonsterType::Ground as u8,
            base_stats: BaseStats { hp: 70, atk: 85, def: 110, spd: 35, sp_atk: 40, sp_def: 55 },
            evolution_id: 18,
            evolution_level: 25,
            catch_rate: 120,
        }),
        18 => Some(SpeciesData {
            species_id: 18,
            primary_type: MonsterType::Rock as u8,
            secondary_type: MonsterType::Ground as u8,
            base_stats: BaseStats { hp: 90, atk: 110, def: 130, spd: 45, sp_atk: 55, sp_def: 65 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 60,
        }),
        19 => Some(SpeciesData {
            species_id: 19,
            primary_type: MonsterType::Ice as u8,
            secondary_type: MonsterType::Psychic as u8,
            base_stats: BaseStats { hp: 65, atk: 50, def: 55, spd: 85, sp_atk: 105, sp_def: 95 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 70,
        }),
        20 => Some(SpeciesData {
            species_id: 20,
            primary_type: MonsterType::Dark as u8,
            secondary_type: MonsterType::Steel as u8,
            base_stats: BaseStats { hp: 75, atk: 100, def: 95, spd: 65, sp_atk: 55, sp_def: 85 },
            evolution_id: 0,
            evolution_level: 0,
            catch_rate: 60,
        }),
        _ => None,
    }
}

/// Gym leader data
pub struct GymLeaderData {
    pub gym_id: u8,
    pub leader_type: u8,
    pub monster_species: u16,
    pub monster_level: u8,
    pub badge_required: u8,
}

/// Get gym leader data
pub fn get_gym_leader(gym_id: u8) -> Option<GymLeaderData> {
    match gym_id {
        0 => Some(GymLeaderData { gym_id: 0, leader_type: MonsterType::Rock as u8, monster_species: 17, monster_level: 14, badge_required: 0 }),
        1 => Some(GymLeaderData { gym_id: 1, leader_type: MonsterType::Water as u8, monster_species: 5, monster_level: 21, badge_required: 1 }),
        2 => Some(GymLeaderData { gym_id: 2, leader_type: MonsterType::Electric as u8, monster_species: 11, monster_level: 28, badge_required: 2 }),
        3 => Some(GymLeaderData { gym_id: 3, leader_type: MonsterType::Grass as u8, monster_species: 8, monster_level: 32, badge_required: 3 }),
        4 => Some(GymLeaderData { gym_id: 4, leader_type: MonsterType::Psychic as u8, monster_species: 14, monster_level: 38, badge_required: 4 }),
        5 => Some(GymLeaderData { gym_id: 5, leader_type: MonsterType::Ghost as u8, monster_species: 15, monster_level: 42, badge_required: 5 }),
        6 => Some(GymLeaderData { gym_id: 6, leader_type: MonsterType::Ice as u8, monster_species: 19, monster_level: 48, badge_required: 6 }),
        7 => Some(GymLeaderData { gym_id: 7, leader_type: MonsterType::Dragon as u8, monster_species: 16, monster_level: 55, badge_required: 7 }),
        _ => None,
    }
}

/// Default moves for a monster based on species and level
pub fn get_default_moves(species_id: u16, primary_type: u8, level: u8) -> [Move; MAX_MOVES] {
    let mut moves = [Move::default(); MAX_MOVES];

    // Every monster gets a basic normal attack
    moves[0] = Move {
        move_id: 1,
        power: 40,
        accuracy: 100,
        move_type: MonsterType::Normal as u8,
        pp: 35,
        max_pp: 35,
        category: 0,
    };

    // STAB move based on primary type
    moves[1] = Move {
        move_id: 100 + primary_type as u16,
        power: 50,
        accuracy: 95,
        move_type: primary_type,
        pp: 25,
        max_pp: 25,
        category: if primary_type == MonsterType::Psychic as u8 || primary_type == MonsterType::Ghost as u8 { 1 } else { 0 },
    };

    if level >= 15 || species_id > 10 {
        moves[2] = Move {
            move_id: 200 + primary_type as u16,
            power: 70,
            accuracy: 90,
            move_type: primary_type,
            pp: 15,
            max_pp: 15,
            category: 1,
        };
    }

    if level >= 30 || species_id > 15 {
        moves[3] = Move {
            move_id: 300 + primary_type as u16,
            power: 90,
            accuracy: 85,
            move_type: primary_type,
            pp: 10,
            max_pp: 10,
            category: 0,
        };
    }

    moves
}