import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Address, hash, nativeToScVal, StrKey, xdr } from "@stellar/stellar-sdk";
import { deriveCustomContractId } from "../stellar/contract-id.js";
import { readRoscaWasmBuffer } from "../stellar/rosca-wasm.js";
import { buildContractTx, buildCreateCustomContractTx, buildUploadWasmTx } from "../stellar/tx-builder.js";
import { poolInfoToApi } from "../stellar/pool-api.js";
import { getPoolInfo } from "../stellar/pool-reader.js";
import { config } from "../config.js";
import * as registry from "../store/pool-registry.js";

const CreatePoolSchema = z.object({
  /** Deployed `rosca_pool` WASM instance (StrKey contract `C…`). */
  contract_id: z.string().refine((id) => StrKey.isValidContract(id), {
    message:
      "Must be a Soroban contract ID (starts with C). Use “Deploy pool contract” in the app or paste a valid C… ID — not your wallet address (G…).",
  }),
  admin: z.string(),
  /** Soroban token contract; omitted = backend uses DEFAULT_TOKEN_CONTRACT (testnet USDC). */
  token: z.string().optional(),
  contribution_amount: z.number().positive(),
  round_period: z.number().positive(),
  max_members: z.number().min(2).max(100),
  manager: z.string(),
  manager_fee_bps: z.number().min(0).max(500),
});

const RegisterSchema = z.object({
  contract_id: z.string(),
  name: z.string().max(80).optional(),
  /** When false, backend keeper skips this pool for automated `advance_round`. */
  keeper_enabled: z.boolean().optional(),
});
const JoinPoolSchema = z.object({ member: z.string() });
const ContributeSchema = z.object({ member: z.string() });

const DeployUploadSchema = z.object({ source: z.string() });
const DeployCreateSchema = z.object({
  source: z.string(),
  wasm_hash: z.string().regex(/^[0-9a-f]{64}$/i, "wasm_hash must be 64 hex chars (SHA-256 of WASM)"),
  salt: z.string().regex(/^[0-9a-f]{64}$/i, "salt must be 64 hex chars (32 bytes)"),
});

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

export async function poolRoutes(app: FastifyInstance) {
  // List all known pools with live on-chain state
  app.get("/pools", async () => {
    const ids = registry.listIds();
    const pools = await Promise.allSettled(ids.map(getPoolInfo));
    const data = pools
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getPoolInfo>>> =>
        r.status === "fulfilled"
      )
      .map((r) =>
        poolInfoToApi(
          r.value,
          registry.getDisplayName(r.value.contract_id),
          registry.isKeeperEnabled(r.value.contract_id),
        ),
      );
    return { data };
  });

  // --- Deploy pool WASM (two user-signed txs: upload, then create) — register before /pools/:id

  app.post("/pools/deploy/upload", async (request) => {
    const { source } = DeployUploadSchema.parse(request.body);
    const wasm = await readRoscaWasmBuffer();
    const built = await buildUploadWasmTx({ sourceAddress: source, wasm });
    return {
      data: {
        unsignedXdr: built.unsignedXdr,
        simulationResult: built.simulationResult,
        wasm_hash_hex: built.wasmHash.toString("hex"),
        wasm_size: wasm.length,
      },
    };
  });

  app.post("/pools/deploy/create", async (request) => {
    const body = DeployCreateSchema.parse(request.body);
    const wasm = await readRoscaWasmBuffer();
    const wasmHash = hash(wasm);
    const reqHash = hexToBuffer(body.wasm_hash.toLowerCase());
    if (!reqHash.equals(wasmHash)) {
      throw Object.assign(
        new Error(
          "wasm_hash does not match the WASM file on the server. Run upload deploy again, then create in the same session.",
        ),
        { statusCode: 400 },
      );
    }
    const salt = hexToBuffer(body.salt.toLowerCase());
    const contractId = deriveCustomContractId(config.networkPassphrase, body.source, salt);
    const built = await buildCreateCustomContractTx({
      sourceAddress: body.source,
      wasmHash,
      salt,
    });
    return {
      data: {
        unsignedXdr: built.unsignedXdr,
        simulationResult: built.simulationResult,
        contract_id: contractId,
      },
    };
  });

  // Register a newly deployed pool contract ID
  app.post("/pools/register", async (request) => {
    const { contract_id, name, keeper_enabled } = RegisterSchema.parse(request.body);
    registry.register(contract_id, name, keeper_enabled ?? true);
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
    return {
      data: poolInfoToApi(
        pool,
        registry.getDisplayName(request.params.id),
        registry.isKeeperEnabled(request.params.id),
      ),
    };
  });

  // Build initialize tx (returns unsigned XDR for client to sign + deploy)
  app.post("/pools", async (request) => {
    const body = CreatePoolSchema.parse(request.body);
    const token = body.token ?? config.defaultTokenContract;

    const args: xdr.ScVal[] = [
      new Address(body.admin).toScVal(),
      new Address(token).toScVal(),
      nativeToScVal(body.contribution_amount, { type: "i128" }),
      nativeToScVal(body.round_period, { type: "u64" }),
      nativeToScVal(body.max_members, { type: "u32" }),
      new Address(body.manager).toScVal(),
      nativeToScVal(body.manager_fee_bps, { type: "u32" }),
    ];

    const result = await buildContractTx({
      contractId: body.contract_id,
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
    return {
      data: poolInfoToApi(
        pool,
        registry.getDisplayName(request.params.id),
        registry.isKeeperEnabled(request.params.id),
      ),
    };
  });
}
