# Agent Circles — Handoff Document
_Last updated: 2026-04-14_

---

## What This Is

Agent Circles is a trustless on-chain ROSCA (rotating savings circle) built on Stellar/Soroban.
A group pools contributions each round; one member receives the full pot per round, rotating until everyone has been paid out. A **keeper** service (backend + `AGENT_SECRET_KEY`) auto-advances rounds on-chain when contract rules allow. Separately, a **Claude** chat agent (AWS Bedrock or Anthropic API) answers questions via tools (read pools, reminders)—it does **not** sign user join transactions.

---

## What's Done

### Phase 1 — Smart Contract ✅
- `contracts/rosca_pool/src/lib.rs` — full Soroban contract
- Functions: `initialize`, `join`, `contribute`, `advance_round`, `decommission`
- Query functions: `get_config`, `get_state`, `get_members`, `get_current_round`, `get_manager_fees`, `get_round_deposits`
- Security hardened: CEI pattern, `checked_add/mul/sub` on all financial math, re-init guard, `max_members` capped at 100, TTL refresh on persistent reads
- 21 tests passing (`cargo test`)
- Audit complete — all HIGH/MEDIUM findings fixed

### Phase 2 — Backend API ✅
- Fastify + TypeScript at `backend/src/`
- Pool routes: `GET/POST /api/pools`, join, contribute, advance, status
- Tx routes: `POST /api/tx/submit`, `GET /api/tx/:hash`
- Agent routes: `POST /api/agent/chat`, remind, fee-summary
- Demo routes: `POST /api/demo/seed`, `POST /api/demo/run`
- Keeper service: auto-advances eligible pools every 15s (requires `AGENT_SECRET_KEY`)
- File persistence: pool registry writes to `backend/data/registry.json`

### Phase 3 — Frontend ✅
- Vite + React 18 + TypeScript + Tailwind CSS
- Premium dark DeFi design system (near-black, indigo/violet, emerald)
- Pages: Landing, Dashboard (Pools), PoolDetail, CreatePool, JoinPool, Demo
- Stellar Wallets Kit v2 (Freighter) wallet connection
- Mobile bottom tab bar (Pools / Demo / Agent)
- Agent chat drawer wired to `/api/agent/chat`

### Phase 4 — Claude Agent ✅
- `backend/src/agent/` — system prompt, tool definitions, tool executor, chat handler
- Tools: `list_pools`, `get_pool`, `get_wallet_pools`, `get_fee_summary`, `schedule_reminder`, **`prepare_join`** (builds unsigned join tx when wallet is connected, or returns `open_join` action for the UI)
- `POST /api/agent/chat` returns `{ reply, actions }` — frontend renders **Open join page** / **Sign & join** buttons from `actions`
- **AWS Bedrock** integration (uses `us.anthropic.claude-3-5-sonnet-20241022-v2:0`)
- Credentials live in `backend/.env` (AWS keys from `~/.aws/credentials`)
- Fallback: set `LLM_PROVIDER=anthropic` + `CLAUDE_API_KEY` to use direct API instead

---

## What's Left To Do

### 🔴 Blocking — Nothing works end-to-end without this

**Create pool (two steps — important)**  
Soroban `initialize` is invoked on a **deployed WASM contract** (StrKey `C…`), never on a wallet (`G…`). The app’s “Create Circle” form requires you to **paste the contract ID** from `./scripts/deploy-contract.sh` (one deploy = one pool instance). After `initialize` succeeds, the UI registers that ID with the backend.

**Browser / web deploy — not required to use CLI**  
Stellar does **not** mandate the CLI. `stellar contract deploy` is a convenience wrapper around Soroban RPC + transactions. The same can be done in **JavaScript** with `@stellar/stellar-sdk`, for example:
- `Operation.uploadContractWasm({ wasm: Buffer })` — upload the compiled `.wasm` bytes
- `Operation.createCustomContract({ wasmHash, salt, ... })` — instantiate a new contract from that hash (same as CLI deploy)

A typical **in-browser** flow: fetch WASM from your site (e.g. `public/contracts/rosca_pool.wasm`), have the user **sign** the upload tx (and possibly a second tx for `createCustomContract`), then read the new **contract `C…` id** from the transaction result and pass it into the existing **initialize** step. Tradeoffs: larger frontend asset, two signing steps, footprint/fee handling, and good error handling — but it is **user-friendly** once implemented.

**Best UX for many pools (future):** add a **factory** contract deployed once; the web app only calls `deploy_child_pool()` (or similar) with no WASM in the browser per pool.

**1. Install stellar CLI + deploy contract**
```bash
# stellar-cli is currently compiling via cargo (started in background):
~/.cargo/bin/stellar --version   # check if ready

# Once ready:
./scripts/setup-testnet.sh       # generate agent keypair, fund via Friendbot
./scripts/deploy-contract.sh     # build WASM + deploy to testnet
# → prints CONTRACT_ID, add to backend/.env
```

**2. Add contract ID to `.env`**
```
CONTRACT_IDS=<your_contract_id>
DEMO_CONTRACT_ID=<your_contract_id>
```

**3. Generate agent secret key** (script does this, but also manual):
```bash
stellar keys generate agent --network testnet
stellar keys address agent
stellar keys show agent --expose-secret
# Add to backend/.env as AGENT_SECRET_KEY
```

---

### 🟠 Deploy

**Frontend → Vercel**
```bash
vercel login        # one-time auth (token expired)
cd frontend
vercel --yes        # deploys, gives you agent-circles.vercel.app
```
The `frontend/vercel.json` already has:
- SPA rewrites (`/*` → `/index.html`)
- API proxy (`/api/*` → Railway backend URL)

Update the Railway URL in `vercel.json` once backend is deployed:
```json
{ "source": "/api/:path*", "destination": "https://YOUR_RAILWAY_URL/api/:path*" }
```

**Backend → Railway**
1. Go to railway.app → New Project → Deploy from GitHub
2. Set root directory to `backend/`
3. Add all env vars from `backend/.env` in Railway's Variables tab
4. `railway.json` is already configured with health check + restart policy

---

### 🟡 Nice-to-Have (after live)

**Demo page full automation**
`POST /api/demo/run` is built and ready. Just needs `DEMO_CONTRACT_ID` set.
The frontend Demo page currently only seeds accounts — wire it to `/api/demo/run` to show the full round lifecycle (join → contribute → payout) with a step-by-step progress UI.

**Redis for production persistence**
Current reminder queue is in-memory (lost on restart). The interface is designed for Redis:
- `registry.ts`: swap `Set` + JSON file for `SADD`/`SMEMBERS`
- `reminder-queue.ts`: swap array for `ZADD`/`ZRANGEBYSCORE`
No caller code changes required.

**Bedrock model upgrade**
Current Bedrock model: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
When Claude Sonnet 4.6 becomes available on Bedrock, update `BEDROCK_MODEL` in `backend/src/agent/chat-handler.ts`.

**Primary / stable asset (testnet)**
- **Default in app:** **USDC** Stellar Asset Contract on testnet: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (Circle test USDC; classic `USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`). Defined as `TESTNET_USDC_SAC` in `backend/src/stellar/testnet-assets.ts`.
- **Native XLM SAC** (no stable; for XLM-only experiments): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` — `TESTNET_NATIVE_XLM_SAC` in the same file.
- An earlier placeholder StrKey was **wrong** (invalid / mismatched suffix) and triggered wallet/SDK “unsupported address type” errors; always use the exact IDs above or Stellar Expert.
- **Mainnet:** Primary regulated dollar stablecoin on Stellar is **USDC** (Circle). Derive the SAC from the issued asset or look up the current contract on [Stellar Expert](https://stellar.expert); do not hardcode mainnet IDs without verifying the current issuer/SAC mapping.

**Landing page content**
The landing page has placeholder stats (hardcoded $2.4M TVL, 148 pools). Wire these to real data from `/api/pools` or leave as marketing copy until mainnet.

---

## Key File Map

```
contracts/rosca_pool/src/lib.rs          ← Soroban contract (the source of truth)
backend/src/agent/chat-handler.ts        ← Claude/Bedrock agent loop
backend/src/agent/tools.ts               ← Tool definitions (add new tools here)
backend/src/services/keeper.ts           ← Auto-advances rounds every 15s
backend/src/store/pool-registry.ts       ← Pool ID list (persists to data/registry.json)
backend/.env                             ← All secrets (AWS keys, agent key, contract IDs)
frontend/src/components/layout/AgentDrawer.tsx  ← Chat UI
frontend/src/pages/Demo.tsx              ← Demo page (wire to /api/demo/run)
frontend/vercel.json                     ← Vercel deploy config + API proxy
backend/railway.json                     ← Railway deploy config
scripts/deploy-contract.sh               ← One-command contract deployment
scripts/setup-testnet.sh                 ← Agent keypair + Friendbot funding
```

---

## Environment Variables Cheatsheet

**`backend/.env` (full set needed for production)**
```
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_IDS=<deployed_contract_id>
DEMO_CONTRACT_ID=<deployed_contract_id>
AGENT_SECRET_KEY=<stellar_secret_key_S...>
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from ~/.aws/credentials>
AWS_SECRET_ACCESS_KEY=<from ~/.aws/credentials>
PORT=3001
# Optional: override default Soroban SAC for pool create (default = testnet USDC SAC in code)
# DEFAULT_TOKEN_CONTRACT=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

**Railway Variables** — same as above, set in dashboard

**Vercel Variables** — none needed (frontend is static; API calls proxy to Railway)

---

## How to Pick Up Next Session

1. Check if stellar CLI compiled: `~/.cargo/bin/stellar --version`
2. Run `./scripts/setup-testnet.sh` → generates agent keypair
3. Run `./scripts/deploy-contract.sh` → deploys contract, prints ID
4. Add contract ID to `backend/.env`
5. `vercel login` then `cd frontend && vercel --yes`
6. Deploy backend to Railway
7. Update `frontend/vercel.json` with Railway URL → redeploy frontend

At that point the app is fully live on testnet with working agent chat.
