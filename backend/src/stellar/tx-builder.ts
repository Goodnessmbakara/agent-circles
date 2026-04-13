import {
  Contract,
  Keypair,
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
  const account = await server.getAccount(params.sourceAddress);
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
