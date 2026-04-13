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

/// Contributions recorded for the current round (O(1) completeness check).
pub fn set_contrib_count(env: &Env, count: u32) {
    env.storage().instance().set(&DataKey::ContribCount, &count);
}

pub fn get_contrib_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::ContribCount).unwrap_or(0)
}

/// Cumulative manager fees paid across all rounds (O(1) aggregate read).
pub fn set_total_manager_fees(env: &Env, total: i128) {
    env.storage().instance().set(&DataKey::TotalManagerFees, &total);
}

pub fn get_total_manager_fees(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::TotalManagerFees).unwrap_or(0)
}

// --- Persistent storage ---

/// Map member address -> slot index. Enables O(1) membership and duplicate checks.
pub fn set_member_position(env: &Env, member: &Address, pos: u32) {
    let key = DataKey::MemberPosition(member.clone());
    env.storage().persistent().set(&key, &pos);
    env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

/// Returns Some(slot_index) if member is in the pool, None otherwise.
/// Also refreshes TTL on read so active members' entries don't expire.
pub fn get_member_position(env: &Env, member: &Address) -> Option<u32> {
    let key = DataKey::MemberPosition(member.clone());
    let val: Option<u32> = env.storage().persistent().get(&key);
    if val.is_some() {
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    }
    val
}

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
    let val: Option<bool> = env.storage().persistent().get(&key);
    if val.is_some() {
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    }
    val.unwrap_or(false)
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

// --- TTL management ---

pub fn bump_instance_ttl(env: &Env) {
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
}
