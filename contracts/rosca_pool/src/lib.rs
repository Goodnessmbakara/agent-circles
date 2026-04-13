#![no_std]

mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Vec};
use types::{MemberStatus, RoscaConfig, RoscaError, RoscaState};

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
        if storage::has_initialized(&env) {
            return Err(RoscaError::AlreadyInitialized);
        }
        // Input validation
        if manager_fee_bps > 500 {
            return Err(RoscaError::FeeTooHigh);
        }
        if contribution_amount <= 0 {
            return Err(RoscaError::InvalidParam);
        }
        if round_period == 0 {
            return Err(RoscaError::InvalidParam);
        }
        if max_members < 2 || max_members > 100 {
            return Err(RoscaError::InvalidParam);
        }

        admin.require_auth();

        storage::set_admin(&env, &admin);
        storage::set_token(&env, &token);
        storage::set_manager(&env, &manager);
        storage::set_state(&env, &RoscaState::Setup);
        storage::set_current_round(&env, 0);
        storage::set_members(&env, &Vec::new(&env));
        storage::set_contrib_count(&env, 0);
        storage::set_total_manager_fees(&env, 0);

        let config = RoscaConfig {
            contribution_amount,
            round_period,
            start_time: 0,
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

    /// Join a pool in Setup state.
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

        // O(1) duplicate check via persistent position map
        if storage::get_member_position(&env, &member).is_some() {
            return Err(RoscaError::AlreadyMember);
        }

        let position = members.len();
        members.push_back(member.clone());
        storage::set_members(&env, &members);
        storage::set_member_position(&env, &member, position);

        env.events().publish(
            (symbol_short!("member"), symbol_short!("joined")),
            (member.clone(), position),
        );

        // Activate if full
        if members.len() == config.max_members {
            let mut config = config;
            config.start_time = env.ledger().timestamp();
            storage::set_config(&env, &config);
            storage::set_state(&env, &RoscaState::Active);

            env.events().publish(
                (symbol_short!("state"),),
                (RoscaState::Setup, RoscaState::Active),
            );
        }

        storage::bump_instance_ttl(&env);
        Ok(())
    }

    /// Contribute to the current round.
    pub fn contribute(env: Env, member: Address) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state != RoscaState::Active {
            return Err(RoscaError::WrongState);
        }

        member.require_auth();

        // O(1) membership check via position map
        if storage::get_member_position(&env, &member).is_none() {
            return Err(RoscaError::NotMember);
        }

        let round = storage::get_current_round(&env);
        let config = storage::get_config(&env);

        if storage::get_round_deposit(&env, round, &member) > 0 {
            return Err(RoscaError::AlreadyContributed);
        }

        // CEI: update all state before external call
        storage::set_round_deposit(&env, round, &member, config.contribution_amount);

        let prev_total = storage::get_total_contributed(&env, &member);
        let new_total = prev_total
            .checked_add(config.contribution_amount)
            .ok_or(RoscaError::Overflow)?;
        storage::set_total_contributed(&env, &member, new_total);

        let count = storage::get_contrib_count(&env);
        storage::set_contrib_count(&env, count.checked_add(1).ok_or(RoscaError::Overflow)?);

        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("contrib"),),
            (member.clone(), round, config.contribution_amount),
        );

        // Interaction last: pull tokens into vault
        let token_client = token::Client::new(&env, &storage::get_token(&env));
        token_client.transfer(&member, &env.current_contract_address(), &config.contribution_amount);

        Ok(())
    }

    /// Advance to next round and trigger payout.
    /// Permissionless by design: anyone can trigger advancement once conditions are met
    /// (all members contributed AND round period elapsed). The current-round recipient
    /// can front-run this call, which is acceptable — they would receive their rightful
    /// payout regardless of who calls it.
    pub fn advance_round(env: Env) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        if state != RoscaState::Active {
            return Err(RoscaError::WrongState);
        }

        let config = storage::get_config(&env);
        let round = storage::get_current_round(&env);
        let members = storage::get_members(&env);

        // O(1) completeness check via instance counter
        let contrib_count = storage::get_contrib_count(&env);
        if contrib_count < members.len() {
            return Err(RoscaError::RoundNotComplete);
        }

        // Time gate
        let now = env.ledger().timestamp();
        let round_end = config.start_time + (config.round_period * (round as u64 + 1));
        if now < round_end {
            return Err(RoscaError::RoundNotElapsed);
        }

        // Calculate payout — checked arithmetic for all financial math
        let num_members = members.len() as i128;
        let total_pot = config
            .contribution_amount
            .checked_mul(num_members)
            .ok_or(RoscaError::Overflow)?;
        let fee = total_pot
            .checked_mul(config.manager_fee_bps as i128)
            .ok_or(RoscaError::Overflow)?
            / 10_000;
        let net_payout = total_pot.checked_sub(fee).ok_or(RoscaError::Overflow)?;

        // Recipient is members[round] (fixed rotation order)
        let recipient = members.get(round).unwrap();
        let manager = storage::get_manager(&env);

        // CEI: update all state before external calls
        storage::set_round_recipient(&env, round, &recipient);
        storage::set_has_received(&env, &recipient, true);
        storage::set_manager_fee_paid(&env, round, fee);

        let next_round = round.checked_add(1).ok_or(RoscaError::Overflow)?;
        storage::set_current_round(&env, next_round);
        storage::set_contrib_count(&env, 0); // reset for next round

        let new_total_fees = storage::get_total_manager_fees(&env)
            .checked_add(fee)
            .ok_or(RoscaError::Overflow)?;
        storage::set_total_manager_fees(&env, new_total_fees);

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
            (recipient.clone(), round, net_payout, fee),
        );

        // Interactions last: push tokens out of vault
        let token_client = token::Client::new(&env, &storage::get_token(&env));
        token_client.transfer(&env.current_contract_address(), &recipient, &net_payout);
        if fee > 0 {
            token_client.transfer(&env.current_contract_address(), &manager, &fee);
        }

        Ok(())
    }

    /// Emergency cancellation — admin only.
    pub fn decommission(env: Env, admin: Address) -> Result<(), RoscaError> {
        let state = storage::get_state(&env);
        // Guard both terminal states: Completed and already-Cancelled
        if state == RoscaState::Completed || state == RoscaState::Cancelled {
            return Err(RoscaError::WrongState);
        }

        // Verify caller is the stored admin BEFORE calling require_auth
        let stored_admin = storage::get_admin(&env);
        if admin != stored_admin {
            return Err(RoscaError::NotAdmin);
        }
        admin.require_auth();

        let members = storage::get_members(&env);
        let token_client = token::Client::new(&env, &storage::get_token(&env));

        let vault_balance = token_client.balance(&env.current_contract_address());

        // CEI: mark cancelled before any refund transfers
        storage::set_state(&env, &RoscaState::Cancelled);
        storage::bump_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("state"),),
            (state, RoscaState::Cancelled),
        );

        // Interactions: pro-rata refunds based on each member's total_contributed
        if vault_balance > 0 {
            let mut total_all_contributed: i128 = 0;
            for i in 0..members.len() {
                let c = storage::get_total_contributed(&env, &members.get(i).unwrap());
                total_all_contributed = total_all_contributed
                    .checked_add(c)
                    .ok_or(RoscaError::Overflow)?;
            }

            if total_all_contributed > 0 {
                for i in 0..members.len() {
                    let member = members.get(i).unwrap();
                    let member_contributed = storage::get_total_contributed(&env, &member);
                    if member_contributed > 0 {
                        // vault_balance * member_contributed may overflow i128 for very large pools;
                        // max_members=100, max contribution fits well within i128 range.
                        let refund = vault_balance
                            .checked_mul(member_contributed)
                            .ok_or(RoscaError::Overflow)?
                            / total_all_contributed;
                        if refund > 0 {
                            token_client.transfer(&env.current_contract_address(), &member, &refund);
                        }
                    }
                }
            }
        }

        Ok(())
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

    /// O(1) aggregate read from cached instance storage.
    pub fn get_manager_fees(env: Env) -> i128 {
        storage::get_total_manager_fees(&env)
    }
}
