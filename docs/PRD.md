# Agent Circles — Product Requirements Document

**Version:** 1.0
**Date:** 2026-04-09
**Status:** Draft — MVP / Stellar Hackathon Build

---

## 1. Problem Statement

Rotating Savings and Credit Associations (ROSCAs) — known as *ajo*, *susu*, *chit funds*, *tandas* — are one of the oldest financial coordination mechanisms. Billions of people use them. They fail for two reasons:

1. **Trust breakdown.** A member collects the pot early and disappears. There is no enforcement mechanism beyond social pressure.
2. **Coordination overhead.** Someone must track contributions, remind members, handle disputes, and manage the schedule. This is unpaid labor.

Blockchain solves (1) — funds are locked in a contract with deterministic rules. But raw contract interfaces are hostile to the communities that actually use ROSCAs. They need **guidance**, **reminders**, and **operational management** — not a block explorer.

**Agent Circles** solves both problems: **on-chain enforcement** for trust, **AI agents** for coordination.

---

## 2. Target Users

### Primary: Informal Savings Groups (via agent onboarding)
- People already participating in ROSCAs (ajo, susu, tanda, chit)
- Comfortable with mobile wallets but not Solidity/Soroban
- Need: trust, transparency, someone to "run" the circle

### Secondary: Crypto-Native Groups
- Friends splitting costs, DAOs running treasury rounds
- Comfortable with wallets and contract interaction
- Need: automation, on-chain record, fee-earning for organizers

### Tertiary: Agent Operators
- Developers or power users who deploy agents to manage pools
- Earn manager fees for providing coordination services
- Need: tools, dashboards, fee visibility

### User Personas

**Amina (Saver):** Participates in a monthly ajo with 5 friends. Wants to know her money is safe and her turn will come. Does not want to learn Soroban.

**Tunde (Organizer):** Runs 3 different ajo groups. Spends hours tracking who paid. Wants automation and fair compensation for his coordination work.

**Dev (Agent Operator):** Deploys an AI agent that manages 10 pools simultaneously. The agent earns 2% fees on each payout. Dev monitors via dashboard.

---

## 3. Product Vision & Goals

### Vision
The simplest way to run a trustless savings circle — where the rules are code, the coordinator is an agent, and the money never leaves the chain until it's your turn.

### Goals (MVP / Hackathon)

| # | Goal | Metric |
|---|------|--------|
| G1 | Demonstrate end-to-end ROSCA on Soroban | Complete cycle: create → join → contribute × N rounds → payout |
| G2 | Show agent as economic actor | Agent creates pool, manages rounds, earns fee — visible on-chain |
| G3 | Prove agent adds value beyond contract | Agent handles reminders, explains mechanics, builds txs for users |
| G4 | Working testnet demo for judges | 5-member pool completes full rotation in < 15 min demo |

---

## 4. User Stories

### Epic 1: Pool Lifecycle

**US-1.1** As a user, I want to create a savings pool with fixed terms (amount, period, members, fee) so everyone knows the rules upfront.
- Acceptance: Pool created on-chain with correct params; visible in pool list.

**US-1.2** As a user, I want to join an open pool so I can participate in the savings circle.
- Acceptance: User address added to member list on-chain; pool activates when full.

**US-1.3** As a member, I want to contribute my fixed amount each round so I fulfill my obligation.
- Acceptance: USDC transferred to contract vault; contribution recorded per-round per-member.

**US-1.4** As the round recipient, I want to receive the full pot (minus fee) when all contributions are in.
- Acceptance: Payout transferred from vault to recipient on-chain; round advances.

**US-1.5** As a member, I want to see pool status (round, who paid, who's next, countdown) so I can track progress.
- Acceptance: Pool detail screen shows real-time state from chain.

### Epic 2: Agent Coordination

**US-2.1** As a user, I want an AI assistant that explains how the pool works and answers my questions.
- Acceptance: Agent chat responds accurately about pool mechanics, my status, and next actions.

**US-2.2** As a user, I want the agent to build transactions for me so I only need to review and sign.
- Acceptance: Agent proposes tx; I see simulation result; I sign with wallet; tx submits.

**US-2.3** As a pool, I want round advancement to happen automatically without a member manually triggering it.
- Acceptance: Agent (or keeper) calls `advance_round` when conditions are met.

**US-2.4** As a user, I want reminders before my contribution is due.
- Acceptance: Agent sends notification (in-app or via chat) before round deadline.

### Epic 3: Agent as Economic Actor

**US-3.1** As an agent operator, I want my agent to create and manage pools, earning a declared fee.
- Acceptance: Agent address registered as manager; fee % stored on-chain; fee paid on each payout.

**US-3.2** As a pool member, I want the manager fee to be transparent and immutable after pool creation.
- Acceptance: Fee visible in pool detail; cannot be changed after creation; enforced by contract.

**US-3.3** As an agent operator, I want to see fees earned across all managed pools.
- Acceptance: Operator dashboard shows total fees, per-pool breakdown, recent payouts.

### Epic 4: Wallet & Auth

**US-4.1** As a user, I want to connect my Stellar wallet (Freighter, xBull, etc.) to interact with the app.
- Acceptance: Wallet connects; address displayed; network = Testnet.

**US-4.2** As a user, I want to sign transactions in my wallet (never expose my key to the app).
- Acceptance: All signing happens in wallet extension; app never sees private key.

---

## 5. Feature Specifications

### 5.1 Screens

| # | Screen | Description | Priority |
|---|--------|-------------|----------|
| S1 | Landing | Problem/solution pitch, "Open App" CTA | P0 |
| S2 | Connect Wallet | Freighter / multi-wallet via stellar-wallets-kit; show address | P0 |
| S3 | Pool List | User's pools + discoverable test pools | P0 |
| S4 | Create Pool | Form: amount, period, max members, fee %, manager (self/agent), asset | P0 |
| S5 | Pool Detail | Status, members, current round, countdown, contribute CTA, history | P0 |
| S6 | Join Pool | Confirm terms; submit join tx | P0 |
| S7 | Contribute | Fixed amount; tx simulation preview; sign + submit | P0 |
| S8 | Payout | "Eligible for payout" indicator; trigger payout tx | P0 |
| S9 | Transaction History | List of all pool txs with explorer links | P1 |
| S10 | Agent Chat Panel | Copilot drawer; natural language interaction; shows planned tx | P0 |
| S11 | Agent Settings | Toggle reminders; delegate limited rights | P1 |
| S12 | Operator Dashboard | Pools managed, fees earned, alerts (if logged in as agent) | P1 |
| S13 | Settings | Network, RPC endpoint, disconnect wallet | P2 |
| S14 | Help / FAQ | ROSCA explainer, testnet disclaimer | P2 |
| S15 | Demo Mode | One-click seed 5 test accounts via Friendbot | P0 |

### 5.2 Agent Tools (API Surface)

| Tool | Description | Chain Effect |
|------|-------------|--------------|
| `list_pools` | Query indexed pools | Read-only |
| `get_pool` | Pool detail + member status | Read-only |
| `create_pool` | Build create tx for user to sign | Creates pool on-chain |
| `join_pool` | Build join tx for user to sign | Adds member on-chain |
| `build_contribute_tx` | Build contribution tx for user to sign | Deposits USDC to vault |
| `advance_round` | Agent calls directly (permissionless) | Triggers payout if conditions met |
| `claim_manager_fee` | Agent claims earned fee | Transfers fee to agent address |
| `schedule_reminder` | Set off-chain reminder | None (off-chain only) |
| `get_member_status` | Check contribution status for a member | Read-only |
| `explain_pool` | Generate explanation of pool terms | None |

### 5.3 Agent Behavior Rules

1. Agent NEVER signs transactions that move user funds. It only builds unsigned txs.
2. Agent CAN sign keeper transactions (advance_round) with its own keypair.
3. Agent CAN claim its own manager fees from pools it manages.
4. Agent MUST show the user what a transaction will do before requesting signature.
5. Agent MUST NOT fabricate pool data — always query chain/index first.
6. Agent SHOULD explain ROSCA mechanics when asked, using pool-specific context.

---

## 6. Technical Architecture Summary

See **SRS** for full detail. Summary:

```
Frontend (Vite + React/TS)
    ↓ REST/WebSocket
Backend (Node/Fastify/TS)
    ↓ Soroban RPC + Horizon
Stellar Network (Testnet)
    ↕ Soroban Contract (Rust)
    ↕ USDC (SAC) + XLM

Agent (Claude API + Tools) → Backend API → Soroban RPC
```

### Frontend Decision: Vite + React/TypeScript

**Evaluated:** Vite+React/TS, SvelteKit, HTMX
**Winner:** Vite + React/TypeScript (9.35/10 weighted score)

| Factor | Vite+React | SvelteKit | HTMX |
|--------|-----------|-----------|------|
| Stellar wallet libs | First-class | Manual wrapping | Incompatible |
| Stellar examples | All official examples | None | None |
| Agent chat UI | Rich ecosystem | Good | Incompatible |
| Hackathon velocity | Highest | Moderate | Poor |
| TypeScript + SDK types | Native | Good | N/A |

**Rationale:** Every Stellar example dApp, scaffold tool, and wallet library is React-first. SvelteKit is a good framework but has zero Stellar ecosystem support. HTMX is architecturally incompatible with client-side wallet signing and streaming chat UIs. For a 1-week hackathon, ecosystem alignment is decisive.

**Note:** Stellar docs reference SolidJS in one tutorial but all example dApps and community projects use React. We follow the ecosystem, not a single tutorial.

---

## 7. MVP Scope & Phasing

### Phase 1: MVP (Hackathon Week)

**Contract:**
- Single `rosca_pool` contract: initialize, join, contribute, advance_round, claim (payout), manager fee
- Fixed rotation order (set at creation)
- USDC (testnet SAC) as sole asset
- Manager fee capped at pool creation (max 5%)

**Frontend:**
- Screens S1-S8, S10, S15 (P0 items)
- Wallet connect via stellar-wallets-kit (Freighter primary)
- Agent chat drawer with streaming responses
- Pool dashboard with live state from chain

**Backend:**
- Transaction builder (prepare → return unsigned XDR)
- Pool indexer (cache chain state for fast reads)
- Agent tool endpoints (10 tools)
- Reminder queue (in-memory or simple DB)

**Agent:**
- Claude tool-use with 10 tools
- Explains pools, builds txs, triggers round advancement
- Earns manager fee on managed pools

**Demo:**
- Friendbot-funded test accounts
- Pre-seeded pool with 5 members
- Scripted full rotation for live demo

### Phase 2: Post-Hackathon

- Operator dashboard (S12)
- Transaction history with CSV export (S9)
- Agent settings / delegation (S11)
- Multiple pool types (bidding, random)
- Telegram notifications with deep links
- Treasury allowlist (one DEX path for idle USDC)
- Multiple assets beyond USDC
- Mainnet deployment

### Phase 3: Scale

- Pool discovery / marketplace
- Reputation system (on-chain contribution history)
- Multi-agent competition (agents compete on fee + reliability)
- Mobile (React Native or PWA)
- Fiat on/off ramp integration

---

## 8. Success Metrics (Hackathon)

| Metric | Target |
|--------|--------|
| Full ROSCA cycle on testnet | 5 members, N rounds, all payouts |
| Agent creates + manages pool | End-to-end without human intervention for keeper duties |
| Agent earns fee on-chain | Verifiable in explorer |
| Demo time | < 15 minutes for full rotation |
| Judge comprehension | "I understand what this does and why agents matter" |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Soroban contract bugs (reentrancy, storage) | Funds locked/lost on testnet | Reference Ahjoor + BreadchainCoop patterns; comprehensive unit tests |
| Wallet integration complexity | Blocks frontend progress | Use stellar-wallets-kit (proven multi-wallet); start with Freighter only |
| Agent hallucinating pool data | User makes bad decisions | Agent tools MUST query chain; never fabricate; show source tx |
| Soroban RPC rate limits / instability | Demo fails | Cache aggressively; have fallback read from Horizon; test on testnet early |
| Scope creep (DeFi treasury features) | Miss core ROSCA | Economy v1 = idle USDC only; no DeFi in MVP |
| Contract storage TTL expiry | Pool state archived mid-rotation | Bump TTL on every interaction; set 60-day extend |

---

## 10. Resolved Decisions (from Spec §10)

### Decision 1: Who Signs What
**Answer:** User wallet signs ALL transactions that move user funds. Agent builds unsigned XDR and presents for review. Agent has its own testnet keypair for permissionless keeper calls (advance_round) and claiming its own manager fees. On testnet, agent key is in environment variable.

### Decision 2: Agent Identity
**Answer:** Separate Stellar account. Contract-enforced role: `manager_agent`. Can call permissionless functions, earn declared fees (capped at creation), and call advance_round. Cannot move member funds or change pool terms.

### Decision 3: Rotation Fairness
**Answer:** Fixed order determined at pool creation for MVP. Members see the order before joining. Agent can *suggest* an order (e.g., random shuffle) but the order is locked when the pool activates. Reordering and bidding are Phase 2 features.
