import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { TESTNET_USDC_SAC } from "./stellar/testnet-assets.js";

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
  /**
   * On-demand model ID for the region (not the `us.` / `global.` inference profile ARN).
   * Cross-region profiles can be retired independently; use current IDs from:
   * @see https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
   */
  bedrockModelId: env(
    "BEDROCK_MODEL_ID",
    "anthropic.claude-sonnet-4-6",
  ),
  /** Lower = faster responses / less verbosity. Typical chat: 256–1024. */
  agentMaxTokens: Math.min(
    4096,
    Math.max(64, parseInt(env("AGENT_MAX_TOKENS", "512"), 10) || 512),
  ),
  port: parseInt(env("PORT", "3001"), 10),
  demoContractId: env("DEMO_CONTRACT_ID", ""),
  /**
   * Default Soroban SAC when the client omits `token` on pool create.
   * Defaults to **testnet USDC** (`TESTNET_USDC_SAC`). Override via `DEFAULT_TOKEN_CONTRACT`.
   */
  defaultTokenContract: env("DEFAULT_TOKEN_CONTRACT", TESTNET_USDC_SAC),
  /**
   * Path to `rosca_pool.wasm` for deploy-from-UI (relative to `process.cwd()` unless absolute).
   * Default matches `stellar contract build` output from the repo root.
   */
  roscaPoolWasmPath: env(
    "ROSCA_POOL_WASM_PATH",
    "../target/wasm32-unknown-unknown/release/rosca_pool.wasm",
  ),
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
