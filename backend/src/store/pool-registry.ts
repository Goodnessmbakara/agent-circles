import { config } from "../config.js";

/**
 * In-memory registry of known pool contract IDs.
 *
 * Seeded from CONTRACT_IDS env var (comma-separated).
 * Updated at runtime via register() when new pools are deployed.
 */
const registry = new Set<string>(
  config.contractIds.filter(Boolean),
);

export function register(contractId: string): void {
  registry.add(contractId);
}

export function unregister(contractId: string): void {
  registry.delete(contractId);
}

export function listIds(): string[] {
  return [...registry];
}

export function has(contractId: string): boolean {
  return registry.has(contractId);
}
