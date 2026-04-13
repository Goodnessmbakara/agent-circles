import { getRpcServer } from "../stellar/client.js";
import * as db from "../db/queries.js";

/**
 * Sync on-chain pool state into SQLite.
 *
 * Full implementation would simulate get_config / get_state / get_members
 * read-only calls and upsert the results. For MVP this refreshes the
 * updated_at timestamp so the keeper knows the pool was checked.
 */
export async function syncPool(contractId: string): Promise<void> {
  try {
    // Confirm the RPC server is reachable before touching DB
    getRpcServer();

    const now = Math.floor(Date.now() / 1000);
    const existing = db.getPool(contractId);
    if (existing) {
      db.upsertPool({ ...existing, updated_at: now });
    }
  } catch (err) {
    console.error(`[indexer] Failed to sync pool ${contractId}:`, err);
  }
}

/** Sync all non-terminal pools in the DB. */
export async function syncAllPools(): Promise<void> {
  const pools = db.listPools();
  for (const pool of pools) {
    if (pool.state !== "completed" && pool.state !== "cancelled") {
      await syncPool(pool.contract_id);
    }
  }
}
