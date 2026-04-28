import { getRpcServer } from "./stellar/client.js";
import { config } from "./config.js";

async function check() {
  const address = "GAY2YX7LKJP7TTDILN2EZRD56EQKOB57VYS44OZY6P4C53UGNX6AL7Z5";
  const server = getRpcServer();
  console.log("Checking account on RPC:", config.sorobanRpcUrl);
  try {
    const account = await server.getAccount(address);
    console.log("Account found! Sequence:", account.sequenceNumber());
  } catch (e) {
    console.error("Account NOT found on RPC:", e);
  }
}

check();
