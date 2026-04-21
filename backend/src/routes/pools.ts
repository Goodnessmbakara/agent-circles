import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Address, hash, nativeToScVal, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { deriveCustomContractId } from "../stellar/contract-id.js";
import { getHorizonServer } from "../stellar/client.js";
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
const RecoverPoolsSchema = z.object({
  deployers: z.array(z.string().min(56)).min(1).max(20),
  max_pages_per_deployer: z.number().int().min(1).max(20).optional(),
});

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

function getTxEnvelopeXdr(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const rec = record as Record<string, unknown>;
  const xdr1 = rec.envelope_xdr;
  if (typeof xdr1 === "string" && xdr1.length > 0) return xdr1;
  const xdr2 = rec.envelopeXdr;
  if (typeof xdr2 === "string" && xdr2.length > 0) return xdr2;
  return null;
}

function findRoscaContractsInEnvelope(envelopeXdr: string, expectedWasmHashHex: string): string[] {
  const found = new Set<string>();
  const tx = TransactionBuilder.fromXDR(envelopeXdr, config.networkPassphrase);
  for (const op of tx.operations) {
    if (op.type !== "invokeHostFunction" || !op.func) continue;
    const fn = op.func;
    if (
      fn.switch().name !== "hostFunctionTypeCreateContract" &&
      fn.switch().name !== "hostFunctionTypeCreateContractV2"
    ) {
      continue;
    }

    const createArgs = fn.value() as xdr.CreateContractArgs | xdr.CreateContractArgsV2;
    const executable = createArgs.executable();
    if (executable.switch().name !== "contractExecutableWasm") continue;
    const wasmHashHex = Buffer.from(executable.wasmHash()).toString("hex");
    if (wasmHashHex !== expectedWasmHashHex) continue;

    const preimage = createArgs.contractIdPreimage();
    if (preimage.switch().name !== "contractIdPreimageFromAddress") continue;
    const fromAddress = preimage.fromAddress();
    const deployerAddress = Address.fromScAddress(fromAddress.address()).toString();
    const salt = Buffer.from(fromAddress.salt());
    found.add(deriveCustomContractId(config.networkPassphrase, deployerAddress, salt));
  }
  return [...found];
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

  /**
   * Recover pools by scanning Horizon transactions for deployer account(s), detecting
   * `createContract` host functions that use this backend's `rosca_pool.wasm` hash.
   */
  app.post("/pools/recover", async (request) => {
    const body = RecoverPoolsSchema.parse(request.body);
    const maxPages = body.max_pages_per_deployer ?? 5;
    const horizon = getHorizonServer();
    const wasmHashHex = hash(await readRoscaWasmBuffer()).toString("hex");

    const recovered = new Set<string>();
    const invalid: Array<{ contract_id: string; reason: string }> = [];

    for (const deployer of body.deployers) {
      let page = await horizon.transactions().forAccount(deployer).order("desc").limit(200).call();

      for (let i = 0; i < maxPages; i++) {
        const records = page?.records ?? [];
        for (const rec of records) {
          const envelopeXdr = getTxEnvelopeXdr(rec);
          if (!envelopeXdr) continue;
          try {
            const ids = findRoscaContractsInEnvelope(envelopeXdr, wasmHashHex);
            for (const id of ids) recovered.add(id);
          } catch {
            // Skip malformed / unsupported tx envelopes.
          }
        }
        if (i === maxPages - 1) break;
        page = await page.next();
      }
    }

    let registered = 0;
    const validRecovered: string[] = [];
    for (const contractId of recovered) {
      try {
        await getPoolInfo(contractId);
        if (!registry.has(contractId)) {
          registry.register(contractId, "", true);
          registered += 1;
        }
        validRecovered.push(contractId);
      } catch (e) {
        invalid.push({
          contract_id: contractId,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return {
      data: {
        scanned_deployers: body.deployers.length,
        recovered_contract_ids: validRecovered,
        recovered_count: validRecovered.length,
        newly_registered_count: registered,
        invalid_contracts: invalid,
      },
    };
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
