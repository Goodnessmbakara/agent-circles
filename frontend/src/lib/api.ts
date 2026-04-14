const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.error?.code ?? "unknown",
      json.error?.message ?? "Request failed",
      res.status,
    );
  }

  return json.data as T;
}

// --- Pool endpoints ---

export interface Pool {
  contract_id: string;
  admin: string;
  token: string;
  contribution: number;
  round_period: number;
  start_time: number | null;
  max_members: number;
  manager: string;
  fee_bps: number;
  state: string;
  current_round: number;
  updated_at: number;
}

export interface PoolMember {
  contract_id: string;
  member: string;
  position: number;
}

export interface PoolDetail extends Pool {
  members: PoolMember[];
}

export interface TxBuildResult {
  unsignedXdr: string;
  simulationResult: { minResourceFee: string; transactionData: string };
}

export interface TxSubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger?: number;
  error?: string;
}

export const api = {
  listPools: () => request<Pool[]>("/pools"),
  getPool: (id: string) => request<PoolDetail>(`/pools/${id}`),
  buildCreatePool: (body: Record<string, unknown>) =>
    request<TxBuildResult>("/pools", { method: "POST", body: JSON.stringify(body) }),
  buildJoin: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/join`, { method: "POST", body: JSON.stringify({ member }) }),
  buildContribute: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/contribute`, { method: "POST", body: JSON.stringify({ member }) }),
  buildAdvance: (poolId: string) =>
    request<TxBuildResult>(`/pools/${poolId}/advance`, { method: "POST" }),
  submitTx: (signedXdr: string) =>
    request<TxSubmitResult>("/tx/submit", { method: "POST", body: JSON.stringify({ signed_xdr: signedXdr }) }),
  getTxStatus: (hash: string) =>
    request<{ status: string; ledger?: number }>(`/tx/${hash}`),
  agentChat: (messages: { role: "user" | "assistant"; content: string }[], walletAddress?: string) =>
    request<{ reply: string }>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages, walletAddress }),
      headers: {
        "Content-Type": "application/json",
        ...(walletAddress ? { "x-wallet-address": walletAddress } : {}),
      },
    }),
};
