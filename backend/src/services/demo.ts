import { Keypair, nativeToScVal, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { buildContractTx } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import { config } from "../config.js";

export interface DemoAccount {
  publicKey: string;
  secretKey: string; // WARNING: only for demo/testnet
  friendbotUrl: string;
  explorerUrl: string;
}

export interface DemoSeedResult {
  accounts: DemoAccount[];
  note: string;
}

export async function seedDemoAccounts(): Promise<DemoSeedResult> {
  const keypairs = Array.from({ length: 5 }, () => Keypair.random());

  const results = await Promise.allSettled(
    keypairs.map((kp) =>
      fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`).then((res) => {
        if (!res.ok) {
          throw new Error(`Friendbot returned ${res.status} for ${kp.publicKey()}`);
        }
        return res.json();
      }),
    ),
  );

  const accounts: DemoAccount[] = keypairs.map((kp, i) => {
    const result = results[i];
    if (result.status === "rejected") {
      // Include account even if funding failed — caller can see via missing balance
      console.warn(`[demo] Friendbot funding failed for ${kp.publicKey()}: ${result.reason}`);
    }
    return {
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
      friendbotUrl: `https://friendbot.stellar.org?addr=${kp.publicKey()}`,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${kp.publicKey()}`,
    };
  });

  return {
    accounts,
    note: "These are testnet-only accounts. Secret keys are shown for demo purposes only — never share secret keys on mainnet.",
  };
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

/** Build, sign with the given keypair, and submit a contract call. */
async function callContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerKeypair: Keypair,
): Promise<{ txHash: string }> {
  const { unsignedXdr } = await buildContractTx({
    contractId,
    method,
    args,
    sourceAddress: signerKeypair.publicKey(),
  });

  const tx = TransactionBuilder.fromXDR(unsignedXdr, config.networkPassphrase);
  tx.sign(signerKeypair);
  const signedXdr = tx.toXDR();

  const result = await submitSignedTx(signedXdr);
  if (result.status === "FAILED") {
    throw new Error(result.error ?? "Transaction failed on chain");
  }
  return { txHash: result.hash };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runFullDemo(): Promise<DemoRunResult> {
  const contractId = config.demoContractId;
  const steps: DemoRunStep[] = [];

  // Step 1: Fund 5 accounts via Friendbot
  const { accounts } = await seedDemoAccounts();

  steps.push({
    step: "fund_accounts",
    status: "success",
    detail: `Funded ${accounts.length} accounts via Friendbot`,
  });

  await sleep(500);

  // Steps 2–6: Each account joins the pool
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const stepName = `join_member_${i}`;
    try {
      const keypair = Keypair.fromSecret(account.secretKey);
      const addressArg = nativeToScVal(keypair.publicKey(), { type: "address" });
      const { txHash } = await callContract(contractId, "join", [addressArg], keypair);
      steps.push({ step: stepName, status: "success", txHash, detail: `Member ${i} joined` });
    } catch (err) {
      steps.push({
        step: stepName,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(500);
  }

  // Steps 7–11: Each account contributes to round 1
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const stepName = `contribute_member_${i}`;
    try {
      const keypair = Keypair.fromSecret(account.secretKey);
      const addressArg = nativeToScVal(keypair.publicKey(), { type: "address" });
      const { txHash } = await callContract(contractId, "contribute", [addressArg], keypair);
      steps.push({ step: stepName, status: "success", txHash, detail: `Member ${i} contributed` });
    } catch (err) {
      steps.push({
        step: stepName,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(500);
  }

  // Step 12: Advance the round (payout to member at position 0)
  {
    const stepName = "advance_round";
    try {
      const callerKeypair = Keypair.fromSecret(accounts[0].secretKey);
      const { txHash } = await callContract(contractId, "advance_round", [], callerKeypair);
      steps.push({
        step: stepName,
        status: "success",
        txHash,
        detail: "Round advanced — payout sent to member at position 0",
      });
    } catch (err) {
      steps.push({
        step: stepName,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successCount = steps.filter((s) => s.status === "success").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;
  const summary = `Demo completed: ${successCount} steps succeeded, ${failedCount} failed.`;

  return { accounts, contractId, steps, summary };
}
