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

function parseJsonBody(raw: string, status: number, ok: boolean): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new ApiError(
      "empty_response",
      ok
        ? "The server returned an empty response. Try again; if it keeps happening, restart the API or check backend logs."
        : `Request failed (${status}) with an empty body — the API may be down or the connection was cut.`,
      status,
    );
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new ApiError(
      "invalid_json",
      `Expected JSON from the API (${status}). Check that the dev proxy can reach the backend on port 3001.`,
      status,
    );
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const body = options?.body;
  const hasJsonBody = typeof body === "string" && body.length > 0;
  // Do not send application/json with an empty body — fetch throws:
  // "Body cannot be empty when content-type is set to 'application/json'"
  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const raw = await res.text();
  const json = parseJsonBody(raw, res.status, res.ok) as {
    data?: T;
    error?: string | { code?: string; message?: string };
    /** Fastify often puts the useful text here on 404 (e.g. unknown route). */
    message?: string;
  };

  if (!res.ok) {
    const err = json.error;
    const message =
      typeof json.message === "string" && json.message.length > 0
        ? json.message
        : typeof err === "string"
          ? err
          : typeof err?.message === "string"
            ? err.message
            : "Request failed";
    const code =
      typeof err === "object" && err !== null && "code" in err && typeof err.code === "string"
        ? err.code
        : "unknown";
    throw new ApiError(code, message, res.status);
  }

  return json.data as T;
}

// --- Pool endpoints ---

export interface Pool {
  contract_id: string;
  /** Display name from app registry; may be empty. */
  name: string;
  /** Backend keeper may auto-advance rounds when true. */
  keeper_enabled: boolean;
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

export interface DeployUploadResult extends TxBuildResult {
  wasm_hash_hex: string;
  wasm_size: number;
}

export interface DeployCreateResult extends TxBuildResult {
  contract_id: string;
}

export interface TxSubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger?: number;
  error?: string;
}

/** Chat-driven onboarding: buttons rendered under assistant messages. */
export type AgentChatAction =
  | { type: "open_join"; pool_id: string }
  | {
      type: "sign_join";
      pool_id: string;
      unsignedXdr: string;
      simulationResult: TxBuildResult["simulationResult"];
    };

export interface AgentChatResponse {
  reply: string;
  actions: AgentChatAction[];
}

export interface DemoAccount {
  publicKey: string;
  secretKey: string;
  friendbotUrl: string;
  explorerUrl: string;
}

export interface DemoSeedResult {
  accounts: DemoAccount[];
  note: string;
}

export interface DemoRunStep {
  step: string;
  status: "success" | "failed" | "skipped";
  txHash?: string;
  detail?: string;
}

export interface DemoRunResult {
  accounts: DemoAccount[];
  contractId: string;
  steps: DemoRunStep[];
  summary: string;
}

export const api = {
  listPools: () => request<Pool[]>("/pools"),
  getPool: (id: string) => request<PoolDetail>(`/pools/${id}`),
  buildCreatePool: (body: Record<string, unknown>) =>
    request<TxBuildResult>("/pools", { method: "POST", body: JSON.stringify(body) }),
  buildDeployUpload: (source: string) =>
    request<DeployUploadResult>("/pools/deploy/upload", {
      method: "POST",
      body: JSON.stringify({ source }),
    }),
  buildDeployCreate: (body: { source: string; wasm_hash: string; salt: string }) =>
    request<DeployCreateResult>("/pools/deploy/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerPool: (contract_id: string, name?: string, keeper_enabled = true) =>
    request<{ registered: boolean; contract_id: string }>("/pools/register", {
      method: "POST",
      body: JSON.stringify({ contract_id, name: name ?? "", keeper_enabled }),
    }),
  buildJoin: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/join`, { method: "POST", body: JSON.stringify({ member }) }),
  buildContribute: (poolId: string, member: string) =>
    request<TxBuildResult>(`/pools/${poolId}/contribute`, { method: "POST", body: JSON.stringify({ member }) }),
  buildAdvance: (poolId: string) =>
    request<TxBuildResult>(`/pools/${poolId}/advance`, {
      method: "POST",
      body: "{}",
    }),
  submitTx: (signedXdr: string) =>
    request<TxSubmitResult>("/tx/submit", { method: "POST", body: JSON.stringify({ signed_xdr: signedXdr }) }),
  getTxStatus: (hash: string) =>
    request<{ status: string; ledger?: number }>(`/tx/${hash}`),
  agentChat: (messages: { role: "user" | "assistant"; content: string }[], walletAddress?: string) =>
    request<AgentChatResponse>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages, walletAddress }),
      headers: {
        "Content-Type": "application/json",
        ...(walletAddress ? { "x-wallet-address": walletAddress } : {}),
      },
    }),
  /** Empty JSON object — avoids clients that reject POST+JSON content-type with no body. */
  seedDemo: () =>
    request<DemoSeedResult>("/demo/seed", { method: "POST", body: "{}" }),
  runDemo: () =>
    request<DemoRunResult>("/demo/run", { method: "POST", body: "{}" }),

  // --- Ramp endpoints ---
  createOnRamp: (body: { poolId: string; userId: string; amountNGN: number; stellarWalletAddress: string }) =>
    request<{ orderId: string; bankName: string; accountNumber: string; accountName: string; amount: number; expiresAt: string; reference: string }>("/ramp/onramp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createOffRamp: (body: { poolId: string; userId: string; amountUSDC: number; bankCode: string; accountNumber: string; accountName: string }) =>
    request<{ orderId: string; depositAddress: string; memo?: string; amountUSDC: number; estimatedNGN: number; fxRate: number; reference: string }>("/ramp/offramp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRampOrder: (orderId: string) =>
    request<{ orderId: string; status: string; amountCrypto?: number; failureReason?: string }>(`/ramp/order/${orderId}`),
};
