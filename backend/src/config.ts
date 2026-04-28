import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { TESTNET_NATIVE_XLM_SAC, TESTNET_USDC_SAC } from "./stellar/testnet-assets.js";

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
   * Bedrock: use an **inference profile** ID for on-demand (not the bare foundation model ID).
   * Example US geo: `us.anthropic.claude-sonnet-4-6`; global: `global.anthropic.claude-sonnet-4-6`.
   * @see https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
   */
  bedrockModelId: env(
    "BEDROCK_MODEL_ID",
    "us.anthropic.claude-sonnet-4-6",
  ),
  /** Lower = faster responses / less verbosity. Typical chat: 256–1024. */
  agentMaxTokens: Math.min(
    4096,
    Math.max(64, parseInt(env("AGENT_MAX_TOKENS", "512"), 10) || 512),
  ),
  port: parseInt(env("PORT", "3001"), 10),
  demoContractId: env("DEMO_CONTRACT_ID", ""),
  /**
   * Funded testnet key: backend can **upload WASM → create contract → initialize** when
   * `DEMO_CONTRACT_ID` is unset and no valid persisted autopool exists.
   */
  demoDeployerSecretKey: env("DEMO_DEPLOYER_SECRET_KEY", ""),
  /** Persisted autopool contract id (JSON). Survives restarts; ignored when `DEMO_FORCE_REDEPLOY=1`. */
  demoAutopoolFile: env("DEMO_AUTO_POOL_FILE", "data/demo_autopool.json"),
  /** When `1`/`true`, skip persisted file and deploy a fresh pool (requires `DEMO_DEPLOYER_SECRET_KEY`). */
  demoForceRedeploy:
    env("DEMO_FORCE_REDEPLOY", "") === "1" || /^true$/i.test(env("DEMO_FORCE_REDEPLOY", "")),
  /**
   * SAC for auto-deployed demo pools. Default: native XLM SAC so Friendbot-funded accounts
   * can pay contributions without USDC trustlines.
   */
  demoAutopoolTokenSac: env("DEMO_AUTO_POOL_TOKEN", TESTNET_NATIVE_XLM_SAC),
  demoAutopoolContribution: parsePositiveInt("DEMO_AUTO_POOL_CONTRIBUTION", 1_000_000),
  demoAutopoolRoundPeriodSec: parsePositiveInt("DEMO_AUTO_POOL_ROUND_PERIOD_SEC", 5),
  demoAutopoolMaxMembers: Math.min(100, Math.max(2, parsePositiveInt("DEMO_AUTO_POOL_MAX_MEMBERS", 5))),
  demoAutopoolManagerFeeBps: Math.min(
    500,
    parseNonNegInt("DEMO_AUTO_POOL_MANAGER_FEE_BPS", 0),
  ),
  /** In-memory rate limits for `/demo/*`. Set to `0` to disable. */
  demoSeedCooldownSec: parseNonNegInt("DEMO_SEED_COOLDOWN_SEC", 0),
  demoRunCooldownSec: parseNonNegInt("DEMO_RUN_COOLDOWN_SEC", 0),
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

  // Partna API
  partnaApiKey: env("PARTNA_API_KEY", ""),
  partnaApiSecret: env("PARTNA_API_SECRET", ""),
  partnaWebhookSecret: env("PARTNA_WEBHOOK_SECRET", ""),
  /** Use sandbox for dev, production for live */
  partnaBaseUrl: env("PARTNA_BASE_URL", "https://api-sandbox.getpartna.com"),
} as const;

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseNonNegInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parsePositiveInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function derivePublicKey(secret: string): string {
  if (!secret) return "";
  try {
    return Keypair.fromSecret(secret).publicKey();
  } catch {
    return "";
  }
}
