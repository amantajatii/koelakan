//! Koelakan market contract.
//!
//! Implements RULES.md (v0.3). Warung agents pool demand into rounds, grosir
//! agents compete in a commit-reveal sealed-bid auction, and all tIDR stays in
//! escrow here until delivery is confirmed (or defaults after a deadline).
//!
//! Section numbers in comments (§x) refer to RULES.md.
//!
//! Layout: `types` (data model), `events` (NEP-297 logs), `internal`
//! (balance bookkeeping), and one module per group of `#[near]` methods
//! (`admin`, `account`, `rounds`, `delivery`, `views`, `ft_receiver`).

use near_sdk::borsh::BorshSerialize;
use near_sdk::store::{IterableMap, LookupMap, Vector};
use near_sdk::{near, AccountId, BorshStorageKey, PanicOnDefault};

mod account;
mod admin;
mod constants;
mod delivery;
mod events;
mod ft_receiver;
mod internal;
mod rounds;
mod types;
mod views;

#[cfg(test)]
mod golden_tests;
#[cfg(test)]
mod tests;

pub use constants::{
    BOND_BPS, MAX_BIDS, MAX_PARTICIPANTS, MAX_PHASE_SECS, MIN_PHASE_SECS, NS, WEEK_NS,
};
pub use internal::{bid_hash, required_bond};
pub use types::{
    BalanceView, Bid, ConfigView, Delivery, Item, Participant, Phase, Policy, Round, RoundState,
    RoundView,
};

/// Storage prefixes. Variant order is part of the on-chain layout: never
/// reorder or insert before the end.
#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Items,
    Policies,
    Balances,
    Held,
    Spent,
    Rounds,
}

/// Contract state. Field order and types are part of the on-chain layout.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Market {
    admin: AccountId,
    arbiter: AccountId,
    token: AccountId,
    items: IterableMap<String, Item>,
    policies: LookupMap<AccountId, Policy>,
    /// Available balance (§2).
    balances: LookupMap<AccountId, u128>,
    /// Amount held in rounds per account (locks, escrow, bonds). Used for views.
    held: LookupMap<AccountId, u128>,
    /// (account, week) -> amount counted against the weekly budget.
    spent: LookupMap<(AccountId, u64), u128>,
    rounds: Vector<Round>,
    /// Total tIDR this contract should own (invariant check, §2).
    token_held: u128,
}

#[near]
impl Market {
    #[init]
    pub fn new(admin: AccountId, arbiter: AccountId, token: AccountId) -> Self {
        Self {
            admin,
            arbiter,
            token,
            items: IterableMap::new(StorageKey::Items),
            policies: LookupMap::new(StorageKey::Policies),
            balances: LookupMap::new(StorageKey::Balances),
            held: LookupMap::new(StorageKey::Held),
            spent: LookupMap::new(StorageKey::Spent),
            rounds: Vector::new(StorageKey::Rounds),
            token_held: 0,
        }
    }
}
