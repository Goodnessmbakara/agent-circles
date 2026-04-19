import {
  StellarWalletsKit,
  KitEventType,
  Networks,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule, FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";

export { StellarWalletsKit, KitEventType, Networks, FREIGHTER_ID };

let initialized = false;

export function initWalletKit(): void {
  if (initialized) return;
  initialized = true;
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule()],
  });
}

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Free testnet XLM — account must exist on-chain before Soroban can build txs. */
export function friendbotUrl(address: string): string {
  return `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`;
}
