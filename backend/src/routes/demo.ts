import type { FastifyInstance } from "fastify";
import { seedDemoAccounts, runFullDemo } from "../services/demo.js";
import { config } from "../config.js";

// Simple in-memory cooldown — reject if seeded within 30 seconds
let lastSeedTime = 0;
const SEED_COOLDOWN_MS = 30_000;

// Separate cooldown for the full demo run — 60 seconds
let lastRunTime = 0;
const RUN_COOLDOWN_MS = 60_000;

export async function demoRoutes(app: FastifyInstance) {
  app.post("/demo/seed", async (_request, reply) => {
    const now = Date.now();
    const elapsed = now - lastSeedTime;

    if (lastSeedTime > 0 && elapsed < SEED_COOLDOWN_MS) {
      const retryAfter = Math.ceil((SEED_COOLDOWN_MS - elapsed) / 1000);
      reply.header("Retry-After", String(retryAfter));
      return reply.status(429).send({
        error: {
          code: "rate_limited",
          message: `Demo seed is on cooldown. Retry after ${retryAfter} second(s).`,
          details: [],
        },
        request_id: "",
        timestamp: new Date().toISOString(),
      });
    }

    lastSeedTime = now;
    const result = await seedDemoAccounts();
    return { data: result };
  });

  app.post("/demo/run", async (_request, reply) => {
    // Guard: require DEMO_CONTRACT_ID
    if (!config.demoContractId) {
      return reply.status(503).send({
        error: {
          code: "demo_contract_not_configured",
          message:
            "Demo contract not deployed yet. Set DEMO_CONTRACT_ID in .env after running: stellar contract deploy",
          details: [],
        },
        request_id: "",
        timestamp: new Date().toISOString(),
      });
    }

    // Cooldown check
    const now = Date.now();
    const elapsed = now - lastRunTime;

    if (lastRunTime > 0 && elapsed < RUN_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RUN_COOLDOWN_MS - elapsed) / 1000);
      reply.header("Retry-After", String(retryAfter));
      return reply.status(429).send({
        error: {
          code: "rate_limited",
          message: `Demo run is on cooldown. Retry after ${retryAfter} second(s).`,
          details: [],
        },
        request_id: "",
        timestamp: new Date().toISOString(),
      });
    }

    lastRunTime = now;
    const result = await runFullDemo();
    return { data: result };
  });
}
