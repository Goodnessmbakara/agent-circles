import { Horizon } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { config } from "../config.js";

let rpcServer: Server | null = null;
let horizonServer: Horizon.Server | null = null;

export function getRpcServer(): Server {
  if (!rpcServer) {
    rpcServer = new Server(config.sorobanRpcUrl);
  }
  return rpcServer;
}

export function getHorizonServer(): Horizon.Server {
  if (!horizonServer) {
    horizonServer = new Horizon.Server(config.horizonUrl);
  }
  return horizonServer;
}
