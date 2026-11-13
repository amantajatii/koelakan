//! Read-only methods.

use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId};

use crate::constants::{DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, WEEK_NS};
use crate::internal::required_bond;
use crate::types::{BalanceView, ConfigView, Item, Policy, Round, RoundView};
use crate::{Market, MarketExt};

#[near]
impl Market {
    pub fn get_config(&self) -> ConfigView {
        ConfigView {
            admin: self.admin.clone(),
            arbiter: self.arbiter.clone(),
            token: self.token.clone(),
            rounds: self.rounds.len() as u64,
            token_held: U128(self.token_held),
        }
    }

    pub fn get_items(&self) -> Vec<Item> {
        self.items.values().cloned().collect()
    }

    pub fn get_round(&self, round_id: u64) -> Option<RoundView> {
        self.rounds.get(round_id as u32).map(Self::round_view)
    }

    pub fn list_rounds(&self, from: Option<u64>, limit: Option<u64>) -> Vec<RoundView> {
        let from = from.unwrap_or(0) as u32;
        let limit = limit.unwrap_or(DEFAULT_LIST_LIMIT).min(MAX_LIST_LIMIT) as u32;
        (from..self.rounds.len().min(from.saturating_add(limit)))
            .filter_map(|i| self.rounds.get(i))
            .map(Self::round_view)
            .collect()
    }

    pub fn get_balance(&self, account_id: AccountId) -> BalanceView {
        BalanceView {
            available: U128(self.balance(&account_id)),
            held: U128(self.held.get(&account_id).copied().unwrap_or(0)),
        }
    }

    pub fn get_policy(&self, account_id: AccountId) -> Option<Policy> {
        self.policies.get(&account_id).cloned()
    }

    pub fn get_spent(&self, account_id: AccountId, week: Option<u64>) -> U128 {
        let week = week.unwrap_or(env::block_timestamp() / WEEK_NS);
        U128(self.spent.get(&(account_id, week)).copied().unwrap_or(0))
    }

    /// Helper for sellers / dashboards: the exact bond for a round in COMMIT.
    pub fn get_required_bond(&self, round_id: u64) -> U128 {
        let r = self
            .rounds
            .get(round_id as u32)
            .unwrap_or_else(|| env::panic_str("no round"));
        U128(required_bond(r.ceiling_price.0, r.total_qty))
    }
}

impl Market {
    fn round_view(r: &Round) -> RoundView {
        let saving = r
            .clearing_price
            .map(|c| U128((r.ref_price.0 - c.0) * r.total_qty as u128));
        RoundView {
            round: r.clone(),
            phase: r.phase_at(env::block_timestamp()),
            saving,
        }
    }
}
