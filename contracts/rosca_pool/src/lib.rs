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

    /// Contribute to the current round.
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

    /// Advance to next round and trigger payout. Permissionless.
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

    /// Emergency cancellation — admin only.
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
