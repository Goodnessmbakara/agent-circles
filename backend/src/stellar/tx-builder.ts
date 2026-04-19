import {
  Address,
  Contract,
  hash,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";
import { getRpcServer } from "./client.js";
import { config } from "../config.js";

const TIMEOUT_SEC = 30;

export interface BuildTxParams {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  sourceAddress: string;
}

export interface BuildTxResult {
  unsignedXdr: string;
  simulationResult: {
    minResourceFee: string;
    transactionData: string;
  };
}

export async function buildContractTx(params: BuildTxParams): Promise<BuildTxResult> {
  const server = getRpcServer();
  let account;
  try {
    account = await server.getAccount(params.sourceAddress);
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/Account not found|Not Found/i.test(raw)) {
      const fb = `https://friendbot.stellar.org?addr=${encodeURIComponent(params.sourceAddress)}`;
      throw Object.assign(
        new Error(
          `Wallet account is not on this network yet (not funded). On Stellar testnet, fund it with free XLM from Friendbot, wait a few seconds, then retry: ${fb}`,
        ),
        { statusCode: 400, code: "account_not_funded" as const },
      );
    }
    throw e;
  }
  const contract = new Contract(params.contractId);

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(TIMEOUT_SEC)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const assembled = assembleTransaction(tx, simulated);
  const built = assembled.build();

  return {
    unsignedXdr: built.toXDR(),
    simulationResult: {
      minResourceFee: (simulated as Api.SimulateTransactionSuccessResponse).minResourceFee ?? "0",
      transactionData: "",
    },
  };
}

export interface UploadWasmResult extends BuildTxResult {
  wasmHash: Buffer;
}

export async function buildUploadWasmTx(params: {
  sourceAddress: string;
  wasm: Buffer;
}): Promise<UploadWasmResult> {
  const server = getRpcServer();
  const wasmHash = hash(params.wasm);
  let account;
  try {
    account = await server.getAccount(params.sourceAddress);
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/Account not found|Not Found/i.test(raw)) {
      const fb = `https://friendbot.stellar.org?addr=${encodeURIComponent(params.sourceAddress)}`;
      throw Object.assign(
        new Error(
          `Wallet account is not on this network yet (not funded). On Stellar testnet, fund it with free XLM from Friendbot, wait a few seconds, then retry: ${fb}`,
        ),
        { statusCode: 400, code: "account_not_funded" as const },
      );
    }
    throw e;
  }

  const op = Operation.uploadContractWasm({ wasm: params.wasm });
  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(TIMEOUT_SEC)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const assembled = assembleTransaction(tx, simulated);
  const built = assembled.build();

  return {
    unsignedXdr: built.toXDR(),
    wasmHash,
    simulationResult: {
      minResourceFee: (simulated as Api.SimulateTransactionSuccessResponse).minResourceFee ?? "0",
      transactionData: "",
    },
  };
}

export async function buildCreateCustomContractTx(params: {
  sourceAddress: string;
  wasmHash: Buffer;
  salt: Buffer;
}): Promise<BuildTxResult> {
  const server = getRpcServer();
  let account;
  try {
    account = await server.getAccount(params.sourceAddress);
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/Account not found|Not Found/i.test(raw)) {
      const fb = `https://friendbot.stellar.org?addr=${encodeURIComponent(params.sourceAddress)}`;
      throw Object.assign(
        new Error(
          `Wallet account is not on this network yet (not funded). On Stellar testnet, fund it with free XLM from Friendbot, wait a few seconds, then retry: ${fb}`,
        ),
        { statusCode: 400, code: "account_not_funded" as const },
      );
    }
    throw e;
  }

  const op = Operation.createCustomContract({
    address: Address.fromString(params.sourceAddress),
    wasmHash: params.wasmHash,
    salt: params.salt,
    constructorArgs: [],
  });

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(TIMEOUT_SEC)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const assembled = assembleTransaction(tx, simulated);
  const built = assembled.build();

  return {
    unsignedXdr: built.toXDR(),
    simulationResult: {
      minResourceFee: (simulated as Api.SimulateTransactionSuccessResponse).minResourceFee ?? "0",
      transactionData: "",
    },
  };
}

/** Build, sign with agent key, and return signed XDR. Used by keeper. */
export async function buildAndSignWithAgent(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const agentKeypair = Keypair.fromSecret(config.agentSecretKey);
  const result = await buildContractTx({
    contractId,
    method,
    args,
    sourceAddress: agentKeypair.publicKey(),
  });

  const tx = TransactionBuilder.fromXDR(result.unsignedXdr, config.networkPassphrase);
  tx.sign(agentKeypair);

  return tx.toXDR();
}
