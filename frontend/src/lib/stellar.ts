export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function friendbotUrl(address: string): string {
  return `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`;
}

export async function checkAccountExists(address: string): Promise<boolean> {
  try {
    const horizonUrl = "https://horizon-testnet.stellar.org";
    const response = await fetch(`${horizonUrl}/accounts/${address}`);
    return response.ok;
  } catch (e) {
    return false;
  }
}

export async function fundWithFriendbot(address: string): Promise<boolean> {
  try {
    const response = await fetch(friendbotUrl(address));
    return response.ok;
  } catch (e) {
    console.error("Friendbot funding failed:", e);
    return false;
  }
}
