import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";

export const config = {
  sorobanRpcUrl: env("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
  horizonUrl: env("HORIZON_URL", "https://horizon-testnet.stellar.org"),
  networkPassphrase: env("NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
  /** Comma-separated list of known pool contract IDs. */
  contractIds: env("CONTRACT_IDS", "").split(",").filter(Boolean),
  agentSecretKey: env("AGENT_SECRET_KEY", ""),
  /** Derived from agentSecretKey at startup; empty string if no key configured. */
  agentPublicKey: derivePublicKey(env("AGENT_SECRET_KEY", "")),
  claudeApiKey: env("CLAUDE_API_KEY", ""),
  // AWS Bedrock (alternative to direct Anthropic API)
  llmProvider: env("LLM_PROVIDER", "anthropic") as "anthropic" | "bedrock",
  awsRegion: env("AWS_REGION", "us-east-1"),
  awsAccessKeyId: env("AWS_ACCESS_KEY_ID", ""),
  awsSecretAccessKey: env("AWS_SECRET_ACCESS_KEY", ""),
  port: parseInt(env("PORT", "3001"), 10),
  demoContractId: env("DEMO_CONTRACT_ID", ""),
} as const;

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function derivePublicKey(secret: string): string {
  if (!secret) return "";
  try {
    return Keypair.fromSecret(secret).publicKey();
  } catch {
    return "";
  }
}
