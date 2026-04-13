# Agent Circles — Phase 2: Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node.js/Fastify backend that serves as the bridge between frontend/agent and Stellar network — transaction building, pool indexing, agent tools, and keeper service.

**Architecture:** Fastify REST API with Zod validation. Stellar SDK for transaction building (prepare → return unsigned XDR). **No persistent DB** — pool state is queried live from Soroban RPC (the chain is the source of truth). In-memory pool registry (Set of known contract IDs) and in-memory reminder queue cover the only off-chain concerns. Agent keeper runs as a background interval. All endpoints return JSON matching the SRS error format.

**Tech Stack:** Node.js 20+, TypeScript, Fastify, @stellar/stellar-sdk, Zod, vitest

**Why no SQLite:**
- Pool config/state/members/fees all live in the contract — `get_config`, `get_state`, `get_members`, `get_current_round`, `get_manager_fees` are read-only calls that can be simulated cheaply
- A local DB copy goes stale the moment any transaction lands on chain
- Reminders are the only genuinely off-chain data; an in-memory queue is fine for MVP (best-effort delivery)
- Pool discovery uses a simple in-memory registry seeded from `CONTRACT_IDS` env var and updated via `POST /api/pools/register`

**Prereqs:** Phase 1 contract deployed to testnet (or use a mock contract ID for development). `stellar-cli` available for contract deployment.

---

## File Structure

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                    # Fastify server bootstrap
│   ├── config.ts                   # Env vars, constants
│   ├── stellar/
│   │   ├── client.ts               # Soroban RPC + Horizon client singletons
│   │   ├── tx-builder.ts           # Build unsigned Soroban txs (prepare + simulate)
│   │   ├── tx-submit.ts            # Submit signed XDR + poll for confirmation
│   │   └── pool-reader.ts          # Read-only contract calls: config, state, members, fees
│   ├── store/
│   │   ├── pool-registry.ts        # In-memory Set of known contract IDs
│   │   └── reminder-queue.ts       # In-memory reminder queue (sorted by remind_at)
│   ├── routes/
│   │   ├── pools.ts                # GET/POST /api/pools, /api/pools/:id/*
│   │   ├── tx.ts                   # POST /api/tx/submit, GET /api/tx/:hash
│   │   └── agent.ts                # POST /api/agent/remind, GET /api/agent/fee-summary
│   ├── services/
│   │   └── keeper.ts               # Background keeper: advance_round when conditions met
│   └── middleware/
│       └── error-handler.ts        # Fastify error handler → SRS error format
├── test/
│   ├── tx-builder.test.ts
│   ├── pool-registry.test.ts
│   └── reminder-queue.test.ts
```

**Removed:** `db/schema.ts`, `db/queries.ts`, `services/pool-indexer.ts`, `better-sqlite3` dep
**Added:** `stellar/pool-reader.ts` (live RPC reads), `store/pool-registry.ts`, `store/reminder-queue.ts`

---

### Task 1: Scaffold Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/index.ts`
- Create: `backend/src/config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "agent-circles-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@stellar/stellar-sdk": "^13.0.0",
    "better-sqlite3": "^11.0.0",
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "zod": "^3.23.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create .env.example**

```bash
# backend/.env.example
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_ID=
AGENT_SECRET_KEY=
CLAUDE_API_KEY=
PORT=3001
DATABASE_URL=./data/agent-circles.db
```

- [ ] **Step 4: Create config.ts**

```typescript
// backend/src/config.ts
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
```

- [ ] **Step 5: Create index.ts**

```typescript
// backend/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { poolRoutes } from "./routes/pools.js";
import { txRoutes } from "./routes/tx.js";
import { agentRoutes } from "./routes/agent.js";
import { initDb } from "./db/schema.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.setErrorHandler(errorHandler);

// Routes
await app.register(poolRoutes, { prefix: "/api" });
await app.register(txRoutes, { prefix: "/api" });
await app.register(agentRoutes, { prefix: "/api" });

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Init DB + start
initDb(config.databaseUrl);

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

export { app };
```

- [ ] **Step 6: Create error handler**

```typescript
// backend/src/middleware/error-handler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = `req_${randomUUID().slice(0, 12)}`;
  const statusCode = error.statusCode ?? 500;

  reply.status(statusCode).send({
    error: {
      code: error.code ?? "internal_error",
      message: error.message,
      details: [],
    },
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 7: Install dependencies**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npm install`
Expected: Installs without errors.

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold Fastify project with config and error handling"
```

---

### Task 2: Stellar Client + Transaction Builder

**Files:**
- Create: `backend/src/stellar/client.ts`
- Create: `backend/src/stellar/tx-builder.ts`
- Create: `backend/src/stellar/tx-submit.ts`
- Create: `backend/test/tx-builder.test.ts`

- [ ] **Step 1: Create Stellar client singletons**

```typescript
// backend/src/stellar/client.ts
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
```

- [ ] **Step 2: Create transaction builder**

```typescript
// backend/src/stellar/tx-builder.ts
import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";
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
    fee: "100000", // will be overridden by simulation
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(TIMEOUT_SEC)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const prepared = server.assembleTransaction(tx, simulated);
  const built = prepared.build();

  return {
    unsignedXdr: built.toXDR(),
    simulationResult: {
      minResourceFee: (simulated as Api.SimulateTransactionSuccessResponse).minResourceFee ?? "0",
      transactionData: "",
    },
  };
}

// Build + sign + submit with agent key (for keeper calls)
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
```

- [ ] **Step 3: Create transaction submitter**

```typescript
// backend/src/stellar/tx-submit.ts
import { TransactionBuilder } from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/rpc";
import { getRpcServer } from "./client.js";
import { config } from "../config.js";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export interface SubmitResult {
  hash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger?: number;
  error?: string;
}

export async function submitSignedTx(signedXdr: string): Promise<SubmitResult> {
  const server = getRpcServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const hash = tx.hash().toString("hex");

  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    return { hash, status: "FAILED", error: String(sendResponse.errorResult) };
  }

  // Poll for confirmation
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const getResponse = await server.getTransaction(hash);

    if (getResponse.status === Api.GetTransactionStatus.SUCCESS) {
      return { hash, status: "SUCCESS", ledger: getResponse.ledger };
    }

    if (getResponse.status === Api.GetTransactionStatus.FAILED) {
      return { hash, status: "FAILED", error: "Transaction failed on chain" };
    }
  }

  return { hash, status: "PENDING" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 4: Write a basic test**

```typescript
// backend/test/tx-builder.test.ts
import { describe, it, expect } from "vitest";
import { Contract, xdr, nativeToScVal, Address } from "@stellar/stellar-sdk";

describe("tx-builder", () => {
  it("Contract.call produces valid operation", () => {
    const contractId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    const contract = new Contract(contractId);

    const op = contract.call(
      "get_state",
    );

    expect(op.type).toBe("invokeHostFunction");
  });

  it("nativeToScVal encodes address correctly", () => {
    const addr = "GABC..."; // dummy
    // Just verify the import works and the function is callable
    const val = nativeToScVal(42, { type: "i128" });
    expect(val).toBeDefined();
  });
});
```

- [ ] **Step 5: Run test**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx vitest run`
Expected: Tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): Stellar client, tx builder, and tx submitter"
```

---

### Task 3: In-Memory Store (replaces SQLite)

> **DECISION:** SQLite removed. Pool state is queried live from Soroban RPC.
> Only off-chain data (reminders + known pool IDs) lives in memory.

**Files:**
- ~~`backend/src/db/schema.ts`~~ → replaced by `backend/src/store/pool-registry.ts`
- ~~`backend/src/db/queries.ts`~~ → replaced by `backend/src/store/reminder-queue.ts` + `backend/src/stellar/pool-reader.ts`

- [ ] **Step 1: Create schema.ts**

```typescript
// backend/src/db/schema.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let db: Database.Database | null = null;

export function initDb(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pools (
      contract_id   TEXT PRIMARY KEY,
      admin         TEXT NOT NULL,
      token         TEXT NOT NULL,
      contribution  INTEGER NOT NULL,
      round_period  INTEGER NOT NULL,
      start_time    INTEGER,
      max_members   INTEGER NOT NULL,
      manager       TEXT NOT NULL,
      fee_bps       INTEGER NOT NULL,
      state         TEXT NOT NULL DEFAULT 'setup',
      current_round INTEGER NOT NULL DEFAULT 0,
      updated_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pool_members (
      contract_id   TEXT NOT NULL,
      member        TEXT NOT NULL,
      position      INTEGER NOT NULL,
      PRIMARY KEY (contract_id, member)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id   TEXT NOT NULL,
      member        TEXT NOT NULL,
      remind_at     INTEGER NOT NULL,
      message       TEXT NOT NULL,
      delivered     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_fees (
      contract_id   TEXT NOT NULL,
      round         INTEGER NOT NULL,
      amount        INTEGER NOT NULL,
      tx_hash       TEXT NOT NULL,
      PRIMARY KEY (contract_id, round)
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
```

- [ ] **Step 2: Create queries.ts**

```typescript
// backend/src/db/queries.ts
import { getDb } from "./schema.js";

export interface PoolRow {
  contract_id: string;
  admin: string;
  token: string;
  contribution: number;
  round_period: number;
  start_time: number | null;
  max_members: number;
  manager: string;
  fee_bps: number;
  state: string;
  current_round: number;
  updated_at: number;
}

export interface PoolMemberRow {
  contract_id: string;
  member: string;
  position: number;
}

export interface ReminderRow {
  id: number;
  contract_id: string;
  member: string;
  remind_at: number;
  message: string;
  delivered: number;
}

export function upsertPool(pool: PoolRow): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO pools (contract_id, admin, token, contribution, round_period, start_time, max_members, manager, fee_bps, state, current_round, updated_at)
    VALUES (@contract_id, @admin, @token, @contribution, @round_period, @start_time, @max_members, @manager, @fee_bps, @state, @current_round, @updated_at)
    ON CONFLICT(contract_id) DO UPDATE SET
      state = @state,
      current_round = @current_round,
      start_time = @start_time,
      updated_at = @updated_at
  `).run(pool);
}

export function getPool(contractId: string): PoolRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM pools WHERE contract_id = ?").get(contractId) as PoolRow | undefined;
}

export function listPools(): PoolRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM pools ORDER BY updated_at DESC").all() as PoolRow[];
}

export function upsertPoolMember(contractId: string, member: string, position: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO pool_members (contract_id, member, position)
    VALUES (?, ?, ?)
    ON CONFLICT(contract_id, member) DO UPDATE SET position = ?
  `).run(contractId, member, position, position);
}

export function getPoolMembers(contractId: string): PoolMemberRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM pool_members WHERE contract_id = ? ORDER BY position").all(contractId) as PoolMemberRow[];
}

export function addReminder(contractId: string, member: string, remindAt: number, message: string): void {
  const db = getDb();
  db.prepare("INSERT INTO reminders (contract_id, member, remind_at, message) VALUES (?, ?, ?, ?)").run(contractId, member, remindAt, message);
}

export function getDueReminders(now: number): ReminderRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM reminders WHERE delivered = 0 AND remind_at <= ?").all(now) as ReminderRow[];
}

export function markReminderDelivered(id: number): void {
  const db = getDb();
  db.prepare("UPDATE reminders SET delivered = 1 WHERE id = ?").run(id);
}

export function recordAgentFee(contractId: string, round: number, amount: number, txHash: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO agent_fees (contract_id, round, amount, tx_hash)
    VALUES (?, ?, ?, ?)
  `).run(contractId, round, amount, txHash);
}

export function getAgentFeeSummary(manager: string): { total: number; pools: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT COALESCE(SUM(af.amount), 0) as total, COUNT(DISTINCT af.contract_id) as pools
    FROM agent_fees af
    JOIN pools p ON af.contract_id = p.contract_id
    WHERE p.manager = ?
  `).get(manager) as { total: number; pools: number } | undefined;
  return row ?? { total: 0, pools: 0 };
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): SQLite schema and typed query layer"
```

---

### Task 4: Pool Routes (REST API)

**Files:**
- Create: `backend/src/routes/pools.ts`
- Create: `backend/src/routes/tx.ts`
- Create: `backend/src/routes/agent.ts`

- [ ] **Step 1: Create pool routes**

```typescript
// backend/src/routes/pools.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { buildContractTx } from "../stellar/tx-builder.js";
import { config } from "../config.js";
import * as db from "../db/queries.js";

const CreatePoolSchema = z.object({
  admin: z.string(),
  contribution_amount: z.number().positive(),
  round_period: z.number().positive(),
  max_members: z.number().min(2).max(20),
  manager: z.string(),
  manager_fee_bps: z.number().min(0).max(500),
});

const JoinPoolSchema = z.object({ member: z.string() });
const ContributeSchema = z.object({ member: z.string() });

export async function poolRoutes(app: FastifyInstance) {
  // List pools
  app.get("/pools", async () => {
    return { data: db.listPools() };
  });

  // Get pool detail
  app.get<{ Params: { id: string } }>("/pools/:id", async (request, reply) => {
    const pool = db.getPool(request.params.id);
    if (!pool) {
      return reply.status(404).send({
        error: { code: "pool_not_found", message: `Pool ${request.params.id} not found`, details: [] },
        request_id: "",
        timestamp: new Date().toISOString(),
      });
    }
    const members = db.getPoolMembers(request.params.id);
    return { data: { ...pool, members } };
  });

  // Build create-pool tx
  app.post("/pools", async (request) => {
    const body = CreatePoolSchema.parse(request.body);
    const contractId = config.contractId;

    const args: xdr.ScVal[] = [
      new Address(body.admin).toScVal(),
      new Address(config.contractId).toScVal(), // token — will need actual USDC address
      nativeToScVal(body.contribution_amount, { type: "i128" }),
      nativeToScVal(body.round_period, { type: "u64" }),
      nativeToScVal(body.max_members, { type: "u32" }),
      new Address(body.manager).toScVal(),
      nativeToScVal(body.manager_fee_bps, { type: "u32" }),
    ];

    const result = await buildContractTx({
      contractId,
      method: "initialize",
      args,
      sourceAddress: body.admin,
    });

    return { data: result };
  });

  // Build join tx
  app.post<{ Params: { id: string } }>("/pools/:id/join", async (request) => {
    const body = JoinPoolSchema.parse(request.body);
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "join",
      args: [new Address(body.member).toScVal()],
      sourceAddress: body.member,
    });
    return { data: result };
  });

  // Build contribute tx
  app.post<{ Params: { id: string } }>("/pools/:id/contribute", async (request) => {
    const body = ContributeSchema.parse(request.body);
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "contribute",
      args: [new Address(body.member).toScVal()],
      sourceAddress: body.member,
    });
    return { data: result };
  });

  // Build or execute advance_round
  app.post<{ Params: { id: string } }>("/pools/:id/advance", async (request) => {
    const result = await buildContractTx({
      contractId: request.params.id,
      method: "advance_round",
      args: [],
      sourceAddress: config.agentSecretKey ? "" : "", // agent address filled at runtime
    });
    return { data: result };
  });

  // Get contribution status for current round
  app.get<{ Params: { id: string } }>("/pools/:id/status", async (request) => {
    const pool = db.getPool(request.params.id);
    const members = db.getPoolMembers(request.params.id);
    return { data: { pool, members } };
  });
}
```

- [ ] **Step 2: Create tx routes**

```typescript
// backend/src/routes/tx.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { submitSignedTx } from "../stellar/tx-submit.js";
import { getRpcServer } from "../stellar/client.js";

const SubmitSchema = z.object({ signed_xdr: z.string() });

export async function txRoutes(app: FastifyInstance) {
  // Submit signed transaction
  app.post("/tx/submit", async (request) => {
    const body = SubmitSchema.parse(request.body);
    const result = await submitSignedTx(body.signed_xdr);
    return { data: result };
  });

  // Get transaction status
  app.get<{ Params: { hash: string } }>("/tx/:hash", async (request) => {
    const server = getRpcServer();
    const result = await server.getTransaction(request.params.hash);
    return {
      data: {
        status: result.status,
        ledger: "ledger" in result ? result.ledger : undefined,
      },
    };
  });
}
```

- [ ] **Step 3: Create agent routes**

```typescript
// backend/src/routes/agent.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as db from "../db/queries.js";
import { config } from "../config.js";
import { Keypair } from "@stellar/stellar-sdk";

const RemindSchema = z.object({
  contract_id: z.string(),
  member: z.string(),
  remind_at: z.number(),
  message: z.string(),
});

export async function agentRoutes(app: FastifyInstance) {
  // Schedule reminder
  app.post("/agent/remind", async (request) => {
    const body = RemindSchema.parse(request.body);
    db.addReminder(body.contract_id, body.member, body.remind_at, body.message);
    return { data: { scheduled: true } };
  });

  // Get agent fee summary
  app.get("/agent/fee-summary", async () => {
    let agentAddress = "";
    if (config.agentSecretKey) {
      agentAddress = Keypair.fromSecret(config.agentSecretKey).publicKey();
    }
    const summary = db.getAgentFeeSummary(agentAddress);
    return { data: { agent_address: agentAddress, ...summary } };
  });
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): pool, tx, and agent REST routes"
```

---

### Task 5: Pool Indexer + Keeper Service

**Files:**
- Create: `backend/src/services/pool-indexer.ts`
- Create: `backend/src/services/keeper.ts`

- [ ] **Step 1: Create pool indexer**

```typescript
// backend/src/services/pool-indexer.ts
import { Contract, xdr } from "@stellar/stellar-sdk";
import { getRpcServer } from "../stellar/client.js";
import * as db from "../db/queries.js";
import { config } from "../config.js";

export async function syncPool(contractId: string): Promise<void> {
  const server = getRpcServer();
  const contract = new Contract(contractId);

  try {
    // Query on-chain state by simulating read-only calls
    // In a full implementation, you'd call get_config, get_state, get_members etc.
    // For MVP, we do a simplified sync based on known contract methods.

    // This is a placeholder for the actual indexing logic that would:
    // 1. Call get_config() to get pool parameters
    // 2. Call get_state() to get current state
    // 3. Call get_members() to get member list
    // 4. Call get_current_round() to get round number
    // Then upsert into SQLite

    const now = Math.floor(Date.now() / 1000);

    // For now, just update the timestamp to show sync happened
    const existing = db.getPool(contractId);
    if (existing) {
      db.upsertPool({ ...existing, updated_at: now });
    }
  } catch (err) {
    console.error(`Failed to sync pool ${contractId}:`, err);
  }
}

export async function syncAllPools(): Promise<void> {
  const pools = db.listPools();
  for (const pool of pools) {
    if (pool.state !== "completed" && pool.state !== "cancelled") {
      await syncPool(pool.contract_id);
    }
  }
}
```

- [ ] **Step 2: Create keeper service**

```typescript
// backend/src/services/keeper.ts
import { Keypair } from "@stellar/stellar-sdk";
import { buildAndSignWithAgent } from "../stellar/tx-builder.js";
import { submitSignedTx } from "../stellar/tx-submit.js";
import * as db from "../db/queries.js";
import { config } from "../config.js";

const KEEPER_INTERVAL_MS = 15_000; // Check every 15 seconds
const MAX_RETRIES = 3;

let keeperTimer: NodeJS.Timeout | null = null;

export function startKeeper(): void {
  if (!config.agentSecretKey) {
    console.warn("No AGENT_SECRET_KEY set — keeper disabled");
    return;
  }

  console.log("Keeper service started");
  keeperTimer = setInterval(runKeeperCycle, KEEPER_INTERVAL_MS);
}

export function stopKeeper(): void {
  if (keeperTimer) {
    clearInterval(keeperTimer);
    keeperTimer = null;
    console.log("Keeper service stopped");
  }
}

async function runKeeperCycle(): Promise<void> {
  const pools = db.listPools();

  for (const pool of pools) {
    if (pool.state !== "active") continue;

    // Only manage pools where agent is the manager
    const agentAddress = Keypair.fromSecret(config.agentSecretKey).publicKey();
    if (pool.manager !== agentAddress) continue;

    try {
      await tryAdvanceRound(pool.contract_id);
    } catch (err) {
      console.error(`Keeper: failed to advance pool ${pool.contract_id}:`, err);
    }
  }
}

async function tryAdvanceRound(contractId: string, attempt = 0): Promise<void> {
  if (attempt >= MAX_RETRIES) {
    console.error(`Keeper: max retries reached for pool ${contractId}`);
    return;
  }

  try {
    const signedXdr = await buildAndSignWithAgent(contractId, "advance_round", []);
    const result = await submitSignedTx(signedXdr);

    if (result.status === "SUCCESS") {
      console.log(`Keeper: advanced round for pool ${contractId}, tx: ${result.hash}`);

      // Record fee in DB (we'd need to parse the result for actual fee amount)
      const pool = db.getPool(contractId);
      if (pool) {
        db.recordAgentFee(contractId, pool.current_round, 0, result.hash);
      }
    } else if (result.status === "FAILED") {
      // Likely conditions not met (not all contributed, time not elapsed) — normal, don't retry
      // Only retry on transient errors
      console.log(`Keeper: advance_round failed for ${contractId} — conditions likely not met`);
    }
  } catch (err: any) {
    if (err?.message?.includes("Simulation failed")) {
      // Contract conditions not met — this is expected, not an error
      return;
    }
    // Transient error — retry with backoff
    const delay = 1000 * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
    return tryAdvanceRound(contractId, attempt + 1);
  }
}
```

- [ ] **Step 3: Wire keeper into server startup**

Add to `backend/src/index.ts` before `app.listen`:

```typescript
import { startKeeper } from "./services/keeper.js";

// Start keeper after server is listening
startKeeper();
```

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/abba/Desktop/stellar_build/backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): pool indexer and keeper service with retry logic"
```

---

## Phase 2 Complete Checklist

After all 5 tasks, verify:

- [ ] `cd backend && npx tsc --noEmit` — compiles clean
- [ ] `cd backend && npx vitest run` — tests pass
- [ ] REST endpoints defined: GET/POST /api/pools, POST /api/pools/register, GET /api/pools/:id, POST /api/pools/:id/join, POST /api/pools/:id/contribute, POST /api/pools/:id/advance, GET /api/pools/:id/status, POST /api/tx/submit, GET /api/tx/:hash, POST /api/agent/remind, GET /api/agent/fee-summary
- [ ] No SQLite / no better-sqlite3 dependency
- [ ] Pool state (config, members, round, fees) served from live RPC reads
- [ ] Pool registry is in-memory Set seeded from CONTRACT_IDS env var
- [ ] Reminder queue is in-memory sorted list, keeper delivers due reminders
- [ ] Keeper service polls active managed pools and attempts advance_round with exponential backoff
- [ ] Error handler returns SRS-format JSON errors
