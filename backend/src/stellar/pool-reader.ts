import {
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/rpc";
import { getRpcServer } from "./client.js";
import { config } from "../config.js";

export interface PoolConfig {
  contribution_amount: bigint;
  round_period: bigint;
  start_time: bigint;
  max_members: number;
  manager_fee_bps: number;
}

export interface PoolInfo {
  contract_id: string;
  config: PoolConfig;
  state: string;
  current_round: number;
  members: string[];
  manager_fees: bigint;
}

/** Simulate a read-only contract call and return the decoded ScVal. */
async function readContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<unknown> {
  const server = getRpcServer();
  const contract = new Contract(contractId);

  // Use a throw-away source account for simulation (no auth needed for reads)
  const sourceAccount = await server.getAccount(
    config.agentPublicKey || "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
  );

  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(10)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (Api.isSimulationError(sim)) {
    throw new Error(`Read failed (${method}): ${sim.error}`);
  }

  const success = sim as Api.SimulateTransactionSuccessResponse;
  if (!success.result) {
    throw new Error(`No result for ${method}`);
  }

  return scValToNative(success.result.retval);
}

export async function getPoolConfig(contractId: string): Promise<PoolConfig> {
  const raw = await readContract(contractId, "get_config") as Record<string, unknown>;
  return {
    contribution_amount: BigInt(raw.contribution_amount as string | number),
    round_period: BigInt(raw.round_period as string | number),
    start_time: BigInt(raw.start_time as string | number),
    max_members: Number(raw.max_members),
    manager_fee_bps: Number(raw.manager_fee_bps),
  };
}

export async function getPoolState(contractId: string): Promise<string> {
  const raw = await readContract(contractId, "get_state");
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "name" in raw && typeof (raw as { name: string }).name === "string") {
    return (raw as { name: string }).name;
  }
  if (raw && typeof raw === "object" && "tag" in raw && typeof (raw as { tag: string }).tag === "string") {
    return (raw as { tag: string }).tag;
  }
  return String(raw);
}

export async function getPoolMembers(contractId: string): Promise<string[]> {
  const raw = await readContract(contractId, "get_members");
  return (raw as unknown[]).map(String);
}

export async function getCurrentRound(contractId: string): Promise<number> {
  return Number(await readContract(contractId, "get_current_round"));
}

export async function getManagerFees(contractId: string): Promise<bigint> {
  return BigInt(await readContract(contractId, "get_manager_fees") as string | number);
}

/** Fetch all pool data in parallel. */
export async function getPoolInfo(contractId: string): Promise<PoolInfo> {
  const [cfg, state, members, round, fees] = await Promise.all([
    getPoolConfig(contractId),
    getPoolState(contractId),
    getPoolMembers(contractId),
    getCurrentRound(contractId),
    getManagerFees(contractId),
  ]);

  return {
    contract_id: contractId,
    config: cfg,
    state,
    current_round: round,
    members,
    manager_fees: fees,
  };
}
