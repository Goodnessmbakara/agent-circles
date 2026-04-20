import fs from "fs/promises";
import path from "path";
import { randomBytes } from "node:crypto";
import {
  Address,
  Keypair,
  TransactionBuilder,
  hash,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import { config } from "../config.js";
import { deriveCustomContractId } from "../stellar/contract-id.js";
import { getRpcServer } from "../stellar/client.js";
import { getPoolInfo } from "../stellar/pool-reader.js";
import { readRoscaWasmBuffer } from "../stellar/rosca-wasm.js";
import {
  buildContractTx,
  buildCreateCustomContractTx,
  buildUploadWasmTx,
} from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import * as registry from "../store/pool-registry.js";

export interface EnsureDemoPoolResult {
  contractId: string;
  didBootstrap: boolean;
}

async function friendbotFund(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    throw new Error(`Friendbot failed (${res.status}) for ${publicKey}`);
  }
}

async function ensureDeployerFunded(kp: Keypair): Promise<void> {
  const server = getRpcServer();
  let funded = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await server.getAccount(kp.publicKey());
      return;
    } catch {
      if (!funded) {
        await friendbotFund(kp.publicKey());
        funded = true;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Deployer account could not be loaded on testnet after Friendbot");
}

async function signAndSubmit(unsignedXdr: string, signer: Keypair): Promise<{ hash: string }> {
  const tx = TransactionBuilder.fromXDR(unsignedXdr, config.networkPassphrase);
  tx.sign(signer);
  const result = await submitSignedTx(tx.toXDR());
  if (result.status === "FAILED") {
    throw new Error(result.error ?? "Transaction failed on chain");
  }
  if (result.status === "PENDING") {
    throw new Error("Transaction still pending after confirmation window");
  }
  return { hash: result.hash };
}

function resolveAutopoolPath(): string {
  const f = config.demoAutopoolFile;
  return path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
}

function parsePersisted(raw: string): { contract_id: string } | null {
  try {
    const o = JSON.parse(raw) as { contract_id?: unknown };
    if (o && typeof o.contract_id === "string" && o.contract_id.length > 0) {
      return { contract_id: o.contract_id };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function loadPersistedContractId(): Promise<string | null> {
  try {
    const raw = await fs.readFile(resolveAutopoolPath(), "utf-8");
    const p = parsePersisted(raw);
    return p?.contract_id ?? null;
  } catch {
    return null;
  }
}

async function savePersistedContractId(contractId: string): Promise<void> {
  const filePath = resolveAutopoolPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify({ contract_id: contractId, updated_at: new Date().toISOString() }, null, 2),
    "utf-8",
  );
}

async function validatePoolForDemo(contractId: string): Promise<void> {
  const pool = await getPoolInfo(contractId);
  if (pool.state !== "Setup") {
    throw new Error(`pool state is ${pool.state}, need Setup`);
  }
  const slots = pool.config.max_members - pool.members.length;
  if (slots < 5) {
    throw new Error(`need ≥5 open member slots, have ${slots}`);
  }
}

async function bootstrapDemoPool(deployer: Keypair): Promise<string> {
  await ensureDeployerFunded(deployer);

  const wasm = await readRoscaWasmBuffer();
  const uploadBuilt = await buildUploadWasmTx({
    sourceAddress: deployer.publicKey(),
    wasm,
  });
  await signAndSubmit(uploadBuilt.unsignedXdr, deployer);

  const wasmHash = hash(wasm);
  const salt = randomBytes(32);
  const contractId = deriveCustomContractId(
    config.networkPassphrase,
    deployer.publicKey(),
    salt,
  );

  const createBuilt = await buildCreateCustomContractTx({
    sourceAddress: deployer.publicKey(),
    wasmHash,
    salt,
  });
  await signAndSubmit(createBuilt.unsignedXdr, deployer);

  await new Promise((r) => setTimeout(r, 2000));

  const token = config.demoAutopoolTokenSac;
  const managerPk = config.agentPublicKey || deployer.publicKey();
  const args: xdr.ScVal[] = [
    new Address(deployer.publicKey()).toScVal(),
    new Address(token).toScVal(),
    nativeToScVal(config.demoAutopoolContribution, { type: "i128" }),
    nativeToScVal(config.demoAutopoolRoundPeriodSec, { type: "u64" }),
    nativeToScVal(config.demoAutopoolMaxMembers, { type: "u32" }),
    new Address(managerPk).toScVal(),
    nativeToScVal(config.demoAutopoolManagerFeeBps, { type: "u32" }),
  ];

  const initBuilt = await buildContractTx({
    contractId,
    method: "initialize",
    args,
    sourceAddress: deployer.publicKey(),
  });
  await signAndSubmit(initBuilt.unsignedXdr, deployer);

  await validatePoolForDemo(contractId);
  return contractId;
}

/**
 * Resolves a Setup pool with ≥5 free slots: `DEMO_CONTRACT_ID`, then persisted file, else auto-deploy with `DEMO_DEPLOYER_SECRET_KEY`.
 */
export async function ensureDemoPoolContractId(): Promise<EnsureDemoPoolResult> {
  const explicit = config.demoContractId.trim();
  if (explicit) {
    try {
      await validatePoolForDemo(explicit);
      return { contractId: explicit, didBootstrap: false };
    } catch (e) {
      const inner = e instanceof Error ? e.message : String(e);
      throw Object.assign(
        new Error(
          `DEMO_CONTRACT_ID=${explicit} is not usable for the automated demo (${inner}). Fix the pool on-chain, or unset DEMO_CONTRACT_ID and set DEMO_DEPLOYER_SECRET_KEY for auto-deploy.`,
        ),
        { statusCode: 400 },
      );
    }
  }

  if (!config.demoForceRedeploy) {
    const persisted = await loadPersistedContractId();
    if (persisted) {
      try {
        await validatePoolForDemo(persisted);
        return { contractId: persisted, didBootstrap: false };
      } catch {
        /* stale file — bootstrap below if possible */
      }
    }
  }

  if (!config.demoDeployerSecretKey) {
    throw Object.assign(
      new Error(
        "No demo pool configured: set DEMO_CONTRACT_ID to a Setup pool with ≥5 free slots, or set DEMO_DEPLOYER_SECRET_KEY for automatic deploy (WASM upload → create contract → initialize). Optional: persist id in DEMO_AUTO_POOL_FILE.",
      ),
      { statusCode: 503 },
    );
  }

  let deployer: Keypair;
  try {
    deployer = Keypair.fromSecret(config.demoDeployerSecretKey);
  } catch {
    throw Object.assign(new Error("DEMO_DEPLOYER_SECRET_KEY is not a valid Stellar secret key"), {
      statusCode: 400,
    });
  }

  const contractId = await bootstrapDemoPool(deployer);
  await savePersistedContractId(contractId);
  if (!registry.has(contractId)) {
    registry.register(contractId, "Autopilot demo pool", true);
  }

  return { contractId, didBootstrap: true };
}
