import type { PoolInfo } from "./pool-reader.js";

/**
 * Shape expected by the frontend (`api.Pool` / `PoolDetail`).
 * All numeric fields are JSON-serializable (no BigInt — `JSON.stringify` cannot encode BigInt).
 */
export interface ApiPoolResponse {
  contract_id: string;
  /** Off-chain display name from registry; may be empty. */
  name: string;
  /** Off-chain: whether backend keeper may auto-submit `advance_round` for this pool. */
  keeper_enabled: boolean;
  admin: string;
  token: string;
  /** Per-round contribution in stroops (USDC 7 decimals). */
  contribution: number;
  round_period: number;
  start_time: number | null;
  max_members: number;
  manager: string;
  fee_bps: number;
  state: string;
  current_round: number;
  updated_at: number;
  members: Array<{ contract_id: string; member: string; position: number }>;
}

function normalizeState(state: string): string {
  const s = state.trim();
  const lower = s.toLowerCase();
  if (lower === "setup" || s === "Setup") return "Setup";
  if (lower === "active" || s === "Active") return "Active";
  if (lower === "completed" || s === "Completed") return "Completed";
  if (lower === "cancelled" || s === "Cancelled") return "Cancelled";
  return s;
}

/** Map on-chain pool read model to HTTP JSON (no BigInt, flat fields). */
export function poolInfoToApi(
  pool: PoolInfo,
  displayName = "",
  keeperEnabled = true,
): ApiPoolResponse {
  const cfg = pool.config;
  const contribution = Number(cfg.contribution_amount);
  const roundPeriod = Number(cfg.round_period);
  const start = Number(cfg.start_time);

  const members = pool.members.map((member, position) => ({
    contract_id: pool.contract_id,
    member,
    position,
  }));

  return {
    contract_id: pool.contract_id,
    name: displayName,
    keeper_enabled: keeperEnabled,
    admin: "",
    token: "",
    manager: "",
    contribution,
    round_period: roundPeriod,
    start_time: start === 0 ? null : start,
    max_members: cfg.max_members,
    fee_bps: cfg.manager_fee_bps,
    state: normalizeState(pool.state),
    current_round: pool.current_round,
    updated_at: Math.floor(Date.now() / 1000),
    members,
  };
}
