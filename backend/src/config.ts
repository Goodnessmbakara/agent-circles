import "dotenv/config";

export const config = {
  sorobanRpcUrl: env("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
  horizonUrl: env("HORIZON_URL", "https://horizon-testnet.stellar.org"),
  networkPassphrase: env("NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
  contractId: env("CONTRACT_ID", ""),
  agentSecretKey: env("AGENT_SECRET_KEY", ""),
  claudeApiKey: env("CLAUDE_API_KEY", ""),
  port: parseInt(env("PORT", "3001"), 10),
  databaseUrl: env("DATABASE_URL", "./data/agent-circles.db"),
} as const;

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}
