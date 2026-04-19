import { TransactionBuilder } from "@stellar/stellar-sdk";
import { getRpcServer } from "./client.js";
import { config } from "../config.js";
import { getTransactionPollOnly } from "./soroban-get-transaction-raw.js";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export interface SubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger?: number;
  error?: string;
}

export async function submitSignedTx(signedXdr: string): Promise<SubmitResult> {
  const server = getRpcServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const hash = tx.hash().toString("hex");

  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    return { hash, status: "FAILED", error: formatSendError(sendResponse.errorResult) };
  }

  // Poll for ledger confirmation
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const getResponse = await getTransactionPollOnly(hash);

    if (getResponse.status === "SUCCESS") {
      return { hash, status: "SUCCESS", ledger: getResponse.ledger };
    }

    if (getResponse.status === "FAILED") {
      return { hash, status: "FAILED", error: "Transaction failed on chain" };
    }
  }

  return { hash, status: "PENDING" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSendError(e: unknown): string {
  if (e == null) return "Transaction rejected by network";
  if (typeof e === "string") return e;
  try {
    const any = e as { toXDR?: (f: string) => Buffer };
    if (typeof any.toXDR === "function") {
      const out = any.toXDR("base64");
      return typeof out === "string" ? out : out.toString("base64");
    }
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
