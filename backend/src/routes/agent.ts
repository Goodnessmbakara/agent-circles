import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import * as reminders from "../store/reminder-queue.js";
import { getManagerFees } from "../stellar/pool-reader.js";
import * as registry from "../store/pool-registry.js";
import { runAgentChat } from "../agent/chat-handler.js";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const ChatSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  walletAddress: z.string().optional(),
});

const RemindSchema = z.object({
  contract_id: z.string(),
  member: z.string(),
  remind_at: z.number().int().positive(),
  message: z.string().min(1).max(500),
});

export async function agentRoutes(app: FastifyInstance) {
  // Claude agent chat — agentic loop with tool use
  app.post("/agent/chat", async (request, reply) => {
    const llmReady =
      config.llmProvider === "bedrock"
        ? !!(config.awsAccessKeyId || process.env.AWS_PROFILE || process.env.AWS_ROLE_ARN)
        : !!config.claudeApiKey;

    if (!llmReady) {
      return reply.status(503).send({
        error:
          config.llmProvider === "bedrock"
            ? "AWS credentials not configured. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (or use an IAM role) and LLM_PROVIDER=bedrock"
            : "CLAUDE_API_KEY not configured",
      });
    }

    const body = ChatSchema.parse(request.body);
    const walletAddress =
      body.walletAddress ??
      (typeof request.headers["x-wallet-address"] === "string"
        ? request.headers["x-wallet-address"]
        : undefined);

    const reply_text = await runAgentChat(body.messages, { walletAddress });
    return { reply: reply_text };
  });

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
