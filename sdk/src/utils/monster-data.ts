import { MonsterType, MonsterSpecies, RarityTier, BaseStats, Move, MoveCategory } from "../types";

/**
 * Complete monster species database: 85 normal + 6 rare + 3 legendary = 94 total.
 * Each species has base stats, type(s), catch rate, evolution chain, and learnset.
 */

// ============================================================
// MOVE DATABASE
// ============================================================

export const MOVES: Record<number, Move> = {
  1: { id: 1, name: "Tackle", type: MonsterType.Normal, category: MoveCategory.Physical, power: 40, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "A basic body charge attack." },
  2: { id: 2, name: "Scratch", type: MonsterType.Normal, category: MoveCategory.Physical, power: 40, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "Scratches the foe with sharp claws." },
  3: { id: 3, name: "Ember", type: MonsterType.Fire, category: MoveCategory.Special, power: 40, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "A small flame attack. May burn." },
  4: { id: 4, name: "Water Gun", type: MonsterType.Water, category: MoveCategory.Special, power: 40, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "A blast of water." },
  5: { id: 5, name: "Vine Whip", type: MonsterType.Grass, category: MoveCategory.Physical, power: 45, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "Whips with thin vines." },
  6: { id: 6, name: "Thunder Shock", type: MonsterType.Electric, category: MoveCategory.Special, power: 40, accuracy: 100, pp: 30, maxPp: 48, priority: 0, description: "An electric jolt. May paralyze." },
  7: { id: 7, name: "Gust", type: MonsterType.Flying, category: MoveCategory.Special, power: 40, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "A gust of wind." },
  8: { id: 8, name: "Pound", type: MonsterType.Normal, category: MoveCategory.Physical, power: 40, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "Pounds with forelegs or tail." },
  9: { id: 9, name: "Bite", type: MonsterType.Dark, category: MoveCategory.Physical, power: 60, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "Bites with sharp fangs. May flinch." },
  10: { id: 10, name: "Flamethrower", type: MonsterType.Fire, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "A powerful fire stream. May burn." },
  11: { id: 11, name: "Surf", type: MonsterType.Water, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "A huge wave crashes down." },
  12: { id: 12, name: "Solar Beam", type: MonsterType.Grass, category: MoveCategory.Special, power: 120, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "Absorbs light, then attacks." },
  13: { id: 13, name: "Thunderbolt", type: MonsterType.Electric, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "A strong electric blast. May paralyze." },
  14: { id: 14, name: "Ice Beam", type: MonsterType.Ice, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "Fires an icy beam. May freeze." },
  15: { id: 15, name: "Psychic", type: MonsterType.Psychic, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "A powerful psychic attack." },
  16: { id: 16, name: "Earthquake", type: MonsterType.Ground, category: MoveCategory.Physical, power: 100, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "A powerful quake attack." },
  17: { id: 17, name: "Rock Slide", type: MonsterType.Rock, category: MoveCategory.Physical, power: 75, accuracy: 90, pp: 10, maxPp: 16, priority: 0, description: "Hurls large boulders. May flinch." },
  18: { id: 18, name: "Shadow Ball", type: MonsterType.Ghost, category: MoveCategory.Special, power: 80, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "A shadowy blob attack." },
  19: { id: 19, name: "Dragon Claw", type: MonsterType.Dragon, category: MoveCategory.Physical, power: 80, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "Sharp claws slash the foe." },
  20: { id: 20, name: "Iron Tail", type: MonsterType.Steel, category: MoveCategory.Physical, power: 100, accuracy: 75, pp: 15, maxPp: 24, priority: 0, description: "Strikes with a hard tail." },
  21: { id: 21, name: "Poison Sting", type: MonsterType.Poison, category: MoveCategory.Physical, power: 15, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "A toxic sting. May poison." },
  22: { id: 22, name: "Karate Chop", type: MonsterType.Fighting, category: MoveCategory.Physical, power: 50, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "A chopping attack. High crit ratio." },
  23: { id: 23, name: "Bug Bite", type: MonsterType.Bug, category: MoveCategory.Physical, power: 60, accuracy: 100, pp: 20, maxPp: 32, priority: 0, description: "Bites and eats the foe's berry." },
  24: { id: 24, name: "Quick Attack", type: MonsterType.Normal, category: MoveCategory.Physical, power: 40, accuracy: 100, pp: 30, maxPp: 48, priority: 1, description: "Strikes first." },
  25: { id: 25, name: "Growl", type: MonsterType.Normal, category: MoveCategory.Status, power: 0, accuracy: 100, pp: 40, maxPp: 64, priority: 0, description: "Lowers the foe's Attack." },
  26: { id: 26, name: "Leer", type: MonsterType.Normal, category: MoveCategory.Status, power: 0, accuracy: 100, pp: 30, maxPp: 48, priority: 0, description: "Lowers the foe's Defense." },
  27: { id: 27, name: "Fire Blast", type: MonsterType.Fire, category: MoveCategory.Special, power: 110, accuracy: 85, pp: 5, maxPp: 8, priority: 0, description: "A fiery explosion. May burn." },
  28: { id: 28, name: "Hydro Pump", type: MonsterType.Water, category: MoveCategory.Special, power: 110, accuracy: 80, pp: 5, maxPp: 8, priority: 0, description: "A powerful water blast." },
  29: { id: 29, name: "Thunder", type: MonsterType.Electric, category: MoveCategory.Special, power: 110, accuracy: 70, pp: 10, maxPp: 16, priority: 0, description: "A massive lightning bolt." },
  30: { id: 30, name: "Blizzard", type: MonsterType.Ice, category: MoveCategory.Special, power: 110, accuracy: 70, pp: 5, maxPp: 8, priority: 0, description: "A freezing blizzard. May freeze." },
  31: { id: 31, name: "Leaf Blade", type: MonsterType.Grass, category: MoveCategory.Physical, power: 90, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "Sharp leaf slash. High crit." },
  32: { id: 32, name: "Cross Chop", type: MonsterType.Fighting, category: MoveCategory.Physical, power: 100, accuracy: 80, pp: 5, maxPp: 8, priority: 0, description: "A double chopping attack." },
  33: { id: 33, name: "Sludge Bomb", type: MonsterType.Poison, category: MoveCategory.Special, power: 90, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "Hurls toxic sludge. May poison." },
  34: { id: 34, name: "Aerial Ace", type: MonsterType.Flying, category: MoveCategory.Physical, power: 60, accuracy: 255, pp: 20, maxPp: 32, priority: 0, description: "An unavoidable attack." },
  35: { id: 35, name: "Confusion", type: MonsterType.Psychic, category: MoveCategory.Special, power: 50, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "A telekinetic attack. May confuse." },
  36: { id: 36, name: "X-Scissor", type: MonsterType.Bug, category: MoveCategory.Physical, power: 80, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "Slashes in an X pattern." },
  37: { id: 37, name: "Stone Edge", type: MonsterType.Rock, category: MoveCategory.Physical, power: 100, accuracy: 80, pp: 5, maxPp: 8, priority: 0, description: "Sharp stones strike. High crit." },
  38: { id: 38, name: "Shadow Claw", type: MonsterType.Ghost, category: MoveCategory.Physical, power: 70, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "Strikes with a shadowy claw." },
  39: { id: 39, name: "Dragon Pulse", type: MonsterType.Dragon, category: MoveCategory.Special, power: 85, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "A shockwave from the mouth." },
  40: { id: 40, name: "Flash Cannon", type: MonsterType.Steel, category: MoveCategory.Special, power: 80, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "A beam of steel energy." },
  41: { id: 41, name: "Dark Pulse", type: MonsterType.Dark, category: MoveCategory.Special, power: 80, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "A horrible aura. May flinch." },
  42: { id: 42, name: "Mud Shot", type: MonsterType.Ground, category: MoveCategory.Special, power: 55, accuracy: 95, pp: 15, maxPp: 24, priority: 0, description: "Hurls mud. Lowers Speed." },
  43: { id: 43, name: "Powder Snow", type: MonsterType.Ice, category: MoveCategory.Special, power: 40, accuracy: 100, pp: 25, maxPp: 40, priority: 0, description: "Blasts of powdery snow." },
  44: { id: 44, name: "Wing Attack", type: MonsterType.Flying, category: MoveCategory.Physical, power: 60, accuracy: 100, pp: 35, maxPp: 56, priority: 0, description: "Strikes with spread wings." },
  45: { id: 45, name: "Metal Claw", type: MonsterType.Steel, category: MoveCategory.Physical, power: 50, accuracy: 95, pp: 35, maxPp: 56, priority: 0, description: "Slashes with metal claws." },
  46: { id: 46, name: "Crunch", type: MonsterType.Dark, category: MoveCategory.Physical, power: 80, accuracy: 100, pp: 15, maxPp: 24, priority: 0, description: "Crunches with sharp fangs." },
  47: { id: 47, name: "Draco Meteor", type: MonsterType.Dragon, category: MoveCategory.Special, power: 130, accuracy: 90, pp: 5, maxPp: 8, priority: 0, description: "Calls down meteors. Lowers Sp.Atk." },
  48: { id: 48, name: "Hyper Beam", type: MonsterType.Normal, category: MoveCategory.Special, power: 150, accuracy: 90, pp: 5, maxPp: 8, priority: 0, description: "Powerful beam. Must recharge." },
  49: { id: 49, name: "Recover", type: MonsterType.Normal, category: MoveCategory.Status, power: 0, accuracy: 100, pp: 10, maxPp: 16, priority: 0, description: "Restores half max HP." },
  50: { id: 50, name: "Toxic", type: MonsterType.Poison, category: MoveCategory.Status, power: 0, accuracy: 90, pp: 10, maxPp: 16, priority: 0, description: "Badly poisons the foe." },
};

// Helper to make species definitions more compact
function species(
  id: number, name: string, types: [MonsterType] | [MonsterType, MonsterType],
  stats: [number, number, number, number, number, number],
  catchRate: number, baseXp: number, rarity: RarityTier,
  evolvesFrom: number | null, evolvesTo: number | null, evoLevel: number | null,
  movePool: number[], learnset: Record<number, number[]>, desc: string
): MonsterSpecies {
  return {
    id, name, types,
    baseStats: { hp: stats[0], attack: stats[1], defense: stats[2], spAttack: stats[3], spDefense: stats[4], speed: stats[5] },
    catchRate, baseXpYield: baseXp, rarity,
    evolvesFrom, evolvesTo, evolutionLevel: evoLevel,
    movePool, learnset, description: desc,
  };
}

const C = RarityTier.Common;
const U = RarityTier.Uncommon;
const R = RarityTier.Rare;
const L = RarityTier.Legendary;
const N = MonsterType.Normal, Fi = MonsterType.Fire, W = MonsterType.Water, E = MonsterType.Electric;
const G = MonsterType.Grass, Ic = MonsterType.Ice, Fg = MonsterType.Fighting, Po = MonsterType.Poison;
const Gr = MonsterType.Ground, Fl = MonsterType.Flying, Ps = MonsterType.Psychic, Bu = MonsterType.Bug;
const Ro = MonsterType.Rock, Gh = MonsterType.Ghost, Dr = MonsterType.Dragon, Da = MonsterType.Dark;
const St = MonsterType.Steel;

/**
 * All 94 monster species.
 */
export const SPECIES: Record<number, MonsterSpecies> = {
  // ===== FIRE STARTERS (1-3) =====
  1: species(1, "Emberpup", [Fi], [45, 52, 43, 60, 50, 65], 45, 62, C, null, 2, 16, [1, 3, 25], { 1: [1, 25], 7: [3], 13: [9], 19: [10] }, "A small fire pup with a tail flame."),
  2: species(2, "Blazehound", [Fi], [58, 64, 58, 80, 65, 80], 45, 142, U, 1, 3, 36, [1, 3, 9, 10, 25, 27], { 1: [1, 3], 16: [9], 22: [10], 30: [27] }, "A fierce hound wreathed in flames."),
  3: species(3, "Infernowolf", [Fi, Da], [78, 84, 78, 109, 85, 100], 45, 240, U, 2, null, null, [1, 3, 9, 10, 27, 41, 46, 48], { 1: [1, 3, 9], 36: [27], 42: [41], 50: [48] }, "An apex predator cloaked in dark flames."),

  // ===== WATER STARTERS (4-6) =====
  4: species(4, "Bubblefin", [W], [44, 48, 65, 50, 64, 43], 45, 63, C, null, 5, 16, [1, 4, 25], { 1: [1, 25], 7: [4], 13: [9], 18: [11] }, "A tiny fish with protective bubbles."),
  5: species(5, "Aquashell", [W], [59, 63, 80, 65, 80, 58], 45, 142, U, 4, 6, 36, [1, 4, 9, 11, 14, 25], { 1: [1, 4], 16: [9], 22: [11], 30: [14] }, "A sturdy aquatic creature with a hard shell."),
  6: species(6, "Tsunamight", [W, St], [79, 83, 100, 85, 105, 78], 45, 240, U, 5, null, null, [1, 4, 9, 11, 14, 28, 40, 48], { 1: [1, 4, 9], 36: [28], 42: [40], 50: [48] }, "A steel-armored leviathan."),

  // ===== GRASS STARTERS (7-9) =====
  7: species(7, "Sproutling", [G], [45, 49, 49, 65, 65, 45], 45, 64, C, null, 8, 16, [1, 5, 25], { 1: [1, 25], 7: [5], 13: [21], 18: [31] }, "A tiny plant creature that loves sunlight."),
  8: species(8, "Thornvine", [G, Po], [60, 62, 63, 80, 80, 60], 45, 142, U, 7, 9, 32, [1, 5, 21, 31, 33], { 1: [1, 5], 16: [21], 22: [31], 28: [33] }, "A vine-covered beast with poison thorns."),
  9: species(9, "Florazor", [G, Po], [80, 82, 83, 100, 100, 80], 45, 240, U, 8, null, null, [1, 5, 12, 21, 31, 33, 48, 50], { 1: [1, 5, 21], 32: [33], 38: [12], 50: [48] }, "A towering floral titan with razor petals."),

  // ===== ELECTRIC LINE (10-12) =====
  10: species(10, "Sparklet", [E], [40, 30, 35, 55, 40, 75], 190, 55, C, null, 11, 22, [1, 6, 24], { 1: [1, 24], 5: [6], 12: [13] }, "A tiny spark that zips around erratically."),
  11: species(11, "Voltail", [E], [60, 50, 55, 85, 70, 105], 75, 145, U, 10, 12, 40, [1, 6, 13, 24, 29], { 1: [1, 6], 22: [13], 30: [24], 36: [29] }, "A lightning-tailed speedster."),
  12: species(12, "Thundirex", [E, Fl], [75, 65, 70, 110, 85, 120], 45, 243, U, 11, null, null, [1, 6, 7, 13, 24, 29, 34, 48], { 1: [1, 6, 24], 40: [29], 46: [34], 52: [48] }, "Soars through storm clouds at lightning speed."),

  // ===== NORMAL RODENTS (13-14) =====
  13: species(13, "Nibblit", [N], [30, 30, 30, 30, 30, 40], 255, 30, C, null, 14, 15, [1, 2, 24, 25], { 1: [1, 25], 5: [24], 10: [2] }, "A common small rodent."),
  14: species(14, "Gnawrat", [N], [55, 66, 44, 44, 44, 72], 127, 116, C, 13, null, null, [1, 2, 9, 24, 46, 48], { 1: [1, 2, 24], 15: [9], 25: [46], 40: [48] }, "A scrappy rodent with sharp teeth."),

  // ===== BUG LINE (15-17) =====
  15: species(15, "Larvapod", [Bu], [45, 30, 35, 20, 20, 45], 255, 39, C, null, 16, 7, [1, 23], { 1: [1], 5: [23] }, "A small caterpillar-like bug."),
  16: species(16, "Cocoowrap", [Bu], [50, 20, 55, 25, 25, 30], 120, 72, C, 15, 17, 10, [1, 23], { 1: [1, 23] }, "Wrapped in silk, it barely moves."),
  17: species(17, "Mothshade", [Bu, Fl], [60, 45, 50, 90, 80, 70], 45, 185, U, 16, null, null, [7, 15, 23, 35, 36], { 1: [7, 23], 10: [35], 18: [36], 28: [15] }, "A beautiful moth with psychic dust."),

  // ===== FLYING LINE (18-20) =====
  18: species(18, "Peepwing", [N, Fl], [40, 45, 40, 35, 35, 56], 255, 50, C, null, 19, 18, [1, 7, 25, 44], { 1: [1, 7], 8: [25], 14: [44] }, "A common small bird."),
  19: species(19, "Hawkscree", [N, Fl], [63, 60, 55, 50, 50, 71], 120, 122, U, 18, 20, 36, [1, 7, 24, 34, 44], { 1: [1, 7, 44], 18: [24], 26: [34] }, "A swift hunting bird."),
  20: species(20, "Stormtalon", [N, Fl], [83, 80, 75, 70, 70, 101], 45, 216, U, 19, null, null, [1, 7, 24, 34, 44, 48], { 1: [1, 7, 44], 36: [34], 44: [24], 50: [48] }, "A massive raptor that rides storms."),

  // ===== FIGHTING LINE (21-23) =====
  21: species(21, "Punchub", [Fg], [50, 65, 45, 35, 40, 55], 180, 56, C, null, 22, 25, [1, 22, 24, 26], { 1: [1, 26], 8: [22], 14: [24] }, "A small fighting cub."),
  22: species(22, "Brawlgor", [Fg], [70, 95, 65, 45, 60, 75], 90, 159, U, 21, 23, 42, [1, 9, 22, 24, 32], { 1: [1, 22], 25: [9], 32: [32] }, "A muscular brawler."),
  23: species(23, "Titanfist", [Fg, St], [90, 120, 90, 55, 75, 85], 45, 250, U, 22, null, null, [1, 9, 20, 22, 32, 37, 40, 48], { 1: [1, 22, 9], 42: [32], 48: [20], 54: [48] }, "Its steel-coated fists shatter boulders."),

  // ===== POISON LINE (24-26) =====
  24: species(24, "Sludgelet", [Po], [40, 45, 40, 50, 45, 40], 190, 52, C, null, 25, 22, [1, 21, 25, 50], { 1: [1, 21], 10: [25], 18: [50] }, "A small glob of toxic sludge."),
  25: species(25, "Venomire", [Po, Gr], [65, 65, 65, 75, 70, 55], 90, 142, U, 24, 26, 38, [1, 16, 21, 33, 42, 50], { 1: [1, 21], 22: [33], 30: [42], 36: [50] }, "A swamp-dwelling toxic creature."),
  26: species(26, "Plaguemar", [Po, Gr], [85, 85, 85, 100, 90, 70], 45, 240, U, 25, null, null, [1, 16, 21, 33, 42, 48, 50], { 1: [1, 21, 33], 38: [16], 44: [42], 52: [48] }, "Its toxic miasma poisons the land."),

  // ===== GROUND LINE (27-29) =====
  27: species(27, "Diglett", [Gr], [35, 55, 30, 35, 45, 70], 190, 53, C, null, 28, 26, [1, 2, 42], { 1: [1, 2], 10: [42] }, "Burrows through earth easily."),
  28: species(28, "Burrox", [Gr], [60, 80, 55, 50, 70, 100], 75, 149, U, 27, 29, 40, [1, 2, 16, 42], { 1: [1, 2, 42], 26: [16] }, "A fast burrowing predator."),
  29: species(29, "Terramaw", [Gr, Ro], [80, 110, 80, 60, 80, 85], 45, 232, U, 28, null, null, [1, 2, 16, 17, 37, 42, 48], { 1: [1, 2, 42], 40: [16], 46: [37], 52: [48] }, "Its massive jaws can crush stone."),

  // ===== ROCK LINE (30-32) =====
  30: species(30, "Pebblite", [Ro], [50, 55, 70, 30, 40, 25], 190, 56, C, null, 31, 24, [1, 17, 26], { 1: [1, 26], 10: [17] }, "A small living rock."),
  31: species(31, "Bouldron", [Ro, Gr], [70, 80, 100, 45, 55, 35], 90, 137, U, 30, 32, 42, [1, 16, 17, 37], { 1: [1, 17], 24: [16], 34: [37] }, "A massive boulder creature."),
  32: species(32, "Monolith", [Ro, St], [90, 105, 130, 55, 65, 40], 45, 238, U, 31, null, null, [1, 16, 17, 20, 37, 40, 48], { 1: [1, 17, 16], 42: [37], 48: [20], 54: [48] }, "An indestructible stone monolith."),

  // ===== ICE LINE (33-35) =====
  33: species(33, "Frostkit", [Ic], [50, 40, 50, 60, 55, 50], 170, 58, C, null, 34, 28, [1, 43, 25], { 1: [1, 25], 8: [43], 16: [14] }, "A small ice creature."),
  34: species(34, "Glacipaw", [Ic], [70, 55, 70, 85, 75, 65], 75, 145, U, 33, 35, 42, [1, 14, 30, 43], { 1: [1, 43], 28: [14], 36: [30] }, "Its icy claws freeze on contact."),
  35: species(35, "Frozarch", [Ic, Gh], [90, 65, 85, 110, 95, 80], 45, 243, U, 34, null, null, [1, 14, 18, 30, 38, 43, 48], { 1: [1, 43, 14], 42: [18], 48: [30], 54: [48] }, "An spectral ice monarch."),

  // ===== PSYCHIC LINE (36-38) =====
  36: species(36, "Mindmote", [Ps], [45, 25, 40, 70, 60, 55], 170, 60, C, null, 37, 25, [1, 8, 35], { 1: [1, 8], 10: [35] }, "A floating psychic spore."),
  37: species(37, "Psyorb", [Ps], [65, 35, 55, 95, 80, 75], 75, 148, U, 36, 38, 40, [1, 15, 35, 49], { 1: [1, 35], 25: [15], 34: [49] }, "A glowing orb of mental energy."),
  38: species(38, "Cosmind", [Ps, Fl], [85, 45, 70, 125, 100, 95], 45, 245, U, 37, null, null, [1, 7, 15, 34, 35, 48, 49], { 1: [1, 35, 15], 40: [34], 46: [49], 52: [48] }, "Reads minds across vast distances."),

  // ===== GHOST LINE (39-41) =====
  39: species(39, "Shadewisp", [Gh], [40, 35, 30, 60, 50, 60], 170, 55, C, null, 40, 25, [1, 8, 38], { 1: [1, 8], 10: [38] }, "A flickering shadow wisp."),
  40: species(40, "Phantogeist", [Gh, Po], [60, 50, 50, 85, 75, 80], 75, 152, U, 39, 41, 40, [1, 18, 33, 38, 50], { 1: [1, 38], 25: [18], 32: [33], 38: [50] }, "A restless phantom."),
  41: species(41, "Reaperghast", [Gh, Da], [80, 65, 65, 115, 95, 100], 45, 245, U, 40, null, null, [1, 18, 33, 38, 41, 46, 48, 50], { 1: [1, 38, 18], 40: [41], 46: [46], 54: [48] }, "A terrifying reaper spirit."),

  // ===== DARK LINE (42-44) =====
  42: species(42, "Murkpup", [Da], [48, 55, 40, 40, 40, 55], 170, 56, C, null, 43, 24, [1, 9, 26], { 1: [1, 26], 8: [9] }, "A sneaky shadow pup."),
  43: species(43, "Shadowfang", [Da], [68, 80, 60, 55, 55, 80], 90, 148, U, 42, 44, 40, [1, 9, 41, 46], { 1: [1, 9], 24: [41], 32: [46] }, "A vicious shadow predator."),
  44: species(44, "Umbrawarg", [Da, Fg], [88, 110, 80, 65, 65, 100], 45, 240, U, 43, null, null, [1, 9, 22, 32, 41, 46, 48], { 1: [1, 9, 46], 40: [41], 46: [32], 52: [48] }, "Hunts in packs under moonless nights."),

  // ===== STEEL LINE (45-47) =====
  45: species(45, "Gearon", [St], [50, 55, 65, 40, 55, 30], 170, 58, C, null, 46, 30, [1, 45, 26], { 1: [1, 26], 10: [45] }, "A small mechanical gear creature."),
  46: species(46, "Ironcog", [St], [70, 75, 90, 55, 75, 45], 75, 152, U, 45, 47, 42, [1, 20, 40, 45], { 1: [1, 45], 30: [40], 38: [20] }, "Interlocking gears form its body."),
  47: species(47, "Titanmech", [St, E], [90, 95, 115, 75, 95, 60], 45, 245, U, 46, null, null, [1, 13, 20, 29, 40, 45, 48], { 1: [1, 45, 40], 42: [20], 48: [13], 54: [48] }, "A colossal mechanical titan."),

  // ===== DRAGON LINE (48-50) =====
  48: species(48, "Drakelet", [Dr], [50, 60, 45, 60, 45, 50], 45, 67, U, null, 49, 30, [1, 2, 9, 19], { 1: [1, 2], 10: [9], 18: [19] }, "A tiny but fierce baby dragon."),
  49: species(49, "Wyvernscale", [Dr, Fl], [70, 85, 65, 85, 65, 75], 45, 170, U, 48, 50, 50, [1, 9, 19, 34, 39, 44], { 1: [1, 9, 19], 30: [34], 38: [39], 44: [44] }, "A winged dragon with tough scales."),
  50: species(50, "Dracostorm", [Dr, Fl], [95, 115, 85, 115, 85, 100], 45, 270, U, 49, null, null, [1, 9, 19, 34, 39, 44, 47, 48], { 1: [1, 19, 34], 50: [47], 56: [48], 60: [39] }, "Commands storms with a roar."),

  // ===== NORMAL STANDALONE (51-55) =====
  51: species(51, "Fluffox", [N], [55, 45, 50, 60, 60, 55], 150, 70, C, null, null, null, [1, 8, 24, 25, 49], { 1: [1, 25], 10: [24], 20: [8], 30: [49] }, "A fluffy fox that adapts to any environment."),
  52: species(52, "Snorburr", [N], [100, 50, 60, 50, 60, 30], 120, 80, C, null, null, null, [1, 8, 25, 48, 49], { 1: [1, 25], 15: [8], 30: [49], 45: [48] }, "Sleeps 20 hours a day."),
  53: species(53, "Howlion", [N], [65, 80, 60, 50, 60, 75], 120, 110, C, null, null, null, [1, 2, 9, 24, 46, 48], { 1: [1, 2], 12: [24], 22: [9], 35: [46], 45: [48] }, "Howls at the moon for power."),
  54: species(54, "Mimickle", [N], [48, 48, 48, 48, 48, 48], 200, 61, C, null, null, null, [1, 8, 24, 25, 35], { 1: [1, 8], 10: [24], 20: [25], 30: [35] }, "Copies the appearance of other monsters."),
  55: species(55, "Tankhide", [N], [90, 60, 95, 40, 85, 30], 100, 120, C, null, null, null, [1, 8, 9, 17, 20, 25, 48], { 1: [1, 25], 10: [8], 20: [9], 30: [17], 40: [20], 50: [48] }, "Its thick hide deflects most attacks."),

  // ===== FIRE STANDALONE (56-58) =====
  56: species(56, "Cindermole", [Fi, Gr], [55, 70, 55, 45, 45, 55], 150, 75, C, null, null, null, [1, 3, 42, 16], { 1: [1, 3], 15: [42], 30: [16] }, "Burrows through volcanic soil."),
  57: species(57, "Lavaslug", [Fi, Ro], [80, 50, 80, 80, 60, 20], 100, 130, C, null, null, null, [1, 3, 10, 17, 27, 37], { 1: [1, 3], 15: [17], 25: [10], 38: [37], 48: [27] }, "Moves slowly but burns intensely."),
  58: species(58, "Magmaconda", [Fi, Po], [70, 85, 60, 75, 60, 70], 120, 115, C, null, null, null, [1, 3, 9, 10, 21, 33, 50], { 1: [1, 21], 12: [3], 20: [9], 30: [10], 40: [33], 48: [50] }, "A fiery serpent oozing toxic heat."),

  // ===== WATER STANDALONE (59-61) =====
  59: species(59, "Coralsprout", [W, G], [65, 50, 70, 75, 70, 40], 120, 100, C, null, null, null, [1, 4, 5, 11, 31], { 1: [1, 4], 12: [5], 25: [11], 38: [31] }, "A coral creature with plant growth."),
  60: species(60, "Jellyzap", [W, E], [60, 40, 50, 80, 60, 80], 120, 105, C, null, null, null, [1, 4, 6, 11, 13], { 1: [1, 4], 12: [6], 25: [11], 38: [13] }, "An electric jellyfish."),
  61: species(61, "Tidecrush", [W, Fg], [80, 95, 75, 50, 55, 65], 100, 125, C, null, null, null, [1, 4, 11, 22, 28, 32], { 1: [1, 4], 15: [22], 28: [11], 40: [32], 50: [28] }, "Smashes foes with tidal force."),

  // ===== GRASS STANDALONE (62-64) =====
  62: species(62, "Fungrowth", [G, Da], [60, 50, 55, 75, 70, 50], 130, 90, C, null, null, null, [1, 5, 9, 31, 41], { 1: [1, 5], 12: [9], 25: [31], 38: [41] }, "A dark mushroom that thrives in shade."),
  63: species(63, "Cacthorn", [G, Fg], [65, 80, 70, 55, 55, 50], 120, 105, C, null, null, null, [1, 5, 22, 31, 32], { 1: [1, 5], 15: [22], 28: [31], 42: [32] }, "A cactus fighter with needle punches."),
  64: species(64, "Mossgolem", [G, Ro], [85, 75, 90, 55, 70, 25], 90, 130, C, null, null, null, [1, 5, 17, 31, 37], { 1: [1, 5], 15: [17], 30: [31], 42: [37] }, "An ancient stone covered in moss."),

  // ===== MISC DUALS (65-75) =====
  65: species(65, "Volcanice", [Fi, Ic], [70, 70, 60, 80, 60, 70], 100, 115, C, null, null, null, [1, 3, 10, 14, 30, 43], { 1: [1, 3, 43], 18: [10], 30: [14], 42: [30] }, "Born where lava meets glacier."),
  66: species(66, "Stormeel", [E, W], [70, 55, 55, 90, 65, 80], 100, 120, C, null, null, null, [1, 4, 6, 11, 13, 29], { 1: [1, 6], 12: [4], 22: [13], 35: [11], 48: [29] }, "Generates electricity in water."),
  67: species(67, "Sandserpent", [Gr, Dr], [75, 85, 70, 60, 55, 80], 90, 130, C, null, null, null, [1, 2, 16, 19, 42], { 1: [1, 2], 15: [42], 28: [19], 40: [16] }, "A dragon that swims through sand."),
  68: species(68, "Crystalbug", [Bu, Ic], [55, 40, 65, 80, 70, 55], 120, 95, C, null, null, null, [1, 14, 23, 36, 43], { 1: [1, 23], 12: [43], 25: [36], 38: [14] }, "Its crystalline wings refract light."),
  69: species(69, "Steelwing", [St, Fl], [65, 70, 85, 50, 70, 70], 90, 130, C, null, null, null, [1, 7, 34, 40, 44, 45], { 1: [1, 7, 45], 18: [44], 30: [34], 42: [40] }, "Metal feathers slice through air."),
  70: species(70, "Spectrox", [Gh, Ps], [55, 40, 50, 90, 80, 85], 100, 120, C, null, null, null, [1, 15, 18, 35, 38, 49], { 1: [1, 35], 15: [38], 28: [15], 40: [18], 48: [49] }, "A phantom with psychic powers."),
  71: species(71, "Ironbeetle", [Bu, St], [65, 75, 95, 40, 70, 45], 100, 120, C, null, null, null, [1, 23, 36, 40, 45], { 1: [1, 23], 15: [45], 28: [36], 40: [40] }, "Its iron carapace is nearly unbreakable."),
  72: species(72, "Shadecrow", [Da, Fl], [60, 75, 50, 65, 50, 80], 120, 100, C, null, null, null, [1, 7, 9, 34, 41, 44, 46], { 1: [1, 7], 12: [9], 22: [44], 32: [41], 42: [46] }, "An omen of bad luck."),
  73: species(73, "Psyclops", [Ps, Ro], [75, 65, 80, 85, 75, 50], 90, 135, C, null, null, null, [1, 15, 17, 35, 37, 49], { 1: [1, 35], 15: [17], 28: [15], 40: [37], 48: [49] }, "A one-eyed psychic rock monster."),
  74: species(74, "Venomoth", [Po, Bu], [60, 50, 55, 80, 65, 70], 120, 100, C, null, null, null, [1, 21, 23, 33, 36, 50], { 1: [1, 21], 12: [23], 22: [33], 35: [36], 45: [50] }, "Spreads toxic scales from its wings."),
  75: species(75, "Frostfang", [Ic, Da], [70, 85, 60, 55, 55, 80], 100, 120, C, null, null, null, [1, 9, 14, 30, 43, 46], { 1: [1, 9, 43], 18: [46], 30: [14], 42: [30] }, "Hunts in blizzards with icy fangs."),

  // ===== MORE STANDALONES (76-85) =====
  76: species(76, "Blazeraptor", [Fi, Fg], [70, 95, 55, 60, 55, 85], 90, 135, C, null, null, null, [1, 3, 10, 22, 27, 32], { 1: [1, 3], 12: [22], 25: [10], 38: [32], 48: [27] }, "A fiery martial artist raptor."),
  77: species(77, "Aquamorph", [W, Ps], [80, 50, 65, 90, 80, 55], 90, 135, C, null, null, null, [1, 4, 11, 15, 28, 35, 49], { 1: [1, 4], 12: [35], 25: [15], 38: [11], 48: [28] }, "Reshapes water with telekinesis."),
  78: species(78, "Thornback", [G, St], [75, 80, 95, 50, 70, 30], 90, 130, C, null, null, null, [1, 5, 20, 31, 40, 45], { 1: [1, 5], 15: [45], 28: [31], 40: [20], 48: [40] }, "Steel thorns cover its mossy back."),
  79: species(79, "Voltsaber", [E, Fg], [60, 85, 55, 55, 55, 95], 90, 130, C, null, null, null, [1, 6, 13, 22, 24, 29, 32], { 1: [1, 6], 12: [22], 22: [24], 32: [13], 42: [32], 50: [29] }, "Fights with electrified fists."),
  80: species(80, "Hauntsword", [Gh, St], [60, 90, 80, 55, 65, 55], 90, 135, C, null, null, null, [1, 18, 20, 38, 40, 45, 46], { 1: [1, 45], 12: [38], 25: [18], 38: [20], 48: [40] }, "A possessed ancient blade."),
  81: species(81, "Pyroclam", [Fi, W], [75, 60, 70, 80, 65, 50], 100, 115, C, null, null, null, [1, 3, 4, 10, 11, 27, 28], { 1: [1, 3, 4], 18: [10], 30: [11], 42: [27], 50: [28] }, "A clam from deep-sea volcanic vents."),
  82: species(82, "Dragonfruit", [Dr, G], [75, 70, 65, 85, 70, 65], 90, 135, C, null, null, null, [1, 5, 12, 19, 31, 39], { 1: [1, 5], 15: [19], 28: [31], 40: [39], 48: [12] }, "A dragon-plant hybrid."),
  83: species(83, "Nightowl", [Da, Fl], [68, 55, 55, 80, 70, 80], 100, 110, C, null, null, null, [1, 7, 9, 15, 34, 41, 44], { 1: [1, 7], 12: [9], 22: [44], 32: [15], 42: [41] }, "Silent hunter of the night sky."),
  84: species(84, "Magnetoise", [St, W], [80, 55, 90, 70, 85, 40], 90, 135, C, null, null, null, [1, 4, 11, 13, 40, 45], { 1: [1, 4, 45], 18: [11], 30: [40], 42: [13] }, "Controls magnetic fields in water."),
  85: species(85, "Dustdevil", [Gr, Gh], [60, 70, 50, 75, 55, 85], 100, 115, C, null, null, null, [1, 16, 18, 38, 42], { 1: [1, 42], 15: [38], 28: [18], 40: [16] }, "A desert phantom made of whirling sand."),

  // ===== RARE SPECIES (86-91) =====
  86: species(86, "Phoenixia", [Fi, Fl], [80, 85, 70, 100, 80, 95], 15, 260, R, null, null, null, [1, 3, 7, 10, 27, 34, 44, 48], { 1: [1, 3, 7], 20: [10], 30: [34], 40: [27], 50: [48] }, "Reborn from its own ashes."),
  87: species(87, "Leviathorn", [W, Dr], [95, 100, 85, 80, 75, 70], 15, 260, R, null, null, null, [1, 4, 9, 11, 19, 28, 39, 47], { 1: [1, 4, 9], 20: [19], 30: [11], 40: [39], 50: [47] }, "A sea dragon with spiked armor."),
  88: species(88, "Ancientree", [G, Dr], [90, 70, 90, 95, 95, 55], 15, 260, R, null, null, null, [1, 5, 12, 19, 31, 39, 47], { 1: [1, 5], 20: [19], 30: [31], 40: [39], 50: [47] }, "An ancient tree dragon that predates civilization."),
  89: species(89, "Voidpanther", [Da, Ps], [80, 100, 65, 95, 70, 105], 15, 260, R, null, null, null, [1, 9, 15, 35, 41, 46, 48], { 1: [1, 9], 20: [41], 30: [15], 40: [46], 50: [48] }, "Moves between dimensions to hunt."),
  90: species(90, "Crystalwyrm", [Ic, Dr], [85, 80, 90, 100, 90, 70], 15, 260, R, null, null, null, [1, 14, 19, 30, 39, 43, 47], { 1: [1, 43], 20: [19], 30: [14], 40: [39], 50: [47] }, "Its crystal scales refract all light."),
  91: species(91, "Thunderkhan", [E, Fg], [80, 105, 70, 75, 70, 110], 15, 260, R, null, null, null, [1, 6, 13, 22, 24, 29, 32], { 1: [1, 6, 22], 20: [13], 30: [24], 40: [32], 50: [29] }, "A legendary warrior charged with lightning."),

  // ===== LEGENDARY SPECIES (92-94) =====
  92: species(92, "Solaryx", [Fi, Ps], [110, 100, 90, 130, 100, 110], 3, 340, L, null, null, null, [1, 3, 10, 15, 27, 35, 48, 49], { 1: [1, 3, 15], 30: [10], 40: [27], 50: [35], 60: [48] }, "The sun incarnate. Its gaze melts steel."),
  93: species(93, "Lunaryx", [Ic, Gh], [110, 90, 100, 130, 110, 100], 3, 340, L, null, null, null, [1, 14, 18, 30, 38, 43, 48, 49], { 1: [1, 43, 18], 30: [14], 40: [30], 50: [38], 60: [48] }, "The moon incarnate. Freezes souls."),
  94: species(94, "Cosmovoid", [Dr, Da], [120, 110, 100, 120, 100, 110], 3, 340, L, null, null, null, [1, 9, 19, 39, 41, 46, 47, 48], { 1: [1, 9, 19], 30: [41], 40: [47], 50: [46], 60: [48] }, "Born from the void between stars."),
};

/**
 * Get a species by ID.
 */
export function getSpecies(id: number): MonsterSpecies | undefined {
  return SPECIES[id];
}

/**
 * Get all species of a given rarity.
 */
export function getSpeciesByRarity(rarity: RarityTier): MonsterSpecies[] {
  return Object.values(SPECIES).filter((s) => s.rarity === rarity);
}

/**
 * Get all species of a given type.
 */
export function getSpeciesByType(type: MonsterType): MonsterSpecies[] {
  return Object.values(SPECIES).filter((s) => s.types.includes(type));
}

/**
 * Get the evolution chain for a species (returns array of species IDs).
 */
export function getEvolutionChain(speciesId: number): number[] {
  const chain: number[] = [];
  let current = speciesId;

  // Walk backwards to find the base
  while (true) {
    const sp = SPECIES[current];
    if (!sp || sp.evolvesFrom === null) break;
    current = sp.evolvesFrom;
  }

  // Walk forwards to build chain
  while (true) {
    chain.push(current);
    const sp = SPECIES[current];
    if (!sp || sp.evolvesTo === null) break;
    current = sp.evolvesTo;
  }

  return chain;
}

/**
 * Check if a species can evolve at the given level.
 */
export function canEvolve(speciesId: number, level: number): boolean {
  const sp = SPECIES[speciesId];
  if (!sp || sp.evolvesTo === null || sp.evolutionLevel === null) return false;
  return level >= sp.evolutionLevel;
}

/**
 * Get a move by ID.
 */
export function getMove(id: number): Move | undefined {
  return MOVES[id];
}

/**
 * Get all moves a species can learn at a given level.
 */
export function getMovesAtLevel(speciesId: number, level: number): Move[] {
  const sp = SPECIES[speciesId];
  if (!sp) return [];
  const moveIds = sp.learnset[level];
  if (!moveIds) return [];
  return moveIds.map((id) => MOVES[id]).filter((m): m is Move => m !== undefined);
}

/**
 * Get all moves a species has learned up to a given level.
 */
export function getAllMovesUpToLevel(speciesId: number, level: number): Move[] {
  const sp = SPECIES[speciesId];
  if (!sp) return [];
  const moveSet = new Set<number>();
  for (const [lvl, ids] of Object.entries(sp.learnset)) {
    if (Number(lvl) <= level) {
      for (const id of ids) {
        moveSet.add(id);
      }
    }
  }
  return Array.from(moveSet)
    .map((id) => MOVES[id])
    .filter((m): m is Move => m !== undefined);
}

/**
 * Calculate a stat at a given level.
 */
export function calculateStat(
  baseStat: number,
  iv: number,
  ev: number,
  level: number,
  natureMultiplier: number,
  isHp: boolean
): number {
  if (isHp) {
    return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }
  return Math.floor(
    (Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMultiplier
  );
}

/**
 * Calculate all stats for a monster.
 */
export function calculateAllStats(
  baseStats: BaseStats,
  ivs: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number },
  evs: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number },
  level: number,
  naturePlus: string | null,
  natureMinus: string | null
): { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number } {
  const getNatureMult = (stat: string): number => {
    if (stat === naturePlus) return 1.1;
    if (stat === natureMinus) return 0.9;
    return 1.0;
  };

  return {
    hp: calculateStat(baseStats.hp, ivs.hp, evs.hp, level, 1.0, true),
    attack: calculateStat(baseStats.attack, ivs.attack, evs.attack, level, getNatureMult("attack"), false),
    defense: calculateStat(baseStats.defense, ivs.defense, evs.defense, level, getNatureMult("defense"), false),
    spAttack: calculateStat(baseStats.spAttack, ivs.spAttack, evs.spAttack, level, getNatureMult("spAttack"), false),
    spDefense: calculateStat(baseStats.spDefense, ivs.spDefense, evs.spDefense, level, getNatureMult("spDefense"), false),
    speed: calculateStat(baseStats.speed, ivs.speed, evs.speed, level, getNatureMult("speed"), false),
  };
}

/**
 * Get starter species IDs (first of each starter line).
 */
export function getStarterSpecies(): number[] {
  return [1, 4, 7];
}

/**
 * Get all species count by rarity.
 */
export function getSpeciesCountByRarity(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sp of Object.values(SPECIES)) {
    counts[sp.rarity] = (counts[sp.rarity] || 0) + 1;
  }
  return counts;
}