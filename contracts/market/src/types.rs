//! Data model: catalogue, policy, rounds, bids and the JSON view structs.

use std::collections::BTreeMap;

use near_sdk::json_types::U128;
use near_sdk::{near, AccountId};

/// §1a: catalogue item with an on-chain reference price.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub unit: String,
    /// PIHPS Nasional market price (tIDR per unit).
    pub ref_price: U128,
    /// Official retail ceiling (HET), context only.
    pub het: Option<U128>,
    pub source: String,
    pub as_of: String,
}

/// §3: owner policy, enforced by `join_round`.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Policy {
    pub max_price: BTreeMap<String, U128>,
    pub weekly_budget: U128,
    pub auto_join: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum RoundState {
    /// OPEN / COMMIT / REVEAL: the phase is derived from time (§5).
    Active,
    Failed,
    Settled,
    Closed,
}

#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Phase {
    Join,
    Commit,
    Reveal,
    ReadyToSettle,
    Delivery,
    AwaitingFinalize,
    Failed,
    Closed,
}

/// §6: delivery status of one buyer.
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Delivery {
    Pending,
    Confirmed,
    Disputed,
    /// Arbiter ruled; `refunded` = buyer got its payment back.
    Resolved {
        refunded: bool,
    },
    /// Silence: paid to the seller at finalize.
    Accepted,
    /// Arbiter missed `arbiter_deadline`: payment refunded, no bond share.
    DefaultRefunded,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Participant {
    pub account_id: AccountId,
    pub qty: u64,
    /// Week index at join time (§3); refunds are subtracted from this week.
    pub week: u64,
    /// tIDR still held by the contract for this buyer in this round
    /// (lock before settle, escrowed payment after).
    pub held: U128,
    pub delivery: Delivery,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Bid {
    pub seller_id: AccountId,
    /// sha256("{round_id}:{seller_id}:{unit_price}:{salt}") lowercase hex.
    pub hash: String,
    pub bond: U128,
    /// Bond still held by the contract.
    pub bond_held: U128,
    pub revealed_price: Option<U128>,
    pub valid: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Round {
    pub id: u64,
    pub item: String,
    pub ref_price: U128,
    pub ceiling_price: U128,
    pub min_total_qty: u64,
    pub total_qty: u64,
    pub opener: AccountId,
    pub opened_at: u64,
    pub join_deadline: u64,
    pub commit_deadline: u64,
    pub reveal_deadline: u64,
    pub delivery_deadline: u64,
    pub arbiter_deadline: u64,
    pub state: RoundState,
    pub participants: Vec<Participant>,
    pub bids: Vec<Bid>,
    /// Index into `bids`.
    pub winner: Option<u32>,
    pub clearing_price: Option<U128>,
}

#[near(serializers = [json])]
pub struct RoundView {
    #[serde(flatten)]
    pub round: Round,
    pub phase: Phase,
    /// (ref_price - clearing_price) * total_qty, once settled.
    pub saving: Option<U128>,
}

#[near(serializers = [json])]
pub struct BalanceView {
    pub available: U128,
    pub held: U128,
}

#[near(serializers = [json])]
pub struct ConfigView {
    pub admin: AccountId,
    pub arbiter: AccountId,
    pub token: AccountId,
    pub rounds: u64,
    pub token_held: U128,
}

impl Round {
    /// Phase at time `now`. OPEN / COMMIT / REVEAL are derived from time (§5).
    pub(crate) fn phase_at(&self, now: u64) -> Phase {
        match self.state {
            RoundState::Failed => Phase::Failed,
            RoundState::Closed => Phase::Closed,
            RoundState::Settled => {
                if now < self.delivery_deadline {
                    Phase::Delivery
                } else {
                    Phase::AwaitingFinalize
                }
            }
            RoundState::Active => {
                if now < self.join_deadline {
                    Phase::Join
                } else if self.total_qty < self.min_total_qty || now >= self.reveal_deadline {
                    Phase::ReadyToSettle
                } else if now < self.commit_deadline {
                    Phase::Commit
                } else {
                    Phase::Reveal
                }
            }
        }
    }
}
