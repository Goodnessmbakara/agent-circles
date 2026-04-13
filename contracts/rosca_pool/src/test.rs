#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

use crate::{RoscaPool, RoscaPoolClient};
use crate::types::RoscaState;

fn setup_token<'a>(env: &'a Env, admin: &'a Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
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

// Helper to initialize a pool
fn init_pool(env: &Env, client: &RoscaPoolClient, admin: &Address, token: &Address, manager: &Address, max_members: u32) {
    client.initialize(admin, token, &1_000_000_i128, &60_u64, &max_members, manager, &200_u32);
}

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
        token_admin.mint(&m, &(contribution * 10));
        client.join(&m);
        members.push_back(m);
    }
    members
}

// ---- initialize tests ----

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
        &1_000_000_i128,
        &60_u64,
        &5_u32,
        &manager,
        &200_u32,
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
#[should_panic(expected = "Error(Contract, #14)")]
fn test_initialize_zero_contribution() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);
    client.initialize(&admin, &token_address, &0_i128, &60_u64, &5_u32, &manager, &200_u32);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_initialize_zero_period() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);
    client.initialize(&admin, &token_address, &1_000_000_i128, &0_u64, &5_u32, &manager, &200_u32);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_initialize_single_member() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, _) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);
    client.initialize(&admin, &token_address, &1_000_000_i128, &60_u64, &1_u32, &manager, &200_u32);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_decommission_already_cancelled() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| { li.timestamp = 1000; });
    let admin = Address::generate(&env);
    let manager = Address::generate(&env);
    let (token_address, _, token_admin) = setup_token(&env, &admin);
    let (client, _) = setup_contract(&env);
    create_active_pool(&env, &client, &token_admin, &admin, &token_address, &manager, 3, 1_000_000);
    client.decommission(&admin);
    client.decommission(&admin); // second call on Cancelled pool, should fail
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
        &501_u32,
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

// ---- join tests ----

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
    env.ledger().with_mut(|li| { li.timestamp = 1000; });

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
    let config = client.get_config();
    assert!(config.start_time > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
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
    client.join(&Address::generate(&env));
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
    client.join(&member);
}

// ---- contribute tests ----

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

    let balance_before = token.balance(&member0);

    client.contribute(&member0);

    let balance_after = token.balance(&member0);
    assert_eq!(balance_before - balance_after, 1_000_000);

    let vault_balance = token.balance(&contract_id);
    assert_eq!(vault_balance, 1_000_000);

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
    client.contribute(&member0);
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
    client.contribute(&outsider);
}

// ---- advance_round tests ----

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

    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }

    env.ledger().with_mut(|li| { li.timestamp = 1000 + 61; });

    let recipient = members.get(0).unwrap();
    let balance_before = token.balance(&recipient);

    client.advance_round();

    let balance_after = token.balance(&recipient);
    let payout = 3_000_000_i128;
    let fee = payout * 200 / 10_000;
    let net_payout = payout - fee;
    assert_eq!(balance_after - balance_before, net_payout);

    let manager_balance = token.balance(&manager);
    assert_eq!(manager_balance, fee);

    assert_eq!(client.get_current_round(), 1);
    assert_eq!(client.get_state(), RoscaState::Active);

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

    client.contribute(&members.get(0).unwrap());

    env.ledger().with_mut(|li| { li.timestamp = 1000 + 61; });
    client.advance_round();
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

    client.advance_round();
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

    // Round 1 (final)
    for i in 0..members.len() {
        client.contribute(&members.get(i).unwrap());
    }
    env.ledger().with_mut(|li| { li.timestamp = 1000 + 122; });
    client.advance_round();

    assert_eq!(client.get_current_round(), 2);
    assert_eq!(client.get_state(), RoscaState::Completed);
}

// ---- decommission tests ----

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

    client.contribute(&members.get(0).unwrap());
    client.contribute(&members.get(1).unwrap());

    assert_eq!(token.balance(&contract_id), 2_000_000);

    let m0_before = token.balance(&members.get(0).unwrap());
    let m1_before = token.balance(&members.get(1).unwrap());
    let m2_before = token.balance(&members.get(2).unwrap());

    client.decommission(&admin);

    assert_eq!(client.get_state(), RoscaState::Cancelled);

    let m0_after = token.balance(&members.get(0).unwrap());
    let m1_after = token.balance(&members.get(1).unwrap());
    let m2_after = token.balance(&members.get(2).unwrap());

    assert_eq!(m0_after - m0_before, 1_000_000);
    assert_eq!(m1_after - m1_before, 1_000_000);
    assert_eq!(m2_after - m2_before, 0);

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

// ---- full lifecycle ----

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
    let fee_bps: u32 = 200;

    client.initialize(&admin, &token_address, &contribution, &60_u64, &num_members, &manager, &fee_bps);
    assert_eq!(client.get_state(), RoscaState::Setup);

    let mut member_addrs: [Option<Address>; 5] = Default::default();
    for i in 0..num_members {
        let m = Address::generate(&env);
        token_admin.mint(&m, &(contribution * (num_members as i128) * 2));
        client.join(&m);
        member_addrs[i as usize] = Some(m);
    }
    assert_eq!(client.get_state(), RoscaState::Active);

    let members: soroban_sdk::Vec<Address> = {
        let mut v = soroban_sdk::Vec::new(&env);
        for opt in &member_addrs {
            v.push_back(opt.clone().unwrap());
        }
        v
    };

    for round in 0..num_members {
        for i in 0..members.len() {
            client.contribute(&members.get(i).unwrap());
        }

        env.ledger().with_mut(|li| {
            li.timestamp = 1000 + (60 * (round as u64 + 1)) + 1;
        });

        let recipient = members.get(round).unwrap();
        let balance_before = token.balance(&recipient);

        client.advance_round();

        let total_pot = contribution * (num_members as i128);
        let fee = total_pot * (fee_bps as i128) / 10_000;
        let net = total_pot - fee;

        let balance_after = token.balance(&recipient);
        assert_eq!(balance_after - balance_before, net);

        let status = client.get_member_status(&recipient);
        assert!(status.has_received_payout);
    }

    assert_eq!(client.get_state(), RoscaState::Completed);
    assert_eq!(client.get_current_round(), num_members);

    assert_eq!(token.balance(&contract_id), 0);

    let total_fees = client.get_manager_fees();
    let expected_total_fees = contribution * (num_members as i128) * (fee_bps as i128) / 10_000 * (num_members as i128);
    assert_eq!(total_fees, expected_total_fees);
    assert_eq!(token.balance(&manager), expected_total_fees);
}
