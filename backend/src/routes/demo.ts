import type { FastifyInstance } from "fastify";
import { seedDemoAccounts } from "../services/demo.js";

// Simple in-memory cooldown — reject if seeded within 30 seconds
let lastSeedTime = 0;
const COOLDOWN_MS = 30_000;

export async function demoRoutes(app: FastifyInstance) {
  app.post("/demo/seed", async (_request, reply) => {
    const now = Date.now();
    const elapsed = now - lastSeedTime;

    if (lastSeedTime > 0 && elapsed < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
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
}
