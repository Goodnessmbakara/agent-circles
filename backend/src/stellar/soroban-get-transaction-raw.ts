import { config } from "../config.js";

/**
 * Poll Soroban `getTransaction` without parsing `resultMetaXdr` / envelope XDR.
 *
 * **Why:** `Server.getTransaction()` runs `parseTransactionInfo()`, which decodes
 * `TransactionMeta` from XDR. Stellar testnet/mainnet can emit **TransactionMeta v4**
 * (union discriminator 4) after Protocol 23; older `stellar-base` XDR only defines v0–v3,
 * causing `TypeError: Bad union switch: 4`. Status and ledger are plain JSON fields — safe.
 *
 * @see https://github.com/stellar/js-stellar-sdk/issues/1185
 */
export type GetTransactionPollStatus = "SUCCESS" | "FAILED" | "NOT_FOUND";

export interface GetTransactionPollResult {
  status: GetTransactionPollStatus;
  ledger?: number;
}

export async function getTransactionPollOnly(hashHex: string): Promise<GetTransactionPollResult> {
  const res = await fetch(config.sorobanRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash: hashHex },
    }),
  });

  if (!res.ok) {
    throw new Error(`Soroban RPC HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as {
    error?: { message?: string; code?: number };
    result?: { status?: string; ledger?: number };
  };

  if (json.error) {
    throw new Error(json.error.message ?? "Soroban getTransaction RPC error");
  }

  const st = json.result?.status?.toUpperCase();
  if (st === "SUCCESS" || st === "FAILED" || st === "NOT_FOUND") {
    return {
      status: st,
      ledger: json.result?.ledger,
    };
  }

  throw new Error(`Unexpected getTransaction result: ${JSON.stringify(json.result)}`);
}
