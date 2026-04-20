import type { FastifyInstance } from "fastify";
import { seedDemoAccounts, runFullDemo } from "../services/demo.js";
import { config } from "../config.js";

/** In-memory cooldown timestamps (per Fly machine). */
let lastSeedTime = 0;
let lastRunTime = 0;

export async function demoRoutes(app: FastifyInstance) {
  app.post("/demo/seed", async (_request, reply) => {
    const seedMs = config.demoSeedCooldownSec * 1000;
    const now = Date.now();
    const elapsed = now - lastSeedTime;

    if (seedMs > 0 && lastSeedTime > 0 && elapsed < seedMs) {
      const retryAfter = Math.ceil((seedMs - elapsed) / 1000);
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

    const result = await seedDemoAccounts();
    lastSeedTime = Date.now();
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

    const runMs = config.demoRunCooldownSec * 1000;
    const now = Date.now();
    const elapsed = now - lastRunTime;

    if (runMs > 0 && lastRunTime > 0 && elapsed < runMs) {
      const retryAfter = Math.ceil((runMs - elapsed) / 1000);
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

    const result = await runFullDemo();
    // Do not burn cooldown on preflight-only failures (e.g. bad DEMO_CONTRACT_ID) so users can retry immediately after fixing config.
    const onlyPreflightFail =
      result.steps.length === 1 &&
      result.steps[0]?.step === "preflight_pool" &&
      result.steps[0]?.status === "failed";
    if (!onlyPreflightFail) {
      lastRunTime = Date.now();
    }
    return { data: result };
  });
}
