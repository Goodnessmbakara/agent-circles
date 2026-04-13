# Agent Circles — Phase 1: Smart Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test the Soroban ROSCA pool contract — the on-chain foundation everything else depends on.

**Architecture:** Single Rust crate (`contracts/rosca_pool`) containing all pool logic. Contract address acts as the vault. SAC TokenClient for USDC transfers. Fixed rotation order. Permissionless `advance_round` with time-gating. Manager fee in basis points, capped at 500 (5%).

**Tech Stack:** Rust, soroban-sdk, soroban-sdk::token::Client, Soroban test framework (`#[test]` with `Env::default()`)

**Prereqs:** `stellar-cli` installed, Rust + `wasm32-unknown-unknown` target installed. Run `rustup target add wasm32-unknown-unknown` if missing.

---

## File Structure

```
contracts/
└── rosca_pool/
    ├── Cargo.toml              # Crate config: soroban-sdk, soroban-token-sdk
    ├── src/
    │   ├── lib.rs              # Contract entry point, #[contract] + #[contractimpl]
    │   ├── types.rs            # RoscaConfig, RoscaState, DataKey, MemberStatus, RoscaError
    │   ├── storage.rs          # Read/write helpers for Instance + Persistent storage
    │   └── test.rs             # All contract tests
    └── .stellar/               # Generated after first build
```

---

### Task 1: Scaffold the Soroban Contract Crate

**Files:**
- Create: `contracts/rosca_pool/Cargo.toml`
- Create: `contracts/rosca_pool/src/lib.rs`
- Create: `contracts/rosca_pool/src/types.rs`
- Create: `contracts/rosca_pool/src/storage.rs`
- Create: `contracts/rosca_pool/src/test.rs`
- Create: `Cargo.toml` (workspace root)

- [ ] **Step 1: Create workspace Cargo.toml**

```toml
# Cargo.toml (workspace root at /stellar_build/)
[workspace]
resolver = "2"
members = ["contracts/*"]

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

- [ ] **Step 2: Create contract Cargo.toml**

```toml
# contracts/rosca_pool/Cargo.toml
[package]
name = "rosca-pool"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib"]
doctest = false

[dependencies]
soroban-sdk = { version = "22.0.0" }
soroban-token-sdk = { version = "22.0.0" }

[dev-dependencies]
soroban-sdk = { version = "22.0.0", features = ["testutils"] }
```

- [ ] **Step 3: Create types.rs with all data structures**

```rust
// contracts/rosca_pool/src/types.rs
use soroban_sdk::{contracttype, contracterror, Address, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RoscaError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PoolFull = 3,
    AlreadyMember = 4,
    NotMember = 5,
    WrongState = 6,
    AlreadyContributed = 7,
    RoundNotComplete = 8,
    RoundNotElapsed = 9,
    NotAdmin = 10,
    FeeTooHigh = 11,
    InsufficientBalance = 12,
    MemberLimitExceeded = 13,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RoscaState {
    Setup,
    Active,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoscaConfig {
    pub contribution_amount: i128,
    pub round_period: u64,
    pub start_time: u64,
    pub max_members: u32,
    pub manager_fee_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberStatus {
    pub contributed_this_round: bool,
    pub has_received_payout: bool,
    pub total_contributed: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Config,
    State,
    CurrentRound,
    Members,
    Manager,
    RoundDeposit(u32, Address),
    HasReceived(Address),
    TotalContributed(Address),
    RoundRecipient(u32),
    ManagerFeePaid(u32),
}
```

- [ ] **Step 4: Create storage.rs with read/write helpers**

```rust
// contracts/rosca_pool/src/storage.rs
use soroban_sdk::{Address, Env, Vec};

use crate::types::{DataKey, RoscaConfig, RoscaState};

const TTL_THRESHOLD: u32 = 518_400;   // ~30 days
const TTL_EXTEND: u32 = 1_036_800;    // ~60 days

// --- Instance storage ---

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn set_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::Token, token);
}

pub fn get_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

pub fn set_config(env: &Env, config: &RoscaConfig) {
    env.storage().instance().set(&DataKey::Config, config);
}

pub fn get_config(env: &Env) -> RoscaConfig {
    env.storage().instance().get(&DataKey::Config).unwrap()
}

pub fn set_state(env: &Env, state: &RoscaState) {
    env.storage().instance().set(&DataKey::State, state);
}

pub fn get_state(env: &Env) -> RoscaState {
    env.storage().instance().get(&DataKey::State).unwrap()
}

pub fn set_current_round(env: &Env, round: u32) {
    env.storage().instance().set(&DataKey::CurrentRound, &round);
}

pub fn get_current_round(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::CurrentRound).unwrap()
}

pub fn set_members(env: &Env, members: &Vec<Address>) {
    env.storage().instance().set(&DataKey::Members, members);
}

pub fn get_members(env: &Env) -> Vec<Address> {
    env.storage().instance().get(&DataKey::Members).unwrap()
}

pub fn set_manager(env: &Env, manager: &Address) {
    env.storage().instance().set(&DataKey::Manager, manager);
}

pub fn get_manager(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Manager).unwrap()
}

pub fn has_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

// --- Persistent storage ---

pub fn set_round_deposit(env: &Env, round: u32, member: &Address, amount: i128) {
    let key = DataKey::RoundDeposit(round, member.clone());
    env.storage().persistent().set(&key, &amount);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

pub fn get_round_deposit(env: &Env, round: u32, member: &Address) -> i128 {
    let key = DataKey::RoundDeposit(round, member.clone());
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn set_has_received(env: &Env, member: &Address, received: bool) {
    let key = DataKey::HasReceived(member.clone());
    env.storage().persistent().set(&key, &received);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

pub fn get_has_received(env: &Env, member: &Address) -> bool {
    let key = DataKey::HasReceived(member.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_total_contributed(env: &Env, member: &Address, total: i128) {
    let key = DataKey::TotalContributed(member.clone());
    env.storage().persistent().set(&key, &total);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

pub fn get_total_contributed(env: &Env, member: &Address) -> i128 {
    let key = DataKey::TotalContributed(member.clone());
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn set_round_recipient(env: &Env, round: u32, recipient: &Address) {
    let key = DataKey::RoundRecipient(round);
    env.storage().persistent().set(&key, recipient);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

pub fn set_manager_fee_paid(env: &Env, round: u32, amount: i128) {
    let key = DataKey::ManagerFeePaid(round);
    env.storage().persistent().set(&key, &amount);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

pub fn get_manager_fee_paid(env: &Env, round: u32) -> i128 {
    let key = DataKey::ManagerFeePaid(round);
    env.storage().persistent().get(&key).unwrap_or(0)
}

// --- TTL management ---

pub fn bump_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
}
```

- [ ] **Step 5: Create lib.rs with empty contract skeleton**

```rust
// contracts/rosca_pool/src/lib.rs
#![no_std]

mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, Env, Vec};
use types::{DataKey, MemberStatus, RoscaConfig, RoscaError, RoscaState};

#[contract]
pub struct RoscaPool;

#[contractimpl]
impl RoscaPool {
    /// Initialize a new ROSCA pool. Caller becomes admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        contribution_amount: i128,
        round_period: u64,
        max_members: u32,
        manager: Address,
        manager_fee_bps: u32,
    ) -> Result<(), RoscaError> {
        todo!()
    }

    /// Join a pool in Setup state.
    pub fn join(env: Env, member: Address) -> Result<(), RoscaError> {
        todo!()
    }

    /// Contribute to the current round.
    pub fn contribute(env: Env, member: Address) -> Result<(), RoscaError> {
        todo!()
    }

    /// Advance to next round and trigger payout. Permissionless.
    pub fn advance_round(env: Env) -> Result<(), RoscaError> {
        todo!()
    }

    /// Emergency cancellation — admin only.
    pub fn decommission(env: Env, admin: Address) -> Result<(), RoscaError> {
        todo!()
    }

    /// Extend storage TTL. Permissionless.
    pub fn bump_storage(env: Env) {
        storage::bump_instance_ttl(&env);
    }

    // --- Read-only ---

    pub fn get_config(env: Env) -> RoscaConfig {
        storage::get_config(&env)
    }

    pub fn get_state(env: Env) -> RoscaState {
        storage::get_state(&env)
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        storage::get_members(&env)
    }

    pub fn get_current_round(env: Env) -> u32 {
        storage::get_current_round(&env)
    }

    pub fn get_round_deposits(env: Env, round: u32) -> Vec<(Address, i128)> {
        let members = storage::get_members(&env);
        let mut deposits = Vec::new(&env);
        for i in 0..members.len() {
            let member = members.get(i).unwrap();
            let amount = storage::get_round_deposit(&env, round, &member);
            deposits.push_back((member, amount));
        }
        deposits
    }

    pub fn get_member_status(env: Env, member: Address) -> MemberStatus {
        let round = storage::get_current_round(&env);
        MemberStatus {
            contributed_this_round: storage::get_round_deposit(&env, round, &member) > 0,
            has_received_payout: storage::get_has_received(&env, &member),
            total_contributed: storage::get_total_contributed(&env, &member),
        }
    }

    pub fn get_manager_fees(env: Env) -> i128 {
        let round = storage::get_current_round(&env);
        let mut total: i128 = 0;
        for r in 0..round {
            total += storage::get_manager_fee_paid(&env, r);
        }
        total
    }
}
```

- [ ] **Step 6: Create empty test file**

```rust
// contracts/rosca_pool/src/test.rs
#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};
use crate::{RoscaPool, RoscaPoolClient};
```

- [ ] **Step 7: Verify it compiles**

Run: `cd /Users/abba/Desktop/stellar_build && cargo check`
Expected: Compiles with warnings about `todo!()` being unreachable. No errors.

- [ ] **Step 8: Commit**

```bash
git init
git add Cargo.toml contracts/
git commit -m "feat: scaffold rosca_pool Soroban contract crate"
```

---

### Task 2: Implement `initialize` + Test

**Files:**
- Modify: `contracts/rosca_pool/src/lib.rs` (replace `initialize` todo)
- Modify: `contracts/rosca_pool/src/test.rs` (add tests)

- [ ] **Step 1: Write the failing test for initialize**

Add to `contracts/rosca_pool/src/test.rs`:

```rust
#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, Vec,
};

use crate::{RoscaPool, RoscaPoolClient};
use crate::types::RoscaState;

fn setup_token(env: &Env, admin: &Address) -> (Address, TokenClient<'_>, StellarAssetClient<'_>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token = TokenClient::new(env, &token_address);
    let token_admin = StellarAssetClient::new(env, &token_address);
    (token_address, token, token_admin)
}

fn setup_contract(env: &Env) -> (RoscaPoolClient<'_>, Address) {
    let contract_id = env.register(RoscaPool, ());
    let client = RoscaPoolClient::new(env, &contract_id);
    (client, contract_id)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _token, _token_admin) = setup_token(&env, &admin);
    let (client, _contract_id) = setup_contract(&env);

    client.initialize(
        &admin,
        &token_address,
        &1_000_000_i128,   // 1 USDC (7 decimals)
        &60_u64,            // 60 second rounds
        &5_u32,             // 5 members
        &manager,
        &200_u32,           // 2% fee
    );

    let config = client.get_config();
    assert_eq!(config.contribution_amount, 1_000_000);
    assert_eq!(config.round_period, 60);
    assert_eq!(config.max_members, 5);
    assert_eq!(config.manager_fee_bps, 200);

    let state = client.get_state();
    assert_eq!(state, RoscaState::Setup);

    let members = client.get_members();
    assert_eq!(members.len(), 0);

    let round = client.get_current_round();
    assert_eq!(round, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_initialize_fee_too_high() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    client.initialize(
        &admin,
        &token_address,
        &1_000_000_i128,
        &60_u64,
        &5_u32,
        &manager,
        &501_u32,  // > 500 bps, should fail
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    client.initialize(&admin, &token_address, &1_000_000_i128, &60_u64, &5_u32, &manager, &200_u32);
    client.initialize(&admin, &token_address, &1_000_000_i128, &60_u64, &5_u32, &manager, &200_u32);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool 2>&1 | head -30`
Expected: Panics with `todo!()` — tests fail.

- [ ] **Step 3: Implement initialize**

Replace the `initialize` function in `contracts/rosca_pool/src/lib.rs`:

```rust
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        contribution_amount: i128,
        round_period: u64,
        max_members: u32,
        manager: Address,
        manager_fee_bps: u32,
    ) -> Result<(), RoscaError> {
        if storage::has_initialized(&env) {
            return Err(RoscaError::AlreadyInitialized);
        }
        if manager_fee_bps > 500 {
            return Err(RoscaError::FeeTooHigh);
        }

        admin.require_auth();

        storage::set_admin(&env, &admin);
        storage::set_token(&env, &token);
        storage::set_manager(&env, &manager);
        storage::set_state(&env, &RoscaState::Setup);
        storage::set_current_round(&env, 0);
        storage::set_members(&env, &Vec::new(&env));

        let config = RoscaConfig {
            contribution_amount,
            round_period,
            start_time: 0, // set when pool activates
            max_members,
            manager_fee_bps,
        };
        storage::set_config(&env, &config);

        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("pool"), symbol_short!("created")),
            (admin, token, contribution_amount),
        );

        Ok(())
    }
```

Also add the missing import at the top of `lib.rs`:

```rust
use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Vec};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "feat(contract): implement initialize with fee cap validation"
```

---

### Task 3: Implement `join` + Test

**Files:**
- Modify: `contracts/rosca_pool/src/lib.rs` (replace `join` todo)
- Modify: `contracts/rosca_pool/src/test.rs` (add tests)

- [ ] **Step 1: Write failing tests for join**

Add to `test.rs`:

```rust
// Helper to initialize a pool
fn init_pool(env: &Env, client: &RoscaPoolClient, admin: &Address, token: &Address, manager: &Address, max_members: u32) {
    client.initialize(admin, token, &1_000_000_i128, &60_u64, &max_members, manager, &200_u32);
}

#[test]
fn test_join() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    init_pool(&env, &client, &admin, &token_address, &manager, 3);

    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);

    client.join(&member1);
    assert_eq!(client.get_members().len(), 1);
    assert_eq!(client.get_state(), RoscaState::Setup);

    client.join(&member2);
    assert_eq!(client.get_members().len(), 2);
    assert_eq!(client.get_state(), RoscaState::Setup);
}

#[test]
fn test_join_activates_when_full() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    init_pool(&env, &client, &admin, &token_address, &manager, 2);

    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);

    client.join(&member1);
    client.join(&member2);

    assert_eq!(client.get_state(), RoscaState::Active);
    assert_eq!(client.get_members().len(), 2);
    // start_time should be set
    let config = client.get_config();
    assert!(config.start_time > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_join_full_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    init_pool(&env, &client, &admin, &token_address, &manager, 2);

    client.join(&Address::generate(&env));
    client.join(&Address::generate(&env));
    client.join(&Address::generate(&env)); // 3rd member, should fail
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_join_duplicate() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    init_pool(&env, &client, &admin, &token_address, &manager, 3);

    let member = Address::generate(&env);
    client.join(&member);
    client.join(&member); // duplicate, should fail
}
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool test_join 2>&1 | head -20`
Expected: Fails with `todo!()`

- [ ] **Step 3: Implement join**

Replace the `join` function in `lib.rs`:

```rust
    pub fn join(env: Env, member: Address) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state != RoscaState::Setup {
            return Err(RoscaError::WrongState);
        }

        member.require_auth();

        let mut members = storage::get_members(&env);
        let config = storage::get_config(&env);

        if members.len() >= config.max_members {
            return Err(RoscaError::PoolFull);
        }

        // Check duplicate
        for i in 0..members.len() {
            if members.get(i).unwrap() == member {
                return Err(RoscaError::AlreadyMember);
            }
        }

        let position = members.len();
        members.push_back(member.clone());
        storage::set_members(&env, &members);

        env.events().publish(
            (symbol_short!("member"), symbol_short!("joined")),
            (member.clone(), position),
        );

        // Activate if full
        if members.len() == config.max_members {
            storage::set_state(&env, &RoscaState::Active);
            let mut config = config;
            config.start_time = env.ledger().timestamp();
            storage::set_config(&env, &config);

            env.events().publish(
                (symbol_short!("state"),),
                (RoscaState::Setup, RoscaState::Active),
            );
        }

        storage::bump_instance_ttl(&env);
        Ok(())
    }
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: All tests pass (3 init + 4 join = 7).

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "feat(contract): implement join with auto-activation"
```

---

### Task 4: Implement `contribute` + Test

**Files:**
- Modify: `contracts/rosca_pool/src/lib.rs` (replace `contribute` todo)
- Modify: `contracts/rosca_pool/src/test.rs`

- [ ] **Step 1: Write failing tests for contribute**

Add to `test.rs`:

```rust
// Helper to create and fill a pool (returns members)
fn create_active_pool<'a>(
    env: &Env,
    client: &RoscaPoolClient,
    token_admin: &StellarAssetClient,
    admin: &Address,
    token_address: &Address,
    manager: &Address,
    num_members: u32,
    contribution: i128,
) -> soroban_sdk::Vec<Address> {
    client.initialize(admin, token_address, &contribution, &60_u64, &num_members, manager, &200_u32);

    let mut members = soroban_sdk::Vec::new(env);
    for _ in 0..num_members {
        let m = Address::generate(env);
        token_admin.mint(&m, &(contribution * 10)); // mint enough for many rounds
        client.join(&m);
        members.push_back(m);
    }
    members
}

#[test]
fn test_contribute() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, token, token_admin) = setup_token(&env, &admin);
    let (client, contract_id) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    let member0 = members.get(0).unwrap();

    // Check balance before
    let balance_before = token.balance(&member0);

    client.contribute(&member0);

    // Balance decreased by contribution_amount
    let balance_after = token.balance(&member0);
    assert_eq!(balance_before - balance_after, 1_000_000);

    // Vault balance increased
    let vault_balance = token.balance(&contract_id);
    assert_eq!(vault_balance, 1_000_000);

    // Member status updated
    let status = client.get_member_status(&member0);
    assert!(status.contributed_this_round);
    assert_eq!(status.total_contributed, 1_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_contribute_double() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);
    let member0 = members.get(0).unwrap();

    client.contribute(&member0);
    client.contribute(&member0); // double, should fail
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_contribute_not_member() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    let outsider = Address::generate(&env);
    client.contribute(&outsider); // not a member
}
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool test_contribute 2>&1 | head -20`
Expected: Fails with `todo!()`

- [ ] **Step 3: Implement contribute**

Replace `contribute` in `lib.rs`:

```rust
    pub fn contribute(env: Env, member: Address) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state != RoscaState::Active {
            return Err(RoscaError::WrongState);
        }

        member.require_auth();

        let members = storage::get_members(&env);
        let mut is_member = false;
        for i in 0..members.len() {
            if members.get(i).unwrap() == member {
                is_member = true;
                break;
            }
        }
        if !is_member {
            return Err(RoscaError::NotMember);
        }

        let round = storage::get_current_round(&env);
        let config = storage::get_config(&env);

        // Check not already contributed this round
        if storage::get_round_deposit(&env, round, &member) > 0 {
            return Err(RoscaError::AlreadyContributed);
        }

        // Transfer tokens from member to contract vault
        let token_client = token::Client::new(&env, &storage::get_token(&env));
        token_client.transfer(&member, &env.current_contract_address(), &config.contribution_amount);

        // Record contribution
        storage::set_round_deposit(&env, round, &member, config.contribution_amount);

        let prev_total = storage::get_total_contributed(&env, &member);
        storage::set_total_contributed(&env, &member, prev_total + config.contribution_amount);

        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("contrib"),),
            (member, round, config.contribution_amount),
        );

        Ok(())
    }
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: All tests pass (7 previous + 3 contribute = 10).

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "feat(contract): implement contribute with token transfer"
```

---

### Task 5: Implement `advance_round` + Test

**Files:**
- Modify: `contracts/rosca_pool/src/lib.rs` (replace `advance_round` todo)
- Modify: `contracts/rosca_pool/src/test.rs`

- [ ] **Step 1: Write failing tests for advance_round**

Add to `test.rs`:

```rust
#[test]
fn test_advance_round() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, token, token_admin) = setup_token(&env, &admin);
    let (client, contract_id) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    // All members contribute
    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }

    // Advance time past round_period
    env.ledger().with_mut(|li| { li.timestamp = 1000 + 61; });

    let recipient = members.get(0).unwrap(); // round 0 recipient
    let balance_before = token.balance(&recipient);

    client.advance_round();

    // Recipient got payout minus fee: 3_000_000 * (1 - 200/10000) = 3_000_000 * 0.98 = 2_940_000
    let balance_after = token.balance(&recipient);
    let payout = 3_000_000_i128; // 3 members * 1_000_000
    let fee = payout * 200 / 10_000; // 60_000
    let net_payout = payout - fee; // 2_940_000
    assert_eq!(balance_after - balance_before, net_payout);

    // Manager got fee
    let manager_balance = token.balance(&manager);
    assert_eq!(manager_balance, fee);

    // Round advanced
    assert_eq!(client.get_current_round(), 1);
    assert_eq!(client.get_state(), RoscaState::Active);

    // Vault balance should be 0
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_advance_incomplete_contributions() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    // Only 1 of 3 contribute
    client.contribute(&members.get(0).unwrap());

    env.ledger().with_mut(|li| { li.timestamp = 1000 + 61; });
    client.advance_round(); // should fail — not all contributed
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_advance_time_not_elapsed() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }

    // Don't advance time — still at 1000, round started at 1000, period is 60
    client.advance_round(); // should fail — time not elapsed
}

#[test]
fn test_advance_round_completes_pool() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 2, 1_000_000);

    // Round 0
    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }
    env.ledger().with_mut(|li| { li.timestamp = 1000 + 61; });
    client.advance_round();
    assert_eq!(client.get_current_round(), 1);
    assert_eq!(client.get_state(), RoscaState::Active);

    // Round 1 (final round for 2-member pool)
    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }
    env.ledger().with_mut(|li| { li.timestamp = 1000 + 122; });
    client.advance_round();

    assert_eq!(client.get_current_round(), 2);
    assert_eq!(client.get_state(), RoscaState::Completed);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool test_advance 2>&1 | head -20`
Expected: Fails with `todo!()`

- [ ] **Step 3: Implement advance_round**

Replace `advance_round` in `lib.rs`:

```rust
    pub fn advance_round(env: Env) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state != RoscaState::Active {
            return Err(RoscaError::WrongState);
        }

        let config = storage::get_config(&env);
        let round = storage::get_current_round(&env);
        let members = storage::get_members(&env);

        // Check all members contributed this round
        for i in 0..members.len() {
            let member = members.get(i).unwrap();
            if storage::get_round_deposit(&env, round, &member) <= 0 {
                return Err(RoscaError::RoundNotComplete);
            }
        }

        // Check time elapsed
        let now = env.ledger().timestamp();
        let round_end = config.start_time + (config.round_period * (round as u64 + 1));
        if now < round_end {
            return Err(RoscaError::RoundNotElapsed);
        }

        // Calculate payout
        let num_members = members.len() as i128;
        let total_pot = config.contribution_amount * num_members;
        let fee = total_pot * (config.manager_fee_bps as i128) / 10_000;
        let net_payout = total_pot - fee;

        // Recipient is members[round] (fixed rotation order)
        let recipient = members.get(round).unwrap();

        let token_client = token::Client::new(&env, &storage::get_token(&env));

        // Pay recipient
        token_client.transfer(&env.current_contract_address(), &recipient, &net_payout);

        // Pay manager fee
        if fee > 0 {
            let manager = storage::get_manager(&env);
            token_client.transfer(&env.current_contract_address(), &manager, &fee);
        }

        // Record
        storage::set_round_recipient(&env, round, &recipient);
        storage::set_has_received(&env, &recipient, true);
        storage::set_manager_fee_paid(&env, round, fee);

        // Advance round
        let next_round = round + 1;
        storage::set_current_round(&env, next_round);

        if next_round >= members.len() {
            storage::set_state(&env, &RoscaState::Completed);
            env.events().publish(
                (symbol_short!("state"),),
                (RoscaState::Active, RoscaState::Completed),
            );
        }

        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("payout"),),
            (recipient, round, net_payout, fee),
        );

        Ok(())
    }
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: All 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "feat(contract): implement advance_round with payout + fee distribution"
```

---

### Task 6: Implement `decommission` + Test

**Files:**
- Modify: `contracts/rosca_pool/src/lib.rs`
- Modify: `contracts/rosca_pool/src/test.rs`

- [ ] **Step 1: Write failing tests for decommission**

Add to `test.rs`:

```rust
#[test]
fn test_decommission() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, token, token_admin) = setup_token(&env, &admin);
    let (client, contract_id) = setup_contract(&env);

    let members = create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    // Two members contribute (partial round)
    client.contribute(&members.get(0).unwrap());
    client.contribute(&members.get(1).unwrap());

    // Vault has 2_000_000
    assert_eq!(token.balance(&contract_id), 2_000_000);

    let m0_before = token.balance(&members.get(0).unwrap());
    let m1_before = token.balance(&members.get(1).unwrap());
    let m2_before = token.balance(&members.get(2).unwrap());

    client.decommission(&admin);

    assert_eq!(client.get_state(), RoscaState::Cancelled);

    // Members who contributed get refunds proportional to their contributions
    // m0 contributed 1_000_000, m1 contributed 1_000_000, m2 contributed 0
    // Total contributed = 2_000_000
    // m0 gets 1_000_000, m1 gets 1_000_000, m2 gets 0
    let m0_after = token.balance(&members.get(0).unwrap());
    let m1_after = token.balance(&members.get(1).unwrap());
    let m2_after = token.balance(&members.get(2).unwrap());

    assert_eq!(m0_after - m0_before, 1_000_000);
    assert_eq!(m1_after - m1_before, 1_000_000);
    assert_eq!(m2_after - m2_before, 0);

    // Vault empty
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_decommission_not_admin() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);

    create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);

    let not_admin = Address::generate(&env);
    client.decommission(&not_admin);
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool test_decommission 2>&1 | head -20`
Expected: Fails with `todo!()`

- [ ] **Step 3: Implement decommission**

Replace `decommission` in `lib.rs`:

```rust
    pub fn decommission(env: Env, admin: Address) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state == RoscaState::Completed {
            return Err(RoscaError::WrongState);
        }

        admin.require_auth();

        let stored_admin = storage::get_admin(&env);
        if admin != stored_admin {
            return Err(RoscaError::NotAdmin);
        }

        let members = storage::get_members(&env);
        let token_client = token::Client::new(&env, &storage::get_token(&env));

        // Return funds pro-rata based on total_contributed
        let vault_balance = token_client.balance(&env.current_contract_address());
        if vault_balance > 0 {
            let mut total_all_contributed: i128 = 0;
            for i in 0..members.len() {
                total_all_contributed += storage::get_total_contributed(&env, &members.get(i).unwrap());
            }

            if total_all_contributed > 0 {
                for i in 0..members.len() {
                    let member = members.get(i).unwrap();
                    let member_contributed = storage::get_total_contributed(&env, &member);
                    if member_contributed > 0 {
                        let refund = (vault_balance * member_contributed) / total_all_contributed;
                        if refund > 0 {
                            token_client.transfer(&env.current_contract_address(), &member, &refund);
                        }
                    }
                }
            }
        }

        storage::set_state(&env, &RoscaState::Cancelled);
        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("state"),),
            (state, RoscaState::Cancelled),
        );

        Ok(())
    }
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: All 16 tests pass.

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "feat(contract): implement decommission with pro-rata refunds"
```

---

### Task 7: Full Lifecycle Integration Test

**Files:**
- Modify: `contracts/rosca_pool/src/test.rs`

- [ ] **Step 1: Write the full lifecycle test**

Add to `test.rs`:

```rust
#[test]
fn test_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, token, token_admin) = setup_token(&env, &admin);
    let (client, contract_id) = setup_contract(&env);

    let contribution = 1_000_000_i128;
    let num_members: u32 = 5;
    let fee_bps: u32 = 200; // 2%

    // Initialize
    client.initialize(&admin, &token_address, &contribution, &60_u64, &num_members, &manager, &fee_bps);
    assert_eq!(client.get_state(), RoscaState::Setup);

    // Join all members
    let mut member_addrs: [Option<Address>; 5] = Default::default();
    for i in 0..num_members {
        let m = Address::generate(&env);
        token_admin.mint(&m, &(contribution * (num_members as i128) * 2)); // enough for all rounds
        client.join(&m);
        member_addrs[i as usize] = Some(m);
    }
    assert_eq!(client.get_state(), RoscaState::Active);

    let members: std::vec::Vec<Address> = member_addrs.iter().map(|m| m.clone().unwrap()).collect();

    // Run through all rounds
    for round in 0..num_members {
        // All members contribute
        for m in &members {
            client.contribute(m);
        }

        // Advance time
        env.ledger().with_mut(|li| {
            li.timestamp = 1000 + (60 * (round as u64 + 1)) + 1;
        });

        let recipient = &members[round as usize];
        let balance_before = token.balance(recipient);

        client.advance_round();

        // Verify payout
        let total_pot = contribution * (num_members as i128); // 5_000_000
        let fee = total_pot * (fee_bps as i128) / 10_000;     // 100_000
        let net = total_pot - fee;                              // 4_900_000

        let balance_after = token.balance(recipient);
        assert_eq!(balance_after - balance_before, net);

        // Verify member status
        let status = client.get_member_status(recipient);
        assert!(status.has_received_payout);
    }

    // Pool is completed
    assert_eq!(client.get_state(), RoscaState::Completed);
    assert_eq!(client.get_current_round(), num_members);

    // Vault is empty
    assert_eq!(token.balance(&contract_id), 0);

    // Manager earned fees for all rounds
    let total_fees = client.get_manager_fees();
    let expected_total_fees = contribution * (num_members as i128) * (fee_bps as i128) / 10_000 * (num_members as i128);
    assert_eq!(total_fees, expected_total_fees);
    assert_eq!(token.balance(&manager), expected_total_fees);
}
```

- [ ] **Step 2: Run the lifecycle test**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool test_full_lifecycle -- --nocapture`
Expected: PASS. Full 5-member, 5-round ROSCA completes.

- [ ] **Step 3: Run all tests to confirm nothing broke**

Run: `cd /Users/abba/Desktop/stellar_build && cargo test --package rosca-pool`
Expected: All 17 tests pass.

- [ ] **Step 4: Build the WASM**

Run: `cd /Users/abba/Desktop/stellar_build && cargo build --target wasm32-unknown-unknown --release --package rosca-pool`
Expected: Produces `target/wasm32-unknown-unknown/release/rosca_pool.wasm`

- [ ] **Step 5: Commit**

```bash
git add contracts/rosca_pool/
git commit -m "test(contract): full lifecycle integration test — 5-member pool completes all rounds"
```

---

## Phase 1 Complete Checklist

After all 7 tasks, verify:

- [ ] `cargo test --package rosca-pool` — 17 tests pass
- [ ] `cargo build --target wasm32-unknown-unknown --release --package rosca-pool` — WASM builds
- [ ] Contract covers: initialize, join, contribute, advance_round, decommission, bump_storage, all read-only functions
- [ ] Error cases covered: fee too high, double init, pool full, duplicate join, double contribute, non-member contribute, incomplete round, time not elapsed, non-admin decommission
- [ ] Full lifecycle: create → join × 5 → (contribute × 5 + advance) × 5 → Completed
