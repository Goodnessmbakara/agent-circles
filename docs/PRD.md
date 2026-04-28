# Agent Circles — Product Requirements Document

**Version:** 1.2  
**Date:** 2026-04-27  
**Status:** Living — reflects implemented MVP + roadmap (codebase-aligned)

---

## 1. Problem Statement

Rotating Savings and Credit Associations (ROSCAs) — known as *ajo*, *susu*, *chit funds*, *tandas* — are one of the oldest financial coordination mechanisms. Billions of people use them. They fail for three reasons:

1. **Administrator trust breakdown.** The person holding the pot disappears. A member who saved faithfully for two years shows up for their turn — and finds the administrator's phone is off, one grey tick. There is no enforcement mechanism beyond social pressure, and social pressure is not enough even when you know the administrator personally, even when you know their family.

2. **Post-payout default.** A separate and equally damaging failure mode: a member receives the pot early in the rotation and then stops contributing. They got what they came for. Everyone who was supposed to receive after them is left shortchanged, with no recourse. This is distinct from the administrator problem — it is a *member* trust problem, and it is not solved simply by removing the administrator.

3. **Coordination overhead.** Someone must track contributions, remind members, handle disputes, and manage the schedule. This is unpaid labor — and the person doing it is usually the same person everyone is trusting not to disappear.

Blockchain solves (1) — funds are locked in a contract with deterministic rules, no administrator holds the pot. But it does not automatically solve (2), and raw contract interfaces are hostile to the communities that actually use ROSCAs. They need **guidance**, **reminders**, **behavioral incentives**, and **operational management** — not a block explorer.

**Agent Circles** solves all three problems: **on-chain enforcement** eliminates the administrator risk, a **keeper service** handles coordination automatically, and a **reputation + incentive system** (see §5.4) addresses post-payout default without requiring upfront collateral from users who may not have it.

---

## 2. Target Users

### Primary: Informal Savings Groups (wallet + Assistant UX)

- People already participating in ROSCAs (ajo, susu, tanda, chit)
- Comfortable with mobile wallets but not Solidity/Soroban
- Need: trust, transparency, someone to "run" the circle

### Secondary: Crypto-Native Groups

- Friends splitting costs, DAOs running treasury rounds
- Comfortable with wallets and contract interaction
- Need: automation, on-chain record, fee-earning for organizers

### Tertiary: Organizers & integrators

- People who run multiple circles and want **fee visibility**, **keeper automation**, and clear member UX
- Need: dashboards (post-MVP), registry labels, optional **keeper** opt-out per pool

### User Personas

**Amina (Saver):** Participates in a monthly ajo with 5 friends. Wants to know her money is safe and her turn will come. Does not want to learn Soroban.

**Tunde (Organizer):** Runs 3 different ajo groups. Spends hours tracking who paid. Wants automation and fair compensation for his coordination work.

**Dev (Builder/organizer):** Runs several pools; relies on **keeper** for round advancement and **Assistant** for member questions; may collect **manager fees** per on-chain rules. May use a future operator dashboard.

---

## 3. Product Vision & Goals

### Vision

The simplest way to run a trustless savings circle — where the rules are code, **round advancement can be automated by a keeper**, **members get an Assistant for questions and join help**, and funds follow deterministic on-chain rules.

### Goals (MVP / Hackathon)


| #   | Goal                                               | Metric                                                                                 |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| G1  | Demonstrate end-to-end ROSCA on Soroban            | Complete cycle: create → join → contribute × N rounds → payout                         |
| G2  | Show **keeper** as on-chain automation             | `advance_round` submitted by `AGENT_SECRET_KEY` when rules allow — visible in explorer |
| G3  | Prove **assistant** adds value beyond the contract | Explains mechanics, lists pools, prepares join (unsigned XDR), schedules reminders     |
| G4  | Working testnet demo for judges                    | Pool completes rotation in bounded demo time                                           |


### What we are building (current scope)

**Product shape:** Web app (**Vite + React + TypeScript**), **Fastify** backend, **Soroban** smart contract (`rosca_pool` / deployed WASM per pool instance), **Stellar testnet** (default asset: testnet **USDC** Stellar Asset Contract).

**On-chain:** Each pool is a **contract instance** (`C…`). The contract enforces contribution amount, schedule, member set, fixed payout order, manager fee (basis points), and vault asset. Members **join** and **contribute**; when conditions are satisfied, `**advance_round`** pays the round recipient (minus manager fee) and advances state. Queries expose config, state, members, rounds, and fees.

**Off-chain registry (backend):** Deployed contract IDs are stored in a **file-backed registry** (`data/registry.json`) with optional **display name** and per-pool `**keeper_enabled`** (default `true`). This metadata is **not** on-chain; it drives the app’s pool list, labels, and whether the **keeper** attempts automated `advance_round` for that pool.

**Pool creation (implemented direction):** The user **connects a wallet** and completes **deploy + initialize + register** in one flow: backend-assisted **WASM upload** and **contract create** (user-signed transactions), then **initialize** on the new contract ID, then **POST /api/pools/register** with optional name and `keeper_enabled`. No separate “paste contract ID” step is the long-term UX target once deploy is wired end-to-end in the client.

**Demo mode:** Backend routes can seed test accounts and run scripted scenarios (`/api/demo/*`) for presentations.

---

### Agent roles (terminology — read this before “agent” in user stories)

The word **agent** is overloaded. In this PRD we use three precise roles:

#### A. Keeper (automation service — **not** the LLM)


|                    |                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **What**           | Background service that signs **permissionless** `advance_round` (and delivers **due reminders** from the server queue).  |
| **Where**          | `backend/src/services/keeper.ts`                                                                                          |
| **Identity**       | Dedicated Stellar keypair: `AGENT_SECRET_KEY` (public key derived for inclusion in txs).                                  |
| **When it runs**   | On an interval (~15s) if `AGENT_SECRET_KEY` is configured; skips pools with `keeper_enabled === false` or inactive state. |
| **Chain effect**   | Submits signed transactions; pays network fees from the keeper account.                                                   |
| **What it is not** | Not conversational AI; does not read chat; does not sign **user** fund movements.                                         |


#### B. Pool assistant (LLM — product UI: **“Assistant”**)


|                    |                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**           | Conversational layer: answers questions, calls **tools** to read pool state, prepares **unsigned** join transactions, schedules **off-chain** reminders.  |
| **Where**          | `backend/src/agent/*`; HTTP `POST /api/agent/chat` (Claude via **AWS Bedrock** or **Anthropic** API).                                                     |
| **Identity**       | No Stellar keypair. No custody.                                                                                                                           |
| **Chain effect**   | **Read-only** via tools; **prepare_join** returns unsigned XDR **or** UI actions (`open_join`). User must sign in wallet.                                 |
| **What it is not** | Not “autonomous on-chain agent” in the Stellar **agentic payments** sense; not the round **keeper**. Branded **Assistant** in the UI to reduce confusion. |


#### C. User (human + wallet)


|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **What**         | Connects **Freighter** (etc.) via stellar-wallets-kit; signs all txs that move user funds and pool creation txs. |
| **Chain effect** | Sole signer for join, contribute, deploy/initialize, and any user-initiated operations.                          |


**Manager / fees:** The contract’s **manager** (and fee accrual) are set in **on-chain pool config** — typically the creator’s address or a designated manager. The **keeper** key is only for calling permissionless maintenance (`advance_round`); it is **not** automatically “the manager” unless configured that way in the contract. Fee **claim** flows may exist in the contract but are **not** exposed as LLM tools in the current build.

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

### Epic 2: Assistant & keeper coordination

**US-2.1** As a user, I want an **Assistant** (LLM) that explains how the pool works and answers my questions.

- Acceptance: Chat responds accurately using **tool-backed** pool data (not fabricated balances).

**US-2.2** As a user, I want the **Assistant** to prepare my **join** transaction so I only review and sign.

- Acceptance: `prepare_join` returns unsigned XDR or an **open join page** action; user signs in wallet; app submits.

**US-2.3** As a pool operator, I want **round advancement** to happen without a member manually calling it when possible.

- Acceptance: **Keeper** signs and submits `advance_round` when the contract accepts it; pools may opt out via `**keeper_enabled`**.

**US-2.4** As a user, I want **reminders** before my contribution is due.

- Acceptance: User or assistant schedules a reminder via `**schedule_reminder`**; **keeper** loop delivers due reminders (MVP: server log; not push notifications).

### Epic 3: Economics & manager role

**US-3.1** As a pool creator, I want to set a **manager fee** and have it enforced by the contract on payouts.

- Acceptance: Fee bps stored at initialization; visible in pool detail; enforced on-chain (not by the LLM).

**US-3.2** As a pool member, I want the manager fee to be transparent and immutable after pool creation.

- Acceptance: Fee visible in pool detail; cannot be changed after creation; enforced by contract.

**US-3.3** As an organizer, I want to see **fee summary** information for known pools.

- Acceptance: Backend + assistant tools expose **aggregated fee info** where implemented; full operator dashboard is post-MVP.

### Epic 4: Wallet & Auth

**US-4.1** As a user, I want to connect my Stellar wallet (Freighter, xBull, etc.) to interact with the app.

- Acceptance: Wallet connects; address displayed; network = Testnet.

**US-4.2** As a user, I want to sign transactions in my wallet (never expose my key to the app).

- Acceptance: All signing happens in wallet extension; app never sees private key.

---

## 5. Feature Specifications

### 5.1 Screens


| #   | Screen                  | Description                                                                                                                          | Priority |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| S1  | Landing                 | Problem/solution pitch, "Open App" CTA                                                                                               | P0       |
| S2  | Connect Wallet          | Freighter / multi-wallet via stellar-wallets-kit; show address                                                                       | P0       |
| S3  | Pool List               | User's pools + discoverable test pools                                                                                               | P0       |
| S4  | Create Pool             | Form + **deploy/register** flow: WASM upload + create + initialize + registry (name, **automate round advances** = `keeper_enabled`) | P0       |
| S5  | Pool Detail             | Status, members, current round, countdown, contribute CTA, history                                                                   | P0       |
| S6  | Join Pool               | Confirm terms; submit join tx                                                                                                        | P0       |
| S7  | Contribute              | Fixed amount; tx simulation preview; sign + submit                                                                                   | P0       |
| S8  | Payout                  | "Eligible for payout" indicator; trigger payout tx                                                                                   | P0       |
| S9  | Transaction History     | List of all pool txs with explorer links                                                                                             | P1       |
| S10 | Assistant (chat drawer) | LLM chat; tool-backed replies; **join** actions from `{ reply, actions }`; not streaming in current API                              | P0       |
| S11 | Agent Settings          | Toggle reminders; delegate limited rights                                                                                            | P1       |
| S12 | Operator Dashboard      | Pools managed, fees earned, alerts (if logged in as agent)                                                                           | P1       |
| S13 | Settings                | Network, RPC endpoint, disconnect wallet                                                                                             | P2       |
| S14 | Help / FAQ              | ROSCA explainer, testnet disclaimer                                                                                                  | P2       |
| S15 | Demo Mode               | One-click seed 5 test accounts via Friendbot                                                                                         | P0       |


### 5.2 Assistant tools (LLM — `POST /api/agent/chat`)

These are the **only** tools wired to the pool assistant today (`backend/src/agent/tools.ts` + `tool-executor.ts`):


| Tool                | Description                                                                             | Chain / side effect           |
| ------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| `list_pools`        | List pool contract IDs from the **off-chain registry**                                  | Read-only                     |
| `get_pool`          | Pool config, state, members, rounds, fees (from RPC/simulation)                         | Read-only                     |
| `get_wallet_pools`  | Find pools where a given **G…** address is a member                                     | Read-only                     |
| `get_fee_summary`   | Aggregate manager fee info across registered pools                                      | Read-only                     |
| `prepare_join`      | Build **unsigned** join XDR for connected wallet, or return **navigate to join** action | No server signing; user signs |
| `schedule_reminder` | Queue a **server-side** reminder (delivered by keeper cycle; MVP logs)                  | Off-chain queue only          |


**Not exposed to the LLM:** `advance_round`, contribute/build tx, pool creation, fee claim — those are **user flows** in the app or **keeper** automation, not chat tools.

### 5.3 Behavior rules (keeper vs assistant)

**Assistant (LLM)**  

1. **Never** holds or uses a private key; **never** signs transactions.
2. **Never** fabricates balances — tools must read chain/registry.
3. **May** return `actions` for the UI (e.g. open join, sign prepared XDR).
4. **Should** explain ROSCA mechanics using pool context when asked.

**Keeper (background service)**  

1. **May** sign only with `**AGENT_SECRET_KEY`**, for **permissionless** operations (principally `**advance_round`**).
2. **Does not** sign user fund movements.
3. **Respects** per-pool `**keeper_enabled`** in the registry.
4. **Delivers** due reminders from the reminder queue (MVP: log; production could be push/email).

**User**  

1. **Signs** all transactions that move their own funds and any **pool creation / deploy** steps via the wallet.

---

### 5.4 Post-Payout Default Prevention

> **Context:** Removing the administrator (via smart contract) solves the most visible ROSCA failure. But a second failure mode remains: a member receives their payout early in the rotation and then stops contributing. No collateral was taken; no social pressure remains strong enough. This section defines Agent Circles' layered response to this problem — designed specifically for non-crypto-native users in emerging markets who cannot be expected to lock up upfront capital.

#### Design principle

> Reputation is collateral. The goal is to make the cost of default *future-facing* rather than *upfront-financial* — so that the system is inclusive at entry but increasingly costly to abuse over time.

#### Layer 1 — On-Chain Participation History (Phase 2)

Every wallet that interacts with an Agent Circles pool accumulates a transparent, immutable on-chain record:

- Total rounds participated in across all pools
- Total rounds contributed on time
- Number of defaults (missed contributions after payout received)
- Number of complete cycles (all rounds fulfilled)

This history is **public and queryable** — pool creators and members can inspect any wallet's record before admitting them to a circle. New users start with a blank slate (not penalized); repeat defaulters carry a visible record they cannot erase.

**Implementation notes:**
- History aggregated off-chain by the backend registry (Phase 2); migrated to an on-chain reputation contract (Phase 3) for full trustlessness.
- Queried via a new assistant tool: `get_wallet_reputation(address)` — returns score, cycle count, default count.
- Pool creation form gains an optional **minimum reputation score** filter: the contract rejects join attempts from wallets below the threshold.

#### Layer 2 — Smart Incentive Structure (Phase 2)

Post-payout default is a rational economic choice if the only cost is social pressure. Layer 2 makes the cost real by attaching future access to current behavior:

**Priority queue for future payouts:**
- Members who complete a full cycle with no defaults earn **priority payout position** in their next pool — they can choose an earlier slot in the rotation.
- Members who default after receiving their payout are automatically placed at the **last position** in their next circle's payout queue (not excluded — recoverable).
- Two or more defaults within a rolling 12-month window triggers a **30-day cooldown** before joining new pools.

**How this changes behavior:**
- Early-round recipients (high default risk) have a concrete future stake: their next payout position depends on completing this cycle.
- Late-round members (lower default risk) are rewarded for their patience with faster future access.
- Defaulters are not permanently excluded — recovery is possible — but re-entry costs are real and visible.

**Implementation notes:**
- Priority queue enforced at join time by the backend registry cross-referencing wallet reputation.
- Cooldown enforced on-chain via a `last_default_timestamp` field in the reputation contract (Phase 3); backend-enforced in registry for Phase 2.
- The assistant surfaces this to members: *"Your current participation score gives you priority access in your next circle."*

#### Out of scope (documented for future reference)

The following mechanisms were evaluated and deferred:

- **Collateral/slashing** — Requires upfront stablecoin holdings; excludes the primary target market. Viable as an opt-in feature for large pools (>$500 equivalent) in Phase 3.
- **Insurance pool** — Platform-funded default coverage is a Phase 3 consideration once default rate data exists. Actuarially risky to implement before baseline data is collected.
- **Randomized payout order** — Research shows this *increases* default risk vs. fixed order. Not recommended.
- **Joint liability** — Members covering each other's defaults. Culturally familiar but regressive; penalizes members with least liquidity. Deferred to Phase 3 as an opt-in group setting.

---

## 6. Technical Architecture Summary

See **SRS** if present for full detail. Summary:

```
Frontend (Vite + React/TS)
    ↓ REST (/api/*)
Backend (Node / Fastify / TS)
    ├→ Soroban RPC + Horizon (reads, tx build, submit)
    ├→ Keeper loop (AGENT_SECRET_KEY) → sign advance_round, deliver reminders
    └→ Assistant (Bedrock / Anthropic) → tool calls → same read/build helpers (no key)

Stellar Testnet
    ↕ rosca_pool WASM (Rust / Soroban)
    ↕ Asset: USDC SAC (testnet default) or configured SAC
```

### Frontend Decision: Vite + React/TypeScript

**Evaluated:** Vite+React/TS, SvelteKit, HTMX
**Winner:** Vite + React/TypeScript (9.35/10 weighted score)


| Factor                 | Vite+React            | SvelteKit       | HTMX         |
| ---------------------- | --------------------- | --------------- | ------------ |
| Stellar wallet libs    | First-class           | Manual wrapping | Incompatible |
| Stellar examples       | All official examples | None            | None         |
| Agent chat UI          | Rich ecosystem        | Good            | Incompatible |
| Hackathon velocity     | Highest               | Moderate        | Poor         |
| TypeScript + SDK types | Native                | Good            | N/A          |


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
- Assistant chat drawer (non-streaming API) with tool-backed responses
- Pool dashboard with live state from chain

**Backend:**

- Transaction builder (prepare → return unsigned XDR; deploy/upload/create helpers as implemented)
- Pool registry file + **pool-api** normalization for JSON (e.g. BigInt-safe DTOs)
- Assistant: **7 tools** (see §5.2); `POST /api/agent/chat` returns `{ reply, actions }`
- **Keeper** interval + **reminder** queue (in-memory MVP)
- Raw `**getTransaction`** polling where needed for Soroban meta compatibility

**Assistant + keeper:**

- **Assistant:** Claude tool-use; read + `prepare_join` + reminders only
- **Keeper:** signs `**advance_round`** only (not user txs); does not “earn” by default — **manager fee** accrues per **contract config**

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
- **Post-payout default prevention — Layer 1:** Off-chain participation history per wallet; `get_wallet_reputation` assistant tool; minimum reputation filter on pool creation (see §5.4)
- **Post-payout default prevention — Layer 2:** Priority payout queue for future circles based on completion history; 30-day cooldown for repeat defaulters; assistant surfaces reputation status to members (see §5.4)

### Phase 3: Scale

- Pool discovery / marketplace
- **Reputation contract on-chain:** Migrate wallet history from backend registry to a Soroban reputation contract — fully trustless, no reliance on Agent Circles backend to verify track record (see §5.4)
- **Opt-in collateral for large pools:** Stablecoin collateral + auto-slash for pools above a configurable size threshold; yield-bearing while locked (see §5.4 — "Out of scope" items)
- **Platform insurance pool:** Default coverage funded by transaction fees once baseline default-rate data exists (see §5.4)
- Multi-agent competition (agents compete on fee + reliability)
- Mobile (React Native or PWA)
- Fiat on/off ramp integration

---

## 8. Success Metrics (Hackathon)


| Metric                                      | Target                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Full ROSCA cycle on testnet                 | Members join, contribute, rounds advance, payouts visible             |
| **Keeper** advances rounds when rules allow | Explorer shows `advance_round` from keeper account                    |
| **Assistant** improves UX                   | Accurate pool Q&A + join prep without signing for users               |
| Manager fee (if configured)                 | Accrued per contract; visible in pool/fee tools                       |
| Demo time                                   | Bounded demo (scripted or manual)                                     |
| Judge comprehension                         | Clear distinction: **keeper** = automation, **Assistant** = chat help |


---

## 9. Risks & Mitigations


| Risk                                        | Impact                           | Mitigation                                                                  |
| ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Soroban contract bugs (reentrancy, storage) | Funds locked/lost on testnet     | Reference Ahjoor + BreadchainCoop patterns; comprehensive unit tests        |
| Wallet integration complexity               | Blocks frontend progress         | Use stellar-wallets-kit (proven multi-wallet); start with Freighter only    |
| Assistant hallucinating pool data           | User makes bad decisions         | Tools MUST query chain/registry; system prompt forbids fabricating balances |
| Soroban RPC rate limits / instability       | Demo fails                       | Cache aggressively; have fallback read from Horizon; test on testnet early  |
| Scope creep (DeFi treasury features)        | Miss core ROSCA                  | Economy v1 = idle USDC only; no DeFi in MVP                                 |
| Contract storage TTL expiry                 | Pool state archived mid-rotation | Bump TTL on every interaction; set 60-day extend                            |
| Post-payout member default                  | Late-round members shortchanged; trust in platform erodes | Layer 1 + 2 reputation system (§5.4); priority queue disincentivises exit; full collateral option deferred to Phase 3 |


---

## 10. Resolved Decisions (from Spec §10)

### Decision 1: Who signs what

**Answer:** The **user’s wallet** signs every transaction that moves **user** funds, plus **deploy / initialize** for new pool instances. The **keeper** uses `**AGENT_SECRET_KEY`** only for **permissionless** txs (notably `**advance_round`**). The **assistant** never signs.

### Decision 2: Two “agents” — naming and responsibility

**Answer:** **Keeper** = automated signer + reminder delivery (server). **Assistant** = LLM + tools (no key). Product UI calls the LLM **“Assistant”** so users do not confuse chat with on-chain automation. Stellar hackathon “Agentic AI” narratives (e.g. MPP/x402) are **not** in scope for MVP unless explicitly added later.

### Decision 3: Keeper opt-out

**Answer:** Each registered pool may set `**keeper_enabled: false`** so the backend **does not** auto-call `advance_round` for that pool (round advancement must be triggered manually or by another client).

### Decision 4: Manager vs keeper

**Answer:** **Manager fee** and **manager address** are defined **in the contract** at initialization. The keeper key is **not** automatically the fee recipient unless the pool was configured that way.

### Decision 5: Rotation fairness

**Answer:** Fixed order at pool creation for MVP. Reordering / bidding — Phase 2+.