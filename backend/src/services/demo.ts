import { Keypair } from "@stellar/stellar-sdk";

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
