# Agent Circles — Software Requirements Specification

**Version:** 1.0
**Date:** 2026-04-09
**Status:** Draft — MVP / Stellar Hackathon Build

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for **Agent Circles**, a Stellar/Soroban application that implements ROSCA (Rotating Savings and Credit Association) pools with AI agent coordination. It covers the smart contract, backend, frontend, and agent subsystems.

### 1.2 Scope
Agent Circles enables users to create, join, and participate in on-chain savings circles where:
- A Soroban smart contract enforces contribution rules, rotation order, and payout logic
- AI agents coordinate operations (reminders, round advancement, transaction building)
- Agents act as economic participants — managing pools and earning declared fees
- A web interface provides wallet-connected access to all pool operations

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| ROSCA | Rotating Savings and Credit Association — a group savings mechanism where members contribute fixed amounts each round and one member receives the full pot per round |
| Pool | A single ROSCA instance on-chain with defined members, amounts, and schedule |
| Round | One contribution cycle — all members pay in, one member receives the pot |
| Vault | The contract's held token balance (contract address = vault) |
| Keeper | External caller that triggers time-dependent contract functions (advance_round) |
| SAC | Stellar Asset Contract — Soroban interface for classic Stellar assets (USDC, XLM) |
| Manager | The address (human or agent) designated to coordinate a pool and earn fees |

### 1.4 References
- Soroban SDK: `soroban-sdk` crate (Rust)
- Stellar SDK: `@stellar/stellar-sdk` (TypeScript)
- Wallet Kit: `@creit-tech/stellar-wallets-kit`
- Reference: Ahjoor contract (`github.com/Ahjoor/ahjoor-contract`)
- Reference: BreadchainCoop saving-circles (`github.com/BreadchainCoop/saving-circles`)
- Reference: Soroban examples (`github.com/stellar/soroban-examples`)

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                           │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Web App      │  │  (Telegram)  │                 │
│  │  Vite+React   │  │  Phase 2     │                 │
│  │  +TS          │  │              │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
└─────────┼──────────────────┼────────────────────────┘
          │ REST + WS        │
┌─────────┼──────────────────┼────────────────────────┐
│         ▼    CONTROL PLANE ▼                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Backend API  │  │  Agent       │  │  Key      │ │
│  │  Fastify/TS   │◄─┤  Claude +   │  │  Store    │ │
│  │              │  │  Tools       │  │  (env)    │ │
│  └──────┬───────┘  └──────────────┘  └───────────┘ │
└─────────┼───────────────────────────────────────────┘
          │ Soroban RPC + Horizon
┌─────────┼───────────────────────────────────────────┐
│         ▼    STELLAR NETWORK (Testnet)               │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Soroban      │  │  USDC (SAC)  │                 │
│  │  Pool Contract│──┤  + XLM       │                 │
│  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Smart Contract | Rust + Soroban SDK | Only option for Soroban |
| Backend | Node.js + Fastify + TypeScript | Fast, typed, Stellar SDK native |
| Frontend | Vite + React 18 + TypeScript | Stellar ecosystem is React-first; all official examples, scaffolds, and wallet libraries target React. Scored 9.35/10 vs SvelteKit 5.95, HTMX 2.55 in weighted comparison |
| Wallet | @creit-tech/stellar-wallets-kit | 11 wallets supported; framework-agnostic |
| UI | shadcn/ui + Tailwind CSS | Rapid scaffolding, accessible primitives |
| State (server) | @tanstack/react-query | Polling, caching, background refetch |
| State (client) | zustand | Lightweight, TypeScript-native |
| Agent | Claude API (tool-use) | Structured tool calling, streaming |
| Database | SQLite (MVP) → PostgreSQL | Pool index cache, reminders, user mappings |
| Stellar SDK | @stellar/stellar-sdk | Transaction building, Soroban RPC, Horizon |

### 2.3 User Classes

| Class | Description | Privileges |
|-------|-------------|-----------|
| Member | Wallet-connected user participating in pools | Join, contribute, view, receive payout |
| Creator | Member who creates a pool | Set terms, define rotation order, designate manager |
| Manager (Human) | Creator or designated address coordinating a pool | Earn fee, call advance_round |
| Manager (Agent) | AI agent with own Stellar keypair managing a pool | Same as Human Manager + automated keeper duties |
| Operator | Developer who deploys/monitors an agent | View operator dashboard, configure agent |

### 2.4 Constraints

- **Network:** Stellar Testnet only for MVP
- **Asset:** USDC (testnet) only for MVP
- **Members per pool:** Max 20 (Instance storage bound)
- **Manager fee:** Max 5%, set at creation, immutable
- **No SSR required:** Wallet-connected SPA — no SEO benefit from SSR
- **No mobile native:** Web only for MVP (PWA stretch goal)

---

## 3. Functional Requirements

### 3.1 Smart Contract (FR-1xx)

#### FR-100: Contract Initialization
The contract SHALL accept initialization parameters and store them in Instance storage:
- `admin`: Address (pool creator)
- `token`: Address (USDC SAC address)
- `contribution_amount`: i128
- `round_period`: u64 (seconds)
- `max_members`: u32 (max 20)
- `manager`: Address (human or agent)
- `manager_fee_bps`: u32 (basis points, max 500 = 5%)
- `rotation_order`: Vec<Address> (fixed at activation)

#### FR-101: Join Pool
The contract SHALL allow an address to join a pool in `Setup` state:
- Caller MUST `require_auth`
- Member count MUST NOT exceed `max_members`
- Address MUST NOT already be a member
- When member count reaches `max_members`, state transitions to `Active`

#### FR-102: Contribute
The contract SHALL accept a fixed contribution from a member for the current round:
- Caller MUST `require_auth`
- Pool state MUST be `Active`
- Amount MUST equal `contribution_amount` (fixed, not variable)
- Token transfer: `member → contract vault` via SAC `transfer()`
- Contribution recorded in Persistent storage: `RoundDeposit(round, member)`
- A member MUST NOT contribute twice for the same round

#### FR-103: Advance Round / Trigger Payout
The contract SHALL allow anyone to trigger round advancement when conditions are met:
- All members for `current_round` have contributed
- Current ledger timestamp >= round start + round_period (time-gated)
- On advancement:
  1. Calculate payout: `contribution_amount * num_members`
  2. Calculate fee: `payout * manager_fee_bps / 10000`
  3. Transfer `payout - fee` from vault to `rotation_order[current_round]`
  4. Transfer `fee` from vault to `manager` address
  5. Increment `current_round`
  6. If `current_round >= num_members`, set state to `Completed`
- This function is **permissionless** (no require_auth on caller) — anyone (including the agent keeper) can call it

#### FR-104: Query Pool State
The contract SHALL expose read-only functions:
- `get_config() → RoscaConfig`
- `get_state() → RoscaState`
- `get_members() → Vec<Address>`
- `get_current_round() → u32`
- `get_round_contributions(round) → Vec<(Address, i128)>`
- `get_member_status(member) → { contributed_this_round: bool, has_received_payout: bool, total_contributed: i128 }`

#### FR-105: Emergency Decommission
The contract SHALL allow the admin to cancel a pool:
- Admin MUST `require_auth`
- Pool state MUST NOT be `Completed`
- All remaining vault funds returned pro-rata to members based on total contributions
- State set to `Cancelled`

#### FR-106: TTL Management
The contract SHALL extend storage TTL on every state-changing call:
- Instance: extend_ttl(518_400, 1_036_800) (~30 day threshold, ~60 day extend)
- Persistent entries touched in the call: same TTL parameters
- Expose `bump_storage()` public function for manual TTL extension

#### FR-107: Storage Layout
- **Instance:** Admin, Token, Config, State, CurrentRound, Members (Vec, bounded at 20)
- **Persistent:** RoundDeposit(u32, Address), HasReceived(Address), TotalContributed(Address), RoundRecipient(u32)
- **Temporary:** Not used in MVP

### 3.2 Backend API (FR-2xx)

#### FR-200: Transaction Builder
The backend SHALL build unsigned Soroban transactions for client signing:
- Accept: contract function name + parameters + source account
- Call `Server.prepareTransaction()` via Soroban RPC to simulate and add resource fees
- Return: unsigned XDR (base64) for wallet signing
- NEVER sign transactions with user keys

#### FR-201: Transaction Submission
The backend SHALL accept signed XDR and submit to network:
- Call `Server.sendTransaction()` via Soroban RPC
- Poll `Server.getTransaction(hash)` until confirmed or failed
- Return: transaction hash + status + ledger

#### FR-202: Pool Indexer
The backend SHALL maintain a read cache of pool state:
- On startup: query all known contract instances for current state
- On write operations: invalidate and re-fetch relevant pool data
- Expose cached data via REST endpoints for fast frontend reads
- Source of truth remains the contract — cache is convenience only

#### FR-203: Agent Tool Endpoints
The backend SHALL expose the following endpoints consumable as Claude tools:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pools` | GET | List pools (from cache) |
| `/api/pools/:id` | GET | Pool detail + member status |
| `/api/pools` | POST | Build create-pool tx (returns unsigned XDR) |
| `/api/pools/:id/join` | POST | Build join tx |
| `/api/pools/:id/contribute` | POST | Build contribute tx |
| `/api/pools/:id/advance` | POST | Build or execute advance_round tx |
| `/api/pools/:id/status` | GET | Contribution status for current round |
| `/api/agent/remind` | POST | Schedule reminder (off-chain) |
| `/api/agent/fee-summary` | GET | Fee earnings for agent address |
| `/api/tx/:hash` | GET | Transaction status |

#### FR-204: Agent Keeper Service
The backend SHALL run a background process that:
- Monitors active pools for round completion conditions
- When conditions met: builds and signs `advance_round` tx with agent keypair
- Submits tx to network
- Logs result

#### FR-205: Reminder Queue
The backend SHALL maintain a simple reminder system:
- Store: pool_id, member_address, remind_at timestamp, message
- Check queue on interval (e.g., every 60 seconds)
- Deliver reminder via: WebSocket to connected frontend client (MVP)
- Phase 2: Telegram, email, push

#### FR-206: Authentication
The backend SHALL authenticate requests via:
- Wallet signature verification (prove ownership of Stellar address)
- Session token (JWT or simple token) issued after signature verification
- Agent endpoints: API key for agent-to-backend communication

### 3.3 Frontend (FR-3xx)

#### FR-300: Wallet Connection
The frontend SHALL support wallet connection via `@creit-tech/stellar-wallets-kit`:
- Display wallet selection modal (Freighter, xBull, Lobstr, etc.)
- Show connected address with copy button
- Display XLM balance
- Network: Stellar Testnet (hardcoded for MVP)
- Persist connection across page reloads

#### FR-301: Pool List View
The frontend SHALL display:
- User's pools (where user is a member)
- Discoverable/public pools (for demo purposes)
- Each pool card: name/id, member count, contribution amount, current round, status badge
- "Create Pool" CTA

#### FR-302: Create Pool Form
The frontend SHALL collect:
- Contribution amount (USDC)
- Round period (dropdown: 1 min for demo, 1 day, 1 week, 1 month)
- Max members (2-20)
- Manager fee % (0-5%, slider)
- Manager: self or agent address
- Preview of pool terms before tx submission
- Build tx → wallet sign → submit → redirect to pool detail

#### FR-303: Pool Detail View
The frontend SHALL display:
- Pool status (Setup / Active / Completed / Cancelled)
- Member list with contribution status per round (paid / unpaid)
- Current round number and rotation order highlighting "current recipient"
- Countdown timer to round end (calculated from `start_time + round * period`)
- "Contribute" button (if user hasn't contributed this round)
- "Claim Payout" indicator (if user is current recipient and conditions met)
- Transaction history for this pool (from Horizon or indexer)

#### FR-304: Transaction Flow
For all state-changing operations, the frontend SHALL:
1. Build transaction via backend API (receive unsigned XDR)
2. Display simulation result (estimated fees, effects)
3. Request wallet signature via stellar-wallets-kit `signTransaction()`
4. Submit signed tx via backend
5. Show pending state with spinner
6. Poll for confirmation
7. Update UI on success / show error on failure
8. Link to Stellar explorer for the transaction

#### FR-305: Agent Chat Panel
The frontend SHALL include a slide-out drawer (copilot panel):
- Text input for natural language messages
- Streaming response display (token-by-token rendering)
- When agent proposes a transaction: render tx preview card with "Sign" CTA
- Message history preserved per session
- Can be opened/closed from any screen

#### FR-306: Demo Mode
The frontend SHALL support a "Demo Mode" button that:
- Creates 5 test accounts via Friendbot (XLM funding)
- Funds each with testnet USDC (via test asset issuer or faucet)
- Creates a pool with short round period (1-2 minutes)
- Adds all 5 accounts as members
- Displays instructions for walking through a full rotation

### 3.4 Agent (FR-4xx)

#### FR-400: Tool-Use Architecture
The agent SHALL use Claude API with tool-use (function calling):
- System prompt defines the agent's role, constraints, and available tools
- Tools map 1:1 to backend API endpoints (§FR-203)
- Agent receives user message → decides which tool(s) to call → returns result
- Streaming enabled for real-time response rendering

#### FR-401: Transaction Proposal
When a user requests an action that requires a transaction, the agent SHALL:
1. Call the appropriate backend endpoint to build the tx
2. Return a structured response containing: action description, tx simulation result, unsigned XDR
3. Frontend renders this as a signable tx card
4. Agent NEVER signs on behalf of the user

#### FR-402: Keeper Behavior
The agent (via backend keeper service) SHALL:
- Monitor pools where it is the designated manager
- Call `advance_round` when: all contributions received AND round period elapsed
- Sign keeper transactions with its own keypair
- Log all keeper actions

#### FR-403: Fee Collection
The agent SHALL:
- Track pools where it earns manager fees
- Fees are paid automatically by the contract during `advance_round`
- Agent can query its fee earnings via `get_fee_summary` tool

#### FR-404: Conversational Capabilities
The agent SHALL respond accurately to:
- "What is a ROSCA / savings circle?"
- "What pools am I in?"
- "Have I contributed this round?"
- "When is my payout round?"
- "Create a pool with [terms]"
- "Help me contribute to pool X"
- "What's the status of pool X?"

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-1xx)

| ID | Requirement |
|----|------------|
| NFR-100 | Frontend initial load: < 3 seconds on broadband |
| NFR-101 | Pool list query (cached): < 200ms |
| NFR-102 | Transaction build + simulate: < 5 seconds |
| NFR-103 | Transaction confirmation: dependent on Stellar ledger close (~5-6s) |
| NFR-104 | Agent response (first token): < 2 seconds |
| NFR-105 | Agent response (complete): < 10 seconds for simple queries |

### 4.2 Security (NFR-2xx)

| ID | Requirement |
|----|------------|
| NFR-200 | User private keys NEVER leave the wallet extension |
| NFR-201 | Backend NEVER stores or logs user private keys |
| NFR-202 | Agent keypair stored in environment variable (testnet); KMS for production |
| NFR-203 | All frontend-to-backend communication over HTTPS in production |
| NFR-204 | Contract: all fund movements require `require_auth` from the source address |
| NFR-205 | Contract: manager fee immutable after pool creation |
| NFR-206 | Contract: manager fee capped at 500 bps (5%) at contract level |
| NFR-207 | Input validation on all backend endpoints (Zod schemas) |
| NFR-208 | CORS: whitelist specific origins |
| NFR-209 | Rate limiting on API endpoints |

### 4.3 Reliability (NFR-3xx)

| ID | Requirement |
|----|------------|
| NFR-300 | Contract state is the single source of truth; backend cache is expendable |
| NFR-301 | Failed transactions: return clear error; never leave pool in inconsistent state |
| NFR-302 | Keeper retries: exponential backoff, max 3 attempts for advance_round |
| NFR-303 | Storage TTL: extend on every interaction; minimum 30-day threshold |

### 4.4 Testability (NFR-4xx)

| ID | Requirement |
|----|------------|
| NFR-400 | Contract: unit tests for all state transitions (Soroban test framework) |
| NFR-401 | Contract: integration test for full ROSCA lifecycle (create → N rounds → complete) |
| NFR-402 | Backend: API endpoint tests with mocked Soroban RPC |
| NFR-403 | Frontend: Demo mode enables full lifecycle test without external setup |

---

## 5. External Interface Requirements

### 5.1 Soroban RPC

| Interface | Details |
|-----------|---------|
| Endpoint | Stellar Testnet RPC (e.g., `https://soroban-testnet.stellar.org`) |
| Methods used | `simulateTransaction`, `sendTransaction`, `getTransaction`, `getContractData`, `getLedgerEntries` |
| SDK | `@stellar/stellar-sdk` — `Server` class from `@stellar/stellar-sdk/rpc` |
| Auth | None (public RPC) |

### 5.2 Horizon

| Interface | Details |
|-----------|---------|
| Endpoint | `https://horizon-testnet.stellar.org` |
| Methods used | Account info, transaction history, effects |
| SDK | `@stellar/stellar-sdk` — `Horizon.Server` |
| Usage | Transaction history display, account balance checks |

### 5.3 Wallet (Client-Side)

| Interface | Details |
|-----------|---------|
| Library | `@creit-tech/stellar-wallets-kit` |
| Methods | `getAddress()`, `signTransaction(xdr, opts)` |
| Wallets | Freighter (primary), xBull, Lobstr, WalletConnect, others |
| Network | Testnet (passphrase: `Test SDF Network ; September 2015`) |

### 5.4 Claude API (Agent)

| Interface | Details |
|-----------|---------|
| Endpoint | Anthropic Messages API |
| Model | Claude (tool-use enabled) |
| Pattern | System prompt + tools definition + streaming |
| Tools | 10 tools mapped to backend endpoints (§FR-203) |

### 5.5 Friendbot (Testnet Funding)

| Interface | Details |
|-----------|---------|
| Endpoint | `https://friendbot.stellar.org?addr={address}` |
| Usage | Fund test accounts with XLM for demo mode |
| Rate | Subject to Stellar testnet rate limits |

---

## 6. Data Model

### 6.1 On-Chain (Soroban Contract Storage)

#### Instance Storage (loaded every invocation)

```
Admin           : Address           — Pool creator
Token           : Address           — USDC SAC contract address
Config          : RoscaConfig       — { contribution_amount, round_period, start_time, max_members, manager_fee_bps }
State           : RoscaState        — Setup | Active | Completed | Cancelled
CurrentRound    : u32               — 0-indexed round counter
Members         : Vec<Address>      — Ordered member list (max 20)
Manager         : Address           — Fee recipient (human or agent)
```

#### Persistent Storage (per-member, per-round)

```
RoundDeposit(round: u32, member: Address)  : i128     — Contribution recorded
HasReceived(member: Address)                : bool     — Has received payout
TotalContributed(member: Address)           : i128     — Running total
RoundRecipient(round: u32)                  : Address  — Who received payout for round
ManagerFeePaid(round: u32)                  : i128     — Fee paid to manager for round
```

### 6.2 Off-Chain (Backend Database — SQLite MVP)

```sql
-- Pool index cache (mirrors on-chain state for fast reads)
CREATE TABLE pools (
    contract_id   TEXT PRIMARY KEY,
    admin         TEXT NOT NULL,
    token         TEXT NOT NULL,
    contribution  INTEGER NOT NULL,      -- stroops
    round_period  INTEGER NOT NULL,      -- seconds
    start_time    INTEGER,
    max_members   INTEGER NOT NULL,
    manager       TEXT NOT NULL,
    fee_bps       INTEGER NOT NULL,
    state         TEXT NOT NULL,          -- setup|active|completed|cancelled
    current_round INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL
);

-- Pool members (mirrors on-chain)
CREATE TABLE pool_members (
    contract_id   TEXT NOT NULL,
    member        TEXT NOT NULL,
    position      INTEGER NOT NULL,       -- rotation order index
    PRIMARY KEY (contract_id, member)
);

-- Reminder queue
CREATE TABLE reminders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id   TEXT NOT NULL,
    member        TEXT NOT NULL,
    remind_at     INTEGER NOT NULL,       -- unix timestamp
    message       TEXT NOT NULL,
    delivered     INTEGER NOT NULL DEFAULT 0
);

-- Agent fee tracking (derived from on-chain events)
CREATE TABLE agent_fees (
    contract_id   TEXT NOT NULL,
    round         INTEGER NOT NULL,
    amount        INTEGER NOT NULL,       -- stroops
    tx_hash       TEXT NOT NULL,
    PRIMARY KEY (contract_id, round)
);
```

---

## 7. Contract Interface Specification

### 7.1 Public Functions

```rust
/// Initialize a new ROSCA pool
pub fn initialize(
    env: Env,
    admin: Address,
    token: Address,
    contribution_amount: i128,
    round_period: u64,
    max_members: u32,
    manager: Address,
    manager_fee_bps: u32,
) -> ();

/// Join a pool in Setup state
pub fn join(env: Env, member: Address) -> ();

/// Contribute to the current round
pub fn contribute(env: Env, member: Address) -> ();

/// Advance to next round and trigger payout (permissionless)
pub fn advance_round(env: Env) -> ();

/// Emergency cancellation — admin only, returns funds pro-rata
pub fn decommission(env: Env, admin: Address) -> ();

/// Extend storage TTL (permissionless)
pub fn bump_storage(env: Env) -> ();

// --- Read-only ---

pub fn get_config(env: Env) -> RoscaConfig;
pub fn get_state(env: Env) -> RoscaState;
pub fn get_members(env: Env) -> Vec<Address>;
pub fn get_current_round(env: Env) -> u32;
pub fn get_round_deposits(env: Env, round: u32) -> Vec<(Address, i128)>;
pub fn get_member_status(env: Env, member: Address) -> MemberStatus;
pub fn get_manager_fees(env: Env) -> i128;
```

### 7.2 Events

```rust
// Emitted on pool creation
event!("pool_created", admin: Address, token: Address, contribution: i128);

// Emitted when a member joins
event!("member_joined", member: Address, position: u32);

// Emitted on contribution
event!("contribution", member: Address, round: u32, amount: i128);

// Emitted on payout
event!("payout", recipient: Address, round: u32, amount: i128, fee: i128);

// Emitted on state change
event!("state_change", from: RoscaState, to: RoscaState);
```

---

## 8. Transaction Flows

### 8.1 Contribute Flow (User-Initiated)

```
User (Frontend)                Backend                    Soroban RPC           Contract
     │                           │                           │                    │
     │ POST /pools/:id/contribute│                           │                    │
     │ { member: addr }          │                           │                    │
     │──────────────────────────►│                           │                    │
     │                           │ Build invokeHostFunction  │                    │
     │                           │ (rosca.contribute(member))│                    │
     │                           │──────────────────────────►│                    │
     │                           │                           │ simulateTransaction│
     │                           │                           │───────────────────►│
     │                           │                           │◄───────────────────│
     │                           │◄──────────────────────────│                    │
     │   Unsigned XDR + sim      │                           │                    │
     │◄──────────────────────────│                           │                    │
     │                           │                           │                    │
     │ Sign with wallet          │                           │                    │
     │ (stellar-wallets-kit)     │                           │                    │
     │                           │                           │                    │
     │ POST /tx/submit           │                           │                    │
     │ { signed_xdr }            │                           │                    │
     │──────────────────────────►│                           │                    │
     │                           │ sendTransaction           │                    │
     │                           │──────────────────────────►│                    │
     │                           │                           │ Execute            │
     │                           │                           │───────────────────►│
     │                           │                           │  require_auth ✓    │
     │                           │                           │  token.transfer ✓  │
     │                           │                           │◄───────────────────│
     │                           │ poll getTransaction       │                    │
     │                           │──────────────────────────►│                    │
     │                           │◄──────────────────────────│                    │
     │   { hash, status, ledger }│                           │                    │
     │◄──────────────────────────│                           │                    │
```

### 8.2 Advance Round Flow (Agent Keeper)

```
Agent Keeper (Backend)          Soroban RPC                  Contract
     │                           │                            │
     │ Poll: all contributed?    │                            │
     │ Check: time elapsed?      │                            │
     │                           │                            │
     │ Build advance_round tx    │                            │
     │ (source = agent keypair)  │                            │
     │──────────────────────────►│                            │
     │                           │ simulateTransaction        │
     │                           │───────────────────────────►│
     │                           │◄───────────────────────────│
     │◄──────────────────────────│                            │
     │                           │                            │
     │ Sign with agent key       │                            │
     │                           │                            │
     │ sendTransaction           │                            │
     │──────────────────────────►│                            │
     │                           │ Execute                    │
     │                           │───────────────────────────►│
     │                           │  payout to recipient ✓     │
     │                           │  fee to manager ✓          │
     │                           │  round++ ✓                 │
     │                           │◄───────────────────────────│
     │◄──────────────────────────│                            │
     │                           │                            │
     │ Log + update cache        │                            │
```

---

## 9. Error Handling

### 9.1 Contract Errors

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum RoscaError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PoolFull = 3,
    AlreadyMember = 4,
    NotMember = 5,
    WrongState = 6,          // e.g., contribute when Setup
    AlreadyContributed = 7,
    RoundNotComplete = 8,    // advance_round called too early
    RoundNotElapsed = 9,     // time condition not met
    NotAdmin = 10,
    FeeTooHigh = 11,         // manager_fee_bps > 500
    InsufficientBalance = 12,
    MemberLimitExceeded = 13,
}
```

### 9.2 Backend Error Responses

All errors follow the format:
```json
{
    "error": {
        "code": "pool_not_found",
        "message": "Pool with contract ID xyz not found",
        "details": []
    },
    "request_id": "req_abc123"
}
```

Standard error codes: `validation_error`, `pool_not_found`, `tx_simulation_failed`, `tx_submission_failed`, `unauthorized`, `rate_limited`.

---

## 10. Testing Requirements

### 10.1 Contract Tests (Soroban Test Framework)

| Test | Description |
|------|-------------|
| `test_initialize` | Create pool with valid params; verify stored state |
| `test_initialize_fee_too_high` | Reject fee > 500 bps |
| `test_join` | Members join until full; verify state transition to Active |
| `test_join_full_pool` | Reject join when pool is full |
| `test_join_duplicate` | Reject duplicate member |
| `test_contribute` | Member contributes; verify deposit recorded, token transferred |
| `test_contribute_wrong_round` | Reject contribution for wrong round |
| `test_contribute_double` | Reject second contribution same round |
| `test_advance_round` | All contribute → advance → verify payout + fee + round++ |
| `test_advance_incomplete` | Reject advance when contributions missing |
| `test_advance_time_not_elapsed` | Reject advance before round period |
| `test_full_lifecycle` | Create → join × N → (contribute × N + advance) × N → Completed |
| `test_decommission` | Admin cancels → funds returned pro-rata |
| `test_decommission_not_admin` | Reject non-admin decommission |

### 10.2 Backend Tests

| Test | Description |
|------|-------------|
| `test_build_contribute_tx` | Verify XDR structure + simulation success |
| `test_submit_signed_tx` | Mock RPC; verify submission flow |
| `test_pool_indexer` | Verify cache reflects chain state |
| `test_keeper_advance` | Verify keeper detects + executes advance |
| `test_reminder_queue` | Verify reminders scheduled + delivered |

### 10.3 Frontend Tests

| Test | Description |
|------|-------------|
| `test_wallet_connect` | Mock wallet; verify address display |
| `test_pool_list_render` | Mock API; verify pool cards render |
| `test_contribute_flow` | Mock API + wallet; verify full tx flow |
| `test_agent_chat` | Mock agent API; verify message + tx card rendering |

---

## 11. Deployment

### 11.1 Contract Deployment
1. Build: `stellar contract build`
2. Deploy: `stellar contract deploy --wasm target/wasm32-unknown-unknown/release/rosca_pool.wasm --network testnet`
3. Initialize: `stellar contract invoke --id <contract_id> -- initialize --admin <addr> ...`
4. Generate bindings: `stellar contract bindings typescript --contract-id <id> --output-dir packages/rosca-client`

### 11.2 Backend Deployment
- Docker container or direct Node.js process
- Environment variables: `SOROBAN_RPC_URL`, `HORIZON_URL`, `AGENT_SECRET_KEY`, `CLAUDE_API_KEY`, `DATABASE_URL`
- For hackathon: local or single VPS

### 11.3 Frontend Deployment
- Static build: `vite build` → deploy to Vercel / Netlify / Cloudflare Pages
- Environment: `VITE_API_URL`, `VITE_NETWORK_PASSPHRASE`

---

## Appendix A: Resolved Design Decisions

| # | Decision | Resolution | Rationale |
|---|----------|-----------|-----------|
| 1 | Who signs what | User wallet signs all fund-moving txs. Agent signs keeper calls with own key. | Security: user funds never leave wallet. Agent only needs gas for permissionless calls. |
| 2 | Agent identity | Separate Stellar account, contract role `manager_agent`, fee-only earnings, capped. | On-chain enforcement of agent limits. Agents are economic actors, not custodians. |
| 3 | Rotation fairness | Fixed order at creation. | Simplest contract logic. Bidding/random = Phase 2. |
| 4 | Frontend framework | Vite + React/TS | All Stellar wallet libs, examples, and scaffolds are React-first. No Stellar ecosystem for Svelte/HTMX. |
| 5 | Token approach | SAC direct transfer (require_auth), not approve+transferFrom | Soroban auth model handles this natively. Simpler than ERC-20 pattern. |
| 6 | Time mechanism | `env.ledger().timestamp()` (Unix seconds) | Human-readable periods (days/weeks). Ledger sequence is unpredictable for calendar time. |
| 7 | Round advancement | Permissionless external call (keeper pattern) | Soroban has no scheduler. Agent as keeper is the differentiator. |

## Appendix B: Reference Implementations

| Project | Chain | URL | Relevance |
|---------|-------|-----|-----------|
| Ahjoor | Soroban | github.com/Ahjoor/ahjoor-contract | Direct Soroban ROSCA — closest reference |
| BreadchainCoop | Ethereum | github.com/BreadchainCoop/saving-circles | Cleanest modern ROSCA design patterns |
| WeTrust | Ethereum | github.com/WeTrustPlatform/rosca-contracts | Battle-tested, supports bidding + random |
| Soroban Examples | Soroban | github.com/stellar/soroban-examples | Official patterns: timelock, atomic_swap, auth, token |
| Scaffold Stellar | Soroban | github.com/AhaLabs/scaffold-stellar | React + Vite + Soroban scaffold |
