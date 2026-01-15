/**
 * generate-trainers.js
 *
 * Generates AI trainer profiles with randomized teams, strategies, and
 * starting positions for populating the PXMON world.
 *
 * Usage:
 *   node scripts/generate-trainers.js --count 50 --output trainers.json
 *   node scripts/generate-trainers.js --count 200 --seed 42 --tier silver
 */

const fs = require("fs");
const crypto = require("crypto");

const TYPES = [
  "Normal", "Fire", "Water", "Grass", "Electric", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Dark", "Steel",
];

const STRATEGIES = [
  "aggressive",
  "defensive",
  "balanced",
  "type-specialist",
  "speed-rush",
  "tank",
  "status-effect",
  "setup-sweeper",
];

const ZONES = [
  "verdant-meadow", "ember-cave", "crystal-lake", "thunder-peak",
  "frost-valley", "shadow-forest", "iron-quarry", "coral-reef",
  "sky-plateau", "ancient-ruins", "volcanic-isle", "mystic-grove",
  "desert-basin", "tidal-coast", "aurora-ridge", "deep-hollow",
];

const NAME_PREFIXES = [
  "Agent", "Trainer", "Scout", "Hunter", "Ranger",
  "Elite", "Ace", "Cipher", "Vector", "Proxy",
];

const NAME_SUFFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
  "Zeta", "Theta", "Iota", "Kappa", "Lambda",
  "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi",
];

const MONSTER_POOL = Array.from({ length: 94 }, (_, i) => ({
  id: i + 1,
  name: `MON-${String(i + 1).padStart(3, "0")}`,
  type: TYPES[i % TYPES.length],
  baseStats: {
    hp: 40 + Math.floor((i * 7) % 60),
    atk: 30 + Math.floor((i * 11) % 70),
    def: 30 + Math.floor((i * 13) % 60),
    spd: 25 + Math.floor((i * 17) % 75),
    spAtk: 30 + Math.floor((i * 19) % 70),
    spDef: 30 + Math.floor((i * 23) % 60),
  },
}));

class SeededRandom {
  constructor(seed) {
    this.state = seed;
  }

  next() {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  range(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  sample(arr, count) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < Math.min(count, copy.length); i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
}

function generateTrainer(rng, tier) {
  const name = `${rng.pick(NAME_PREFIXES)}-${rng.pick(NAME_SUFFIXES)}-${rng.range(100, 999)}`;
  const id = crypto.randomBytes(16).toString("hex");

  const tierConfig = {
    bronze: { teamSize: [1, 3], levelRange: [5, 20], badges: [0, 3] },
    silver: { teamSize: [3, 5], levelRange: [20, 40], badges: [4, 7] },
    gold: { teamSize: [5, 6], levelRange: [40, 60], badges: [8, 11] },
    champion: { teamSize: [6, 6], levelRange: [55, 75], badges: [12, 12] },
  };

  const config = tierConfig[tier] || tierConfig.bronze;
  const teamSize = rng.range(config.teamSize[0], config.teamSize[1]);
  const strategy = rng.pick(STRATEGIES);
  const startZone = rng.pick(ZONES);
  const badges = rng.range(config.badges[0], config.badges[1]);

  let favoredType = null;
  if (strategy === "type-specialist") {
    favoredType = rng.pick(TYPES);
  }

  const team = rng.sample(MONSTER_POOL, teamSize).map((monster) => {
    const level = rng.range(config.levelRange[0], config.levelRange[1]);
    const ivSpread = {
      hp: rng.range(0, 31),
      atk: rng.range(0, 31),
      def: rng.range(0, 31),
      spd: rng.range(0, 31),
      spAtk: rng.range(0, 31),
      spDef: rng.range(0, 31),
    };

    return {
      monsterId: monster.id,
      name: monster.name,
      type: monster.type,
      level,
      ivs: ivSpread,
      moves: generateMoves(rng, monster.type, level),
    };
  });

  return {
    id,
    name,
    strategy,
    favoredType,
    tier,
    badges,
    startZone,
    team,
    config: {
      captureThreshold: rng.range(20, 50) / 100,
      healThreshold: rng.range(15, 40) / 100,
      fleeThreshold: rng.range(5, 20) / 100,
      explorationWeight: rng.range(30, 80) / 100,
      gymChallengeMinLevel: config.levelRange[0] + rng.range(5, 15),
    },
  };
}

function generateMoves(rng, type, level) {
  const moveCount = level < 15 ? 2 : level < 30 ? 3 : 4;
  const moves = [];

  moves.push({
    name: `${type}-strike`,
    type,
    power: rng.range(40, 80),
    accuracy: rng.range(85, 100),
    pp: rng.range(15, 30),
  });

  for (let i = 1; i < moveCount; i++) {
    const moveType = rng.next() > 0.5 ? type : rng.pick(TYPES);
    moves.push({
      name: `${moveType.toLowerCase()}-move-${rng.range(1, 20)}`,
      type: moveType,
      power: rng.range(30, 100),
      accuracy: rng.range(70, 100),
      pp: rng.range(10, 35),
    });
  }

  return moves;
}

function main() {
  const args = process.argv.slice(2);
  let count = 50;
  let output = "trainers.json";
  let seed = Date.now();
  let tier = "bronze";

  for (let i = 0; i < args.length; i += 2) {
    switch (args[i]) {
      case "--count":
        count = parseInt(args[i + 1], 10);
        break;
      case "--output":
        output = args[i + 1];
        break;
      case "--seed":
        seed = parseInt(args[i + 1], 10);
        break;
      case "--tier":
        tier = args[i + 1];
        break;
    }
  }

  const rng = new SeededRandom(seed);
  const trainers = [];

  for (let i = 0; i < count; i++) {
    const trainerTier =
      tier === "mixed" ? rng.pick(["bronze", "silver", "gold", "champion"]) : tier;
    trainers.push(generateTrainer(rng, trainerTier));
  }

  const data = {
    generated: new Date().toISOString(),
    seed,
    tier,
    count: trainers.length,
    trainers,
  };

  fs.writeFileSync(output, JSON.stringify(data, null, 2));
  console.log(`Generated ${trainers.length} trainers -> ${output}`);
  console.log(`  Seed: ${seed}`);
  console.log(`  Tier: ${tier}`);

  const strategyCounts = {};
  trainers.forEach((t) => {
    strategyCounts[t.strategy] = (strategyCounts[t.strategy] || 0) + 1;
  });
  console.log("  Strategy distribution:");
  Object.entries(strategyCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, c]) => console.log(`    ${s}: ${c}`));
}

main();