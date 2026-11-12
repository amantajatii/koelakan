//! tIDR — a NEP-141 *test* rupiah stablecoin for Koelakan.
//!
//! 0 decimals: 1 tIDR = Rp1. Testnet only. Anyone can call `faucet()` once per
//! hour to receive 1,000,000 tIDR; the faucet also registers the caller's
//! storage so it can receive transfers (NEP-145). In production this token is
//! replaced by a real rupiah or dollar stablecoin (e.g. IDRX / USDC).

use near_contract_standards::fungible_token::events::FtMint;
use near_contract_standards::fungible_token::metadata::{
    FungibleTokenMetadata, FungibleTokenMetadataProvider, FT_METADATA_SPEC,
};
use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore, FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::borsh::BorshSerialize;
use near_sdk::collections::LazyOption;
use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{
    env, log, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, PromiseOrValue,
};

pub const FAUCET_AMOUNT: u128 = 1_000_000;
pub const FAUCET_COOLDOWN_NS: u64 = 3_600 * 1_000_000_000;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    FungibleToken,
    Metadata,
    LastClaim,
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    token: FungibleToken,
    metadata: LazyOption<FungibleTokenMetadata>,
    last_claim: LookupMap<AccountId, u64>,
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        let metadata = FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.to_string(),
            name: "Test Rupiah (Koelakan)".to_string(),
            symbol: "tIDR".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 0,
        };
        metadata.assert_valid();
        Self {
            token: FungibleToken::new(StorageKey::FungibleToken),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            last_claim: LookupMap::new(StorageKey::LastClaim),
        }
    }

    /// Mint `FAUCET_AMOUNT` tIDR to the caller (at most once per hour) and
    /// register the caller on the token if needed. The contract pays storage
    /// (testnet only).
    pub fn faucet(&mut self) -> U128 {
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        if let Some(last) = self.last_claim.get(&account) {
            require!(
                now.saturating_sub(*last) >= FAUCET_COOLDOWN_NS,
                "faucet: wait one hour between claims"
            );
        }
        if !self.token.accounts.contains_key(&account) {
            self.token.internal_register_account(&account);
        }
        self.token.internal_deposit(&account, FAUCET_AMOUNT);
        self.last_claim.insert(account.clone(), now);
        FtMint {
            owner_id: &account,
            amount: U128(FAUCET_AMOUNT),
            memo: Some("faucet"),
        }
        .emit();
        U128(FAUCET_AMOUNT)
    }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used_amount, burned_amount) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        if burned_amount > 0 {
            log!("Account @{} burned {}", sender_id, burned_amount);
        }
        used_amount.into()
    }
}

#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        #[allow(unused_variables)]
        if let Some((account_id, balance)) = self.token.internal_storage_unregister(force) {
            log!("Closed @{} with {}", account_id, balance);
            true
        } else {
            false
        }
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn ctx(who: AccountId, ts: u64) {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(who).block_timestamp(ts);
        testing_env!(b.build());
    }

    #[test]
    fn faucet_mints_and_registers() {
        ctx(accounts(0), 1);
        let mut c = Contract::new();
        ctx(accounts(1), 10);
        assert_eq!(c.faucet().0, FAUCET_AMOUNT);
        assert_eq!(c.ft_balance_of(accounts(1)).0, FAUCET_AMOUNT);
        assert_eq!(c.ft_total_supply().0, FAUCET_AMOUNT);
        assert_eq!(c.ft_metadata().decimals, 0);
    }

    #[test]
    #[should_panic(expected = "wait one hour")]
    fn faucet_cooldown() {
        ctx(accounts(0), 1);
        let mut c = Contract::new();
        ctx(accounts(1), 10);
        c.faucet();
        ctx(accounts(1), 10 + FAUCET_COOLDOWN_NS - 1);
        c.faucet();
    }

    #[test]
    fn faucet_again_after_cooldown() {
        ctx(accounts(0), 1);
        let mut c = Contract::new();
        ctx(accounts(1), 10);
        c.faucet();
        ctx(accounts(1), 10 + FAUCET_COOLDOWN_NS);
        c.faucet();
        assert_eq!(c.ft_balance_of(accounts(1)).0, 2 * FAUCET_AMOUNT);
    }
}
