import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import * as reminders from "../store/reminder-queue.js";
import { getManagerFees } from "../stellar/pool-reader.js";
import * as registry from "../store/pool-registry.js";

const RemindSchema = z.object({
  contract_id: z.string(),
  member: z.string(),
  remind_at: z.number().int().positive(),
  message: z.string().min(1).max(500),
});

export async function agentRoutes(app: FastifyInstance) {
  // Schedule a contribution reminder for a member
  app.post("/agent/remind", async (request) => {
    const body = RemindSchema.parse(request.body);
    const reminder = reminders.add(body.contract_id, body.member, body.remind_at, body.message);
    return { data: { scheduled: true, id: reminder.id } };
  });

  // Aggregate fee summary — reads live from each known contract
  app.get("/agent/fee-summary", async () => {
    const agentAddress = config.agentPublicKey;
    const ids = registry.listIds();

    let total = 0n;
    let pools = 0;

    await Promise.allSettled(
      ids.map(async (id) => {
        const fees = await getManagerFees(id);
        if (fees > 0n) {
          total += fees;
          pools++;
        }
      }),
    );

    return { data: { agent_address: agentAddress, total: total.toString(), pools } };
  });
}
