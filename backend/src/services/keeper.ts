import { Keypair } from "@stellar/stellar-sdk";
import { buildAndSignWithAgent } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import * as db from "../db/queries.js";
import { config } from "../config.js";

const KEEPER_INTERVAL_MS = 15_000; // check every 15 seconds
const MAX_RETRIES = 3;

let keeperTimer: ReturnType<typeof setInterval> | null = null;

export function startKeeper(): void {
  if (!config.agentSecretKey) {
    console.warn("[keeper] No AGENT_SECRET_KEY set — keeper disabled");
    return;
  }
  console.log("[keeper] Started");
  keeperTimer = setInterval(runKeeperCycle, KEEPER_INTERVAL_MS);
}

export function stopKeeper(): void {
  if (keeperTimer) {
    clearInterval(keeperTimer);
    keeperTimer = null;
    console.log("[keeper] Stopped");
  }
}

async function runKeeperCycle(): Promise<void> {
  const agentAddress = Keypair.fromSecret(config.agentSecretKey).publicKey();
  const pools = db.listPools();

  for (const pool of pools) {
    if (pool.state !== "active") continue;
    if (pool.manager !== agentAddress) continue;

    try {
      await tryAdvanceRound(pool.contract_id);
    } catch (err) {
      console.error(`[keeper] Unhandled error for pool ${pool.contract_id}:`, err);
    }
  }
}

async function tryAdvanceRound(contractId: string, attempt = 0): Promise<void> {
  if (attempt >= MAX_RETRIES) {
    console.error(`[keeper] Max retries reached for pool ${contractId}`);
    return;
  }

  try {
    const signedXdr = await buildAndSignWithAgent(contractId, "advance_round", []);
    const result = await submitSignedTx(signedXdr);

    if (result.status === "SUCCESS") {
      console.log(`[keeper] Advanced round for pool ${contractId}, tx: ${result.hash}`);
      const pool = db.getPool(contractId);
      if (pool) {
        db.recordAgentFee(contractId, pool.current_round, 0, result.hash);
      }
    } else if (result.status === "FAILED") {
      // Contract conditions not yet met (time not elapsed, not all contributed) — not an error
      console.log(`[keeper] advance_round conditions not met for ${contractId}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Simulation failed")) {
      // Expected: contract will reject until conditions are satisfied
      return;
    }
    // Transient network error — exponential backoff
    const delay = 1000 * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
    return tryAdvanceRound(contractId, attempt + 1);
  }
}
