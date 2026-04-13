import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as db from "../db/queries.js";
import { config } from "../config.js";
import { Keypair } from "@stellar/stellar-sdk";

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
    db.addReminder(body.contract_id, body.member, body.remind_at, body.message);
    return { data: { scheduled: true } };
  });

  // Aggregate fee summary for the configured agent address
  app.get("/agent/fee-summary", async () => {
    let agentAddress = "";
    if (config.agentSecretKey) {
      agentAddress = Keypair.fromSecret(config.agentSecretKey).publicKey();
    }
    const summary = db.getAgentFeeSummary(agentAddress);
    return { data: { agent_address: agentAddress, ...summary } };
  });
}
