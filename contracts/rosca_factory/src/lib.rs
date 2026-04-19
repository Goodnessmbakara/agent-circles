#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env};

/// Deploys new [`rosca_pool`] instances from an uploaded WASM hash (one hash stored at init).
#[contract]
pub struct RoscaFactory;

#[contractimpl]
impl RoscaFactory {
    /// One-time: store the `rosca_pool` WASM hash after it exists on-chain (`upload_contract_wasm`).
    pub fn init(env: Env, wasm_hash: BytesN<32>) {
        if env.storage().instance().has(&symbol_short!("hash")) {
            panic!("already initialized");
        }
        env.storage().instance().set(&symbol_short!("hash"), &wasm_hash);
        env.storage().instance().set(&symbol_short!("ctr"), &0u32);
    }

    /// Deploy a fresh pool contract instance; caller runs `initialize` on the returned address next.
    pub fn deploy_pool(env: Env) -> Address {
        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&symbol_short!("hash"))
            .expect("factory not initialized");

        let mut counter: u32 = env.storage().instance().get(&symbol_short!("ctr")).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&symbol_short!("ctr"), &counter);

        let mut salt = [0u8; 32];
        salt[28..32].copy_from_slice(&counter.to_be_bytes());
        let salt = BytesN::from_array(&env, &salt);

        let deployer = env.deployer().with_current_contract(salt);
        deployer.deploy_v2(wasm_hash, ())
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    const POOL_WASM: &[u8] = include_bytes!("../../../target/wasm32-unknown-unknown/release/rosca_pool.wasm");

    #[test]
    fn init_and_deploy() {
        let env = Env::default();
        let factory_id = env.register(RoscaFactory, ());
        let factory = RoscaFactoryClient::new(&env, &factory_id);

        let wasm_hash = env.deployer().upload_contract_wasm(POOL_WASM);
        factory.init(&wasm_hash);

        let pool_addr = factory.deploy_pool();
        assert_ne!(pool_addr, factory_id);
    }
}
