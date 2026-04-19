import { buildAndSignWithAgent } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import { getPoolInfo } from "../stellar/pool-reader.js";
import * as registry from "../store/pool-registry.js";
import * as reminders from "../store/reminder-queue.js";
import { config } from "../config.js";

const KEEPER_INTERVAL_MS = 15_000;
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
  await Promise.all([
    advanceEligiblePools(),
    deliverDueReminders(),
  ]);
}

async function advanceEligiblePools(): Promise<void> {
  const ids = registry.listIds();

  for (const contractId of ids) {
    try {
      if (!registry.isKeeperEnabled(contractId)) continue;
      const pool = await getPoolInfo(contractId);
      // Only advance when state is active (advance_round is permissionless; agent pays fees)
      if (pool.state !== "Active") continue;
      if (!config.agentPublicKey || pool.config.manager_fee_bps === undefined) continue;

      await tryAdvanceRound(contractId);
    } catch {
      // Pool may not be reachable — skip silently
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
    } else if (result.status === "FAILED") {
      // Conditions not met (time not elapsed, not all contributed) — expected, not an error
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Simulation failed")) {
      // Contract will reject until conditions are satisfied — expected
      return;
    }
    // Transient network error — exponential backoff
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    return tryAdvanceRound(contractId, attempt + 1);
  }
}

async function deliverDueReminders(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const due = reminders.getDue(now);

  for (const reminder of due) {
    // In production: send push notification, email, or on-chain event
    // For MVP: log to console
    console.log(
      `[keeper] Reminder for ${reminder.member} on pool ${reminder.contractId}: ${reminder.message}`,
    );
    reminders.markDelivered(reminder.id);
  }
}
