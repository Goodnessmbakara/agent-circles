# Agent Circles

Trustless **ROSCA** (rotating savings circle) on **Stellar / Soroban**: members contribute each round; the pot pays out one member per round until everyone has received. The app pairs **on-chain rules** with a **keeper** backend (automated round advancement) and an **Assistant** (LLM chat for pool help and join prep—not on-chain automation).

## Repo layout

| Path | Role |
|------|------|
| `contracts/rosca_pool/` | Soroban smart contract (Rust) |
| `backend/` | Fastify API, keeper, Claude/Bedrock agent, Soroban RPC |
| `frontend/` | Vite + React + TypeScript, Stellar Wallets Kit |

## Prerequisites

- **Node.js** 20+ and **pnpm**
- **Rust** + **Clarinet** / **stellar CLI** when building or deploying contracts locally

## Local development

**Backend** (default `http://localhost:3001`):

```bash
cd backend
cp .env.example .env   # fill in keys, RPC, contract IDs
pnpm install
pnpm dev
```

**Frontend** (default `http://localhost:5173`, proxies `/api` → backend):

```bash
cd frontend
pnpm install
pnpm dev
```

**Contract tests** (from repo root):

```bash
cd contracts/rosca_pool && cargo test
```

## Environment (backend)

See `backend/.env.example` for the full list. Typical values include:

- `SOROBAN_RPC_URL`, `HORIZON_URL`, `NETWORK_PASSPHRASE` (testnet defaults are fine for demos)
- `CONTRACT_IDS` — comma-separated pool contract IDs (also registered via `POST /api/pools/register`)
- `AGENT_SECRET_KEY` — Stellar secret for the **keeper** (signs `advance_round` when enabled)
- `CLAUDE_API_KEY` **or** AWS Bedrock (`LLM_PROVIDER=bedrock` + AWS creds) for the Assistant
- `DEMO_CONTRACT_ID` — optional, for `POST /api/demo/run`
- `PORT` — default `3001`

## Deployment

### Frontend (Vercel)

- **Project name:** `agent-circles` (team: **Goodness' projects**).
- **Git:** connected to **https://github.com/Goodnessmbakara/agent-circles**, production branch **`main`** (deploys on push).
- **Monorepo:** in Vercel → **Project → Settings → General**, set **Root Directory** to **`frontend`**. If this is empty, Vercel builds from the repo root and will not find the Vite app.
- Production build: **Vite** (`pnpm run build` from that root directory).
- **Routing:** `frontend/vercel.json` rewrites browser requests to `/api/*` to the **Fly.io** API so the SPA can call same-origin `/api/...` in production.

```json
"destination": "https://agent-circles-api.fly.dev/api/:path*"
```

- After a **push to `main`** (with Git connected), Vercel deploys production. Project URLs follow the usual `*.vercel.app` pattern for your team (e.g. `agent-circles-<team>.vercel.app`). You can add **`agent-circles.vercel.app`** under **Project → Settings → Domains** if the slug is available.

### Backend (Fly.io)

- **App:** `agent-circles-api` — see `backend/fly.toml` and `backend/Dockerfile`.
- **Health:** `GET https://agent-circles-api.fly.dev/health` → `{"status":"ok"}`.

Set Fly secrets / env to mirror `backend/.env` (RPC, keys, contract IDs, LLM provider).

### GitHub

- Source: **https://github.com/Goodnessmbakara/agent-circles**

## Notes

- **Keeper vs Assistant:** the keeper is a server key that advances rounds when `keeper_enabled` is true for a pool in the registry. The Assistant is chat-only and does not sign user transactions.
- **Registry:** pool metadata is stored under `backend/data/` locally; use durable storage in production if you rely on it across restarts.
- **Figma cache:** never commit `**/figma-cache/` (see `.gitignore`).

## License

See the repository license file if present; otherwise treat as private unless otherwise stated.
