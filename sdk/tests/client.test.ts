import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { PxmonClient } from "../src/client";
import { PROGRAM_ID, SEEDS } from "../src/constants";

describe("PxmonClient", () => {
  let client: PxmonClient;
  let wallet: Keypair;

  beforeEach(() => {
    wallet = Keypair.generate();
    client = new PxmonClient({
      connection: new Connection("http://localhost:8899"),
      wallet,
    });
  });

  describe("constructor", () => {
    it("should create client with default program ID", () => {
      expect(client.programId.equals(PROGRAM_ID)).toBe(true);
    });

    it("should create client with custom program ID", () => {
      const customId = Keypair.generate().publicKey;
      const customClient = new PxmonClient({
        connection: new Connection("http://localhost:8899"),
        wallet,
        programId: customId,
      });
      expect(customClient.programId.equals(customId)).toBe(true);
    });

    it("should use confirmed commitment by default", () => {
      expect(client.commitment).toBe("confirmed");
    });

    it("should accept custom commitment", () => {
      const c = new PxmonClient({
        connection: new Connection("http://localhost:8899"),
        wallet,
        commitment: "finalized",
      });
      expect(c.commitment).toBe("finalized");
    });
  });

  describe("connect static method", () => {
    it("should create a connected client", () => {
      const c = PxmonClient.connect("http://localhost:8899", wallet);
      expect(c).toBeInstanceOf(PxmonClient);
      expect(c.wallet).toBe(wallet);
    });

    it("should accept options", () => {
      const customId = Keypair.generate().publicKey;
      const c = PxmonClient.connect("http://localhost:8899", wallet, {
        programId: customId,
        commitment: "processed",
      });
      expect(c.programId.equals(customId)).toBe(true);
      expect(c.commitment).toBe("processed");
    });
  });

  describe("PDA derivation", () => {
    it("should derive agent PDA deterministically", () => {
      const [pda1, bump1] = client.getAgentPda();
      const [pda2, bump2] = client.getAgentPda();
      expect(pda1.equals(pda2)).toBe(true);
      expect(bump1).toBe(bump2);
    });

    it("should derive different PDAs for different authorities", () => {
      const [pda1] = client.getAgentPda();
      const other = Keypair.generate().publicKey;
      const [pda2] = client.getAgentPda(other);
      expect(pda1.equals(pda2)).toBe(false);
    });

    it("should derive agent PDA from correct seeds", () => {
      const [pda] = client.getAgentPda();
      const [expected] = PublicKey.findProgramAddressSync(
        [SEEDS.AGENT, wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      expect(pda.equals(expected)).toBe(true);
    });

    it("should derive monster PDA with index", () => {
      const [agentPda] = client.getAgentPda();
      const [mon0] = client.getMonsterPda(agentPda, 0);
      const [mon1] = client.getMonsterPda(agentPda, 1);
      expect(mon0.equals(mon1)).toBe(false);
    });

    it("should derive battle PDA from participants", () => {
      const [pda1] = client.getAgentPda();
      const other = Keypair.generate().publicKey;
      const [pda2] = client.getAgentPda(other);
      const [battlePda] = client.getBattlePda(pda1, pda2, 12345);
      expect(battlePda).toBeInstanceOf(PublicKey);
    });

    it("should derive trade PDA", () => {
      const [agentPda] = client.getAgentPda();
      const monsterKey = Keypair.generate().publicKey;
      const [tradePda] = client.getTradePda(agentPda, monsterKey);
      expect(tradePda).toBeInstanceOf(PublicKey);
    });

    it("should derive gym PDA for each gym", () => {
      const pdas = new Set<string>();
      for (let i = 0; i < 8; i++) {
        const [pda] = client.getGymPda(i);
        pdas.add(pda.toBase58());
      }
      expect(pdas.size).toBe(8);
    });

    it("should derive leaderboard PDA", () => {
      const [pda] = client.getLeaderboardPda();
      expect(pda).toBeInstanceOf(PublicKey);
    });
  });

  describe("getBalance", () => {
    it("should be callable", () => {
      expect(typeof client.getBalance).toBe("function");
    });
  });

  describe("ping", () => {
    it("should return false for unreachable endpoint", async () => {
      const badClient = PxmonClient.connect(
        "http://localhost:1",
        wallet
      );
      const result = await badClient.ping();
      expect(result).toBe(false);
    });
  });

  describe("instruction methods exist", () => {
    it("should have registerAgent", () => {
      expect(typeof client.registerAgent).toBe("function");
    });

    it("should have catchMonster", () => {
      expect(typeof client.catchMonster).toBe("function");
    });

    it("should have initBattle", () => {
      expect(typeof client.initBattle).toBe("function");
    });

    it("should have submitBattleMove", () => {
      expect(typeof client.submitBattleMove).toBe("function");
    });

    it("should have gymChallenge", () => {
      expect(typeof client.gymChallenge).toBe("function");
    });

    it("should have createTrade", () => {
      expect(typeof client.createTrade).toBe("function");
    });

    it("should have executeTrade", () => {
      expect(typeof client.executeTrade).toBe("function");
    });

    it("should have cancelTrade", () => {
      expect(typeof client.cancelTrade).toBe("function");
    });

    it("should have healMonster", () => {
      expect(typeof client.healMonster).toBe("function");
    });

    it("should have healParty", () => {
      expect(typeof client.healParty).toBe("function");
    });

    it("should have evolveMonster", () => {
      expect(typeof client.evolveMonster).toBe("function");
    });

    it("should have wildEncounter", () => {
      expect(typeof client.wildEncounter).toBe("function");
    });

    it("should have fleeBattle", () => {
      expect(typeof client.fleeBattle).toBe("function");
    });

    it("should have updateStrategy", () => {
      expect(typeof client.updateStrategy).toBe("function");
    });

    it("should have getAgent", () => {
      expect(typeof client.getAgent).toBe("function");
    });

    it("should have getMonster", () => {
      expect(typeof client.getMonster).toBe("function");
    });

    it("should have getBattle", () => {
      expect(typeof client.getBattle).toBe("function");
    });

    it("should have getLeaderboard", () => {
      expect(typeof client.getLeaderboard).toBe("function");
    });

    it("should have getAllAgents", () => {
      expect(typeof client.getAllAgents).toBe("function");
    });

    it("should have getActiveTrades", () => {
      expect(typeof client.getActiveTrades).toBe("function");
    });

    it("should have getActiveBattles", () => {
      expect(typeof client.getActiveBattles).toBe("function");
    });
  });
});