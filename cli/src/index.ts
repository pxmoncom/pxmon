#!/usr/bin/env node

import { Command } from "commander";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const VERSION = "0.2.0";
const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const API_BASE = "https://api.pxmon.com/api/v1";

interface Config {
  rpcUrl: string;
  keypairPath: string;
  apiUrl: string;
}

function loadConfig(): Config {
  const configPath = path.join(os.homedir(), ".pxmon", "config.json");
  const defaults: Config = {
    rpcUrl: DEFAULT_RPC,
    keypairPath: path.join(os.homedir(), ".config", "solana", "id.json"),
    apiUrl: API_BASE,
  };

  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  }

  return defaults;
}

function loadKeypair(keypairPath: string): Keypair {
  if (!fs.existsSync(keypairPath)) {
    console.error(`Keypair not found at ${keypairPath}`);
    console.error("Run: solana-keygen new");
    process.exit(1);
  }
  const raw = fs.readFileSync(keypairPath, "utf-8");
  const secret = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secret);
}

async function apiRequest(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const config = loadConfig();
  const url = `${config.apiUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

function formatTable(rows: string[][]): string {
  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map((row) => (row[i] || "").length))
  );
  return rows
    .map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join("  "))
    .join("\n");
}

const program = new Command();

program
  .name("pxmon")
  .description("PXMON CLI -- interact with the pixel monster world")
  .version(VERSION);

// --- register ---

program
  .command("register")
  .description("Register a new trainer on-chain")
  .argument("<name>", "Trainer display name")
  .option("--keypair <path>", "Path to Solana keypair file")
  .action(async (name: string, opts: { keypair?: string }) => {
    const config = loadConfig();
    const keypairPath = opts.keypair || config.keypairPath;
    const keypair = loadKeypair(keypairPath);
    const address = keypair.publicKey.toBase58();

    console.log(`Registering trainer "${name}"...`);
    console.log(`  Wallet: ${address}`);

    try {
      const result = await apiRequest("POST", "/trainer/register", {
        address,
        name,
      });
      console.log("Registration successful.");
      console.log(`  Trainer ID: ${(result as any).trainerId}`);
      console.log(`  Starter monster assigned. Use 'pxmon status' to view.`);
    } catch (err: any) {
      console.error(`Registration failed: ${err.message}`);
      process.exit(1);
    }
  });

// --- status ---

program
  .command("status")
  .description("View trainer profile and active team")
  .option("--keypair <path>", "Path to Solana keypair file")
  .option("--address <pubkey>", "Look up another trainer by address")
  .action(async (opts: { keypair?: string; address?: string }) => {
    const config = loadConfig();
    let address: string;

    if (opts.address) {
      address = opts.address;
    } else {
      const keypairPath = opts.keypair || config.keypairPath;
      const keypair = loadKeypair(keypairPath);
      address = keypair.publicKey.toBase58();
    }

    try {
      const trainer = (await apiRequest("GET", `/trainer/${address}`)) as any;
      const team = (await apiRequest(
        "GET",
        `/trainer/${address}/team`
      )) as any;
      const badges = (await apiRequest(
        "GET",
        `/trainer/${address}/badges`
      )) as any;

      console.log(`\n  Trainer: ${trainer.name}`);
      console.log(`  Address: ${address}`);
      console.log(`  Level: ${trainer.level}`);
      console.log(`  Badges: ${badges.count}/12`);
      console.log(`  Zone: ${trainer.currentZone}`);
      console.log();

      if (team.monsters && team.monsters.length > 0) {
        console.log("  Active Team:");
        const rows = [["  #", "Name", "Type", "Lv", "HP"]];
        team.monsters.forEach((m: any, i: number) => {
          rows.push([
            `  ${i + 1}`,
            m.name,
            m.type,
            String(m.level),
            `${m.currentHp}/${m.maxHp}`,
          ]);
        });
        console.log(formatTable(rows));
      } else {
        console.log("  No monsters in team.");
      }
      console.log();
    } catch (err: any) {
      console.error(`Failed to fetch status: ${err.message}`);
      process.exit(1);
    }
  });

// --- hunt ---

program
  .command("hunt")
  .description("Search for wild monsters in the current zone")
  .option("--keypair <path>", "Path to Solana keypair file")
  .option("--auto-capture", "Automatically attempt capture on encounter")
  .action(async (opts: { keypair?: string; autoCapture?: boolean }) => {
    const config = loadConfig();
    const keypairPath = opts.keypair || config.keypairPath;
    const keypair = loadKeypair(keypairPath);
    const address = keypair.publicKey.toBase58();

    console.log("Searching for wild monsters...");

    try {
      const result = (await apiRequest("POST", "/battle/wild", {
        address,
      })) as any;

      if (!result.encounter) {
        console.log("No monsters found. Try moving to a different zone.");
        return;
      }

      const mon = result.encounter;
      console.log(`\n  Wild ${mon.name} appeared!`);
      console.log(`  Type: ${mon.type}`);
      console.log(`  Level: ${mon.level}`);
      console.log(`  HP: ${mon.hp}/${mon.maxHp}`);
      console.log(`  Battle ID: ${result.battleId}`);

      if (opts.autoCapture) {
        console.log("\n  Attempting capture...");
        const captureResult = (await apiRequest(
          "POST",
          `/battle/${result.battleId}/move`,
          { address, action: "capture" }
        )) as any;

        if (captureResult.captured) {
          console.log(`  Captured ${mon.name}!`);
        } else {
          console.log(`  Capture failed. ${mon.name} broke free.`);
        }
      } else {
        console.log(
          `\n  Use 'pxmon battle ${result.battleId}' to continue.`
        );
      }
    } catch (err: any) {
      console.error(`Hunt failed: ${err.message}`);
      process.exit(1);
    }
  });

// --- gym ---

program
  .command("gym")
  .description("Challenge a gym leader")
  .argument("<gymId>", "Gym ID (1-12)")
  .option("--keypair <path>", "Path to Solana keypair file")
  .action(async (gymId: string, opts: { keypair?: string }) => {
    const config = loadConfig();
    const keypairPath = opts.keypair || config.keypairPath;
    const keypair = loadKeypair(keypairPath);
    const address = keypair.publicKey.toBase58();
    const id = parseInt(gymId, 10);

    if (id < 1 || id > 12) {
      console.error("Gym ID must be between 1 and 12.");
      process.exit(1);
    }

    console.log(`Challenging Gym #${id}...`);

    try {
      const result = (await apiRequest("POST", `/battle/gym/${id}`, {
        address,
      })) as any;

      console.log(`\n  Gym Leader: ${result.leader.name}`);
      console.log(`  Type Specialty: ${result.leader.type}`);
      console.log(`  Team Size: ${result.leader.teamSize}`);
      console.log(`  Battle ID: ${result.battleId}`);
      console.log(`\n  Battle started. Use move commands to fight.`);
    } catch (err: any) {
      console.error(`Gym challenge failed: ${err.message}`);
      process.exit(1);
    }
  });

// --- heal ---

program
  .command("heal")
  .description("Heal all monsters at the nearest station")
  .option("--keypair <path>", "Path to Solana keypair file")
  .action(async (opts: { keypair?: string }) => {
    const config = loadConfig();
    const keypairPath = opts.keypair || config.keypairPath;
    const keypair = loadKeypair(keypairPath);
    const address = keypair.publicKey.toBase58();

    console.log("Healing team...");

    try {
      const result = (await apiRequest("POST", "/world/heal", {
        address,
      })) as any;

      console.log(`\n  Healed ${result.healed} monsters.`);
      result.team.forEach((m: any) => {
        console.log(`  ${m.name}: ${m.currentHp}/${m.maxHp} HP`);
      });
      console.log(`\n  Transaction: ${result.signature}`);
    } catch (err: any) {
      console.error(`Healing failed: ${err.message}`);
      process.exit(1);
    }
  });

// --- move ---

program
  .command("move")
  .description("Move to an adjacent zone on the world map")
  .argument("<zone>", "Target zone name or ID")
  .option("--keypair <path>", "Path to Solana keypair file")
  .action(async (zone: string, opts: { keypair?: string }) => {
    const config = loadConfig();
    const keypairPath = opts.keypair || config.keypairPath;
    const keypair = loadKeypair(keypairPath);
    const address = keypair.publicKey.toBase58();

    console.log(`Moving to zone ${zone}...`);

    try {
      const result = (await apiRequest("POST", "/world/move", {
        address,
        targetZone: zone,
      })) as any;

      console.log(`\n  Arrived at: ${result.zone.name}`);
      console.log(`  Terrain: ${result.zone.terrain}`);
      console.log(`  Wild monster level range: ${result.zone.levelRange}`);
      console.log(`  Encounter rate: ${result.zone.encounterRate}`);

      if (result.zone.hasGym) {
        console.log(`  Gym available: Gym #${result.zone.gymId}`);
      }
      if (result.zone.hasHealStation) {
        console.log(`  Heal station available.`);
      }

      console.log(`\n  Adjacent zones: ${result.zone.adjacent.join(", ")}`);
      console.log(`  Transaction: ${result.signature}`);
    } catch (err: any) {
      console.error(`Move failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();