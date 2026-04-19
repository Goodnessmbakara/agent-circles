import * as fs from "fs";
import * as path from "path";
import { config } from "../config.js";

/**
 * File-backed registry: contract ID → display name + keeper opt-in (off-chain).
 * Persisted as `{ version: 1, pools: { "C…": { "name", "keeper_enabled" } } }`.
 * Migrates legacy `["C…", …]` array files.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "registry.json");

const MAX_NAME_LEN = 80;

type PoolEntry = { name: string; keeper_enabled: boolean };

function loadFromDisk(): Record<string, PoolEntry> {
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const out: Record<string, PoolEntry> = {};
      for (const id of parsed) {
        if (typeof id === "string" && id.length > 0) {
          out[id] = { name: "", keeper_enabled: true };
        }
      }
      return out;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "pools" in parsed &&
      parsed.pools &&
      typeof parsed.pools === "object"
    ) {
      const out: Record<string, PoolEntry> = {};
      for (const [id, meta] of Object.entries(parsed.pools as Record<string, unknown>)) {
        if (typeof id !== "string" || id.length === 0) continue;
        const name =
          meta &&
          typeof meta === "object" &&
          meta !== null &&
          "name" in meta &&
          typeof (meta as { name: unknown }).name === "string"
            ? (meta as { name: string }).name.trim().slice(0, MAX_NAME_LEN)
            : "";
        const keeperEnabled =
          meta &&
          typeof meta === "object" &&
          meta !== null &&
          "keeper_enabled" in meta &&
          typeof (meta as { keeper_enabled: unknown }).keeper_enabled === "boolean"
            ? (meta as { keeper_enabled: boolean }).keeper_enabled
            : true;
        out[id] = { name, keeper_enabled: keeperEnabled };
      }
      return out;
    }
  } catch {
    // missing or invalid file
  }
  return {};
}

function saveToDisk(pools: Record<string, PoolEntry>): void {
  fs.writeFileSync(
    REGISTRY_FILE,
    JSON.stringify({ version: 1, pools }, null, 2),
    "utf-8",
  );
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const pools: Record<string, PoolEntry> = loadFromDisk();

for (const id of config.contractIds.filter(Boolean)) {
  if (!(id in pools)) {
    pools[id] = { name: "", keeper_enabled: true };
  }
}
saveToDisk(pools);

/**
 * @param keeperEnabled — When true (default), the backend keeper may submit `advance_round` for this pool (if `AGENT_SECRET_KEY` is set).
 */
export function register(contractId: string, name = "", keeperEnabled = true): void {
  const trimmed = name.trim().slice(0, MAX_NAME_LEN);
  pools[contractId] = { name: trimmed, keeper_enabled: keeperEnabled };
  saveToDisk(pools);
}

export function unregister(contractId: string): void {
  delete pools[contractId];
  saveToDisk(pools);
}

export function listIds(): string[] {
  return Object.keys(pools);
}

export function has(contractId: string): boolean {
  return contractId in pools;
}

/** User-facing label; empty if unset (UI may fall back to contract id). */
export function getDisplayName(contractId: string): string {
  return pools[contractId]?.name ?? "";
}

/** Whether server automation (keeper) should process this pool. Defaults to true. */
export function isKeeperEnabled(contractId: string): boolean {
  return pools[contractId]?.keeper_enabled !== false;
}
