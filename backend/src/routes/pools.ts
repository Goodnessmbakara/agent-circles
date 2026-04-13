import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { buildContractTx } from "../stellar/tx-builder.js";
import { getPoolInfo } from "../stellar/pool-reader.js";
import { config } from "../config.js";
import * as registry from "../store/pool-registry.js";

const CreatePoolSchema = z.object({
  admin: z.string(),
  token: z.string(),
  contribution_amount: z.number().positive(),
  round_period: z.number().positive(),
  max_members: z.number().min(2).max(20),
  manager: z.string(),
  manager_fee_bps: z.number().min(0).max(500),
});

const RegisterSchema = z.object({ contract_id: z.string() });
const JoinPoolSchema = z.object({ member: z.string() });
const ContributeSchema = z.object({ member: z.string() });

export async function poolRoutes(app: FastifyInstance) {
  // List all known pools with live on-chain state
  app.get("/pools", async () => {
    const ids = registry.listIds();
    const pools = await Promise.allSettled(ids.map(getPoolInfo));
    const data = pools
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getPoolInfo>>> =>
        r.status === "fulfilled"
      )
      .map((r) => r.value);
    return { data };
  });

  // Register a newly deployed pool contract ID
  app.post("/pools/register", async (request) => {
    const { contract_id } = RegisterSchema.parse(request.body);
    registry.register(contract_id);
    return { data: { registered: true, contract_id } };
  });

  // Get single pool — live from chain
  app.get<{ Params: { id: string } }>("/pools/:id", async (request, reply) => {
    if (!registry.has(request.params.id)) {
      return reply.status(404).send({
        error: { code: "pool_not_found", message: `Pool ${request.params.id} not found`, details: [] },
        request_id: "",
        timestamp: new Date().toISOString(),
      });
    }
    const pool = await getPoolInfo(request.params.id);
    return { data: pool };
  });

  // Build initialize tx (returns unsigned XDR for client to sign + deploy)
  app.post("/pools", async (request) => {
    const body = CreatePoolSchema.parse(request.body);

    const args: xdr.ScVal[] = [
      new Address(body.admin).toScVal(),
      new Address(body.token).toScVal(),
      nativeToScVal(body.contribution_amount, { type: "i128" }),
      nativeToScVal(body.round_period, { type: "u64" }),
      nativeToScVal(body.max_members, { type: "u32" }),
      new Address(body.manager).toScVal(),
      nativeToScVal(body.manager_fee_bps, { type: "u32" }),
    ];

    const result = await buildContractTx({
      contractId: body.admin, // placeholder; actual contract ID set post-deploy
      method: "initialize",
      args,
      sourceAddress: body.admin,
    });

    return { data: result };
  });

  // Build join tx
  app.post<{ Params: { id: string } }>("/pools/:id/join", async (request) => {
    const body = JoinPoolSchema.parse(request.body);
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "join",
      args: [new Address(body.member).toScVal()],
      sourceAddress: body.member,
    });
    return { data: result };
  });

  // Build contribute tx
  app.post<{ Params: { id: string } }>("/pools/:id/contribute", async (request) => {
    const body = ContributeSchema.parse(request.body);
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "contribute",
      args: [new Address(body.member).toScVal()],
      sourceAddress: body.member,
    });
    return { data: result };
  });

  // Build advance_round tx (agent signs and submits)
  app.post<{ Params: { id: string } }>("/pools/:id/advance", async (request) => {
    if (!config.agentSecretKey) {
      throw Object.assign(new Error("No agent key configured"), { statusCode: 503 });
    }
    const { Keypair } = await import("@stellar/stellar-sdk");
    const agentAddress = Keypair.fromSecret(config.agentSecretKey).publicKey();
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "advance_round",
      args: [],
      sourceAddress: agentAddress,
    });
    return { data: result };
  });

  // Live pool status from chain
  app.get<{ Params: { id: string } }>("/pools/:id/status", async (request) => {
    const pool = await getPoolInfo(request.params.id);
    return { data: pool };
  });
}
