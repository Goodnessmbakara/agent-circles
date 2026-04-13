import { TransactionBuilder } from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/rpc";
import { getRpcServer } from "./client.js";
import { config } from "../config.js";

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
    return { hash, status: "FAILED", error: String(sendResponse.errorResult) };
  }

  // Poll for ledger confirmation
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const getResponse = await server.getTransaction(hash);

    if (getResponse.status === Api.GetTransactionStatus.SUCCESS) {
      return { hash, status: "SUCCESS", ledger: getResponse.ledger };
    }

    if (getResponse.status === Api.GetTransactionStatus.FAILED) {
      return { hash, status: "FAILED", error: "Transaction failed on chain" };
    }
  }

  return { hash, status: "PENDING" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
