import * as fs from "fs";
import * as path from "path";
import { config } from "../config.js";

/**
 * File-backed registry of known pool contract IDs.
 *
 * Seeded from CONTRACT_IDS env var (comma-separated) and from
 * backend/data/registry.json if it exists. Persists every change
 * to registry.json synchronously.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "registry.json");

function loadFromDisk(): string[] {
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
    }
  } catch {
    // File doesn't exist or is malformed — start fresh
  }
  return [];
}

function saveToDisk(ids: Set<string>): void {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify([...ids], null, 2), "utf-8");
}

// Ensure data directory exists on module load
fs.mkdirSync(DATA_DIR, { recursive: true });

// Seed from disk first, then overlay env var entries
const registry = new Set<string>([
  ...loadFromDisk(),
  ...config.contractIds.filter(Boolean),
]);

// Persist initial state (merges env var entries into the file)
saveToDisk(registry);

export function register(contractId: string): void {
  registry.add(contractId);
  saveToDisk(registry);
}

export function unregister(contractId: string): void {
  registry.delete(contractId);
  saveToDisk(registry);
}

export function listIds(): string[] {
  return [...registry];
}

export function has(contractId: string): boolean {
  return registry.has(contractId);
}
