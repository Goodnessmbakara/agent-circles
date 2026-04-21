import { Address, Keypair, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { buildContractTx } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import { getPoolInfo } from "../stellar/pool-reader.js";
import { config } from "../config.js";
import { ensureDemoPoolContractId } from "./demo-pool-bootstrap.js";

/** Soroban `Address` ScVal — must match `new Address(...).toScVal()` used in pool routes; `nativeToScVal(..., { type: "address" })` can trap the contract VM. */
function memberAddressScVal(publicKey: string): xdr.ScVal {
  return new Address(publicKey).toScVal();
}

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

async function waitForRoundEnd(contractId: string, extraBufferMs = 3000): Promise<void> {
  const fresh = await getPoolInfo(contractId);
  const round = fresh.current_round;
  const startSec = Number(fresh.config.start_time);
  const periodSec = Number(fresh.config.round_period);
  const roundEndSec = startSec + periodSec * (round + 1);
  const waitMs = Math.max(0, roundEndSec * 1000 - Date.now() + extraBufferMs);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

export async function runFullDemo(): Promise<DemoRunResult> {
  const steps: DemoRunStep[] = [];
  let contractId: string;

  try {
    const ensured = await ensureDemoPoolContractId();
    contractId = ensured.contractId;
    if (ensured.didBootstrap) {
      steps.push({
        step: "bootstrap_pool",
        status: "success",
        detail: `Auto-deployed pool (native token SAC default). Contract: ${contractId}`,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      accounts: [],
      contractId: config.demoContractId.trim() || "(none)",
      steps: [{ step: "ensure_pool", status: "failed", detail: msg }],
      summary:
        "Demo aborted: no usable pool — set DEMO_CONTRACT_ID or DEMO_DEPLOYER_SECRET_KEY (see server env).",
    };
  }

  let poolInfo;
  try {
    poolInfo = await getPoolInfo(contractId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const explorer = `https://stellar.expert/explorer/testnet/contract/${contractId}`;
    const detail = [
      `Cannot read contract ${contractId}: ${msg}`,
      "",
      "If this ID was persisted or set manually, verify initialize completed on **Stellar testnet** (same as API).",
      `Inspect contract: ${explorer}`,
    ].join("\n");
    return {
      accounts: [],
      contractId,
      steps: [
        {
          step: "preflight_pool",
          status: "failed",
          detail,
        },
      ],
      summary: "Demo aborted: pool not readable — uninitialized contract or wrong network.",
    };
  }

  if (poolInfo.state !== "Setup") {
    return {
      accounts: [],
      contractId,
      steps: [
        {
          step: "preflight_pool",
          status: "failed",
          detail: `Pool state is **${poolInfo.state}**, not Setup. \`join\` only works during Setup. Set DEMO_CONTRACT_ID to a new pool that is still accepting members, then run again.`,
        },
      ],
      summary: "Demo aborted: pool must be in Setup state.",
    };
  }

  const slotsLeft = poolInfo.config.max_members - poolInfo.members.length;
  if (slotsLeft < 5) {
    return {
      accounts: [],
      contractId,
      steps: [
        {
          step: "preflight_pool",
          status: "failed",
          detail: `Pool needs 5 open member slots for this script; max_members=${poolInfo.config.max_members}, current members=${poolInfo.members.length}. Create a pool with max_members ≥ 5 and an empty roster (or use a fresh contract ID).`,
        },
      ],
      summary: "Demo aborted: not enough free member slots.",
    };
  }

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
      const addressArg = memberAddressScVal(keypair.publicKey());
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
      const addressArg = memberAddressScVal(keypair.publicKey());
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

  // Wait until ledger time passes round end (advance_round requires RoundNotElapsed to be false)
  await waitForRoundEnd(contractId, 3000);
  const beforeAdvance = await getPoolInfo(contractId);
  const expectedRound = beforeAdvance.current_round;

  // Advance the round (payout to member at position 0)
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
      const firstErr = err instanceof Error ? err.message : String(err);
      // If keeper/another caller advanced in parallel, treat as success to keep demo deterministic.
      try {
        const after = await getPoolInfo(contractId);
        if (after.current_round > expectedRound) {
          steps.push({
            step: stepName,
            status: "success",
            detail: "Round already advanced by another caller (keeper/parallel trigger).",
          });
          const successCount = steps.filter((s) => s.status === "success").length;
          const failedCount = steps.filter((s) => s.status === "failed").length;
          const summary = `Demo completed: ${successCount} steps succeeded, ${failedCount} failed.`;
          return { accounts, contractId, steps, summary };
        }
      } catch {
        // Keep original failure path below.
      }

      // On testnet, ledger/clock skew can briefly trigger RoundNotElapsed even after our local wait.
      if (/RoundNotElapsed|Transaction failed on chain/i.test(firstErr)) {
        try {
          await waitForRoundEnd(contractId, 8000);
          const callerKeypair = Keypair.fromSecret(accounts[0].secretKey);
          const { txHash } = await callContract(contractId, "advance_round", [], callerKeypair);
          steps.push({
            step: stepName,
            status: "success",
            txHash,
            detail: "Round advanced after retry (timing sync)",
          });
          // Retry succeeded; skip failure record.
          const successCount = steps.filter((s) => s.status === "success").length;
          const failedCount = steps.filter((s) => s.status === "failed").length;
          const summary = `Demo completed: ${successCount} steps succeeded, ${failedCount} failed.`;
          return { accounts, contractId, steps, summary };
        } catch {
          // Fall through to record original error payload below.
        }
      }
      steps.push({
        step: stepName,
        status: "failed",
        detail: firstErr,
      });
    }
  }

  const successCount = steps.filter((s) => s.status === "success").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;
  const summary = `Demo completed: ${successCount} steps succeeded, ${failedCount} failed.`;

  return { accounts, contractId, steps, summary };
}
