//! Koelakan market contract.
//!
//! Implements RULES.md (v0.3). Warung agents pool demand into rounds, grosir
//! agents compete in a commit-reveal sealed-bid auction, and all tIDR stays in
//! escrow here until delivery is confirmed (or defaults after a deadline).
//!
//! Section numbers in comments (§x) refer to RULES.md.

use std::collections::BTreeMap;

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::borsh::BorshSerialize;
use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::store::{IterableMap, LookupMap, Vector};
use near_sdk::{
    assert_one_yocto, env, near, require, AccountId, BorshStorageKey, Gas, NearToken,
    PanicOnDefault, Promise, PromiseOrValue,
};

#[cfg(test)]
mod tests;

pub const MAX_PARTICIPANTS: usize = 50;
pub const MAX_BIDS: usize = 10;
pub const MIN_PHASE_SECS: u64 = 30;
pub const MAX_PHASE_SECS: u64 = 30 * 24 * 3_600;
pub const NS: u64 = 1_000_000_000;
pub const WEEK_NS: u64 = 7 * 24 * 3_600 * NS;
pub const BOND_BPS: u128 = 500; // 5%

const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
const GAS_CALLBACK: Gas = Gas::from_tgas(10);

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

// ---------------------------------------------------------------- types

/// §1a — catalogue item with an on-chain reference price.
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

/// §3 — owner policy, enforced by `join_round`.
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
    /// OPEN / COMMIT / REVEAL — the phase is derived from time (§5).
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

/// §6 — delivery status of one buyer.
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Delivery {
    Pending,
    Confirmed,
    Disputed,
    /// Arbiter ruled; `refunded` = buyer got its payment back.
    Resolved { refunded: bool },
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
    /// (ref_price − clearing_price) × total_qty, once settled.
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

// ---------------------------------------------------------------- contract

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
    /// Amount held in rounds per account (locks, escrow, bonds) — for views.
    held: LookupMap<AccountId, u128>,
    /// (account, week) -> amount counted against the weekly budget.
    spent: LookupMap<(AccountId, u64), u128>,
    rounds: Vector<Round>,
    /// Total tIDR this contract should own (invariant check, §2).
    token_held: u128,
}

fn event(name: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({"standard": "koelakan", "version": "1.0.0", "event": name, "data": [data]})
    ));
}

fn to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push(HEX[(b >> 4) as usize] as char);
        s.push(HEX[(b & 0xf) as usize] as char);
    }
    s
}

pub fn bid_hash(round_id: u64, seller: &AccountId, unit_price: u128, salt: &str) -> String {
    to_hex(&env::sha256(
        format!("{}:{}:{}:{}", round_id, seller, unit_price, salt).as_bytes(),
    ))
}

pub fn required_bond(ceiling: u128, total_qty: u64) -> u128 {
    // ceil(5% × ceiling × total_qty)
    let base = ceiling * total_qty as u128 * BOND_BPS;
    base.div_ceil(10_000)
}

fn phase_of(r: &Round, now: u64) -> Phase {
    match r.state {
        RoundState::Failed => Phase::Failed,
        RoundState::Closed => Phase::Closed,
        RoundState::Settled => {
            if now < r.delivery_deadline {
                Phase::Delivery
            } else {
                Phase::AwaitingFinalize
            }
        }
        RoundState::Active => {
            if now < r.join_deadline {
                Phase::Join
            } else if r.total_qty < r.min_total_qty || now >= r.reveal_deadline {
                Phase::ReadyToSettle
            } else if now < r.commit_deadline {
                Phase::Commit
            } else {
                Phase::Reveal
            }
        }
    }
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

    // ------------------------------------------------------------ admin

    #[payable]
    pub fn set_item(&mut self, item: Item) {
        assert_one_yocto();
        require!(env::predecessor_account_id() == self.admin, "admin only");
        require!(item.ref_price.0 >= 1, "ref_price must be >= 1");
        require!(!item.id.is_empty() && item.id.len() <= 32, "bad item id");
        event("item_set", json!({"id": item.id, "ref_price": item.ref_price, "as_of": item.as_of}));
        self.items.insert(item.id.clone(), item);
    }

    #[payable]
    pub fn set_arbiter(&mut self, arbiter: AccountId) {
        assert_one_yocto();
        require!(env::predecessor_account_id() == self.admin, "admin only");
        self.arbiter = arbiter;
    }

    // ------------------------------------------------------------ owner

    /// §3 — owner only (1 yocto: function-call keys cannot attach it).
    #[payable]
    pub fn set_policy(&mut self, policy: Policy) {
        assert_one_yocto();
        let owner = env::predecessor_account_id();
        event(
            "policy_set",
            json!({"account_id": owner, "weekly_budget": policy.weekly_budget, "auto_join": policy.auto_join}),
        );
        self.policies.insert(owner, policy);
    }

    /// §2.5 — debit first, then transfer; a failed transfer is credited back.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) -> Promise {
        assert_one_yocto();
        let account = env::predecessor_account_id();
        require!(amount.0 > 0, "amount must be > 0");
        let bal = self.balance(&account);
        require!(bal >= amount.0, "insufficient available balance");
        self.balances.insert(account.clone(), bal - amount.0);
        self.token_held -= amount.0;
        event("withdraw", json!({"account_id": account, "amount": amount}));
        Promise::new(self.token.clone())
            .function_call(
                "ft_transfer".to_string(),
                serde_json::to_vec(&json!({"receiver_id": account, "amount": amount})).unwrap(),
                NearToken::from_yoctonear(1),
                GAS_FT_TRANSFER,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_withdraw(account, amount),
            )
    }

    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, amount: U128) -> bool {
        let ok = env::promise_result_checked(0, 64).is_ok();
        if !ok {
            self.credit(&account_id, amount.0);
            self.token_held += amount.0;
            event("withdraw_refunded", json!({"account_id": account_id, "amount": amount}));
            false
        } else {
            true
        }
    }

    // ------------------------------------------------------------ rounds

    /// §5.1 — anyone may open a round.
    #[allow(clippy::too_many_arguments)]
    pub fn open_round(
        &mut self,
        item: String,
        ceiling_price: U128,
        min_total_qty: u64,
        join_secs: u64,
        commit_secs: u64,
        reveal_secs: u64,
        delivery_secs: u64,
    ) -> u64 {
        let it = self.items.get(&item).cloned().unwrap_or_else(|| env::panic_str("unknown item"));
        require!(ceiling_price.0 >= 1, "ceiling must be >= 1");
        require!(ceiling_price.0 <= it.ref_price.0, "ceiling above reference price");
        require!(min_total_qty >= 1, "min_total_qty must be >= 1");
        for d in [join_secs, commit_secs, reveal_secs, delivery_secs] {
            require!(
                (MIN_PHASE_SECS..=MAX_PHASE_SECS).contains(&d),
                "each duration must be 30 s .. 30 days"
            );
        }
        let now = env::block_timestamp();
        let join_deadline = now + join_secs * NS;
        let commit_deadline = join_deadline + commit_secs * NS;
        let reveal_deadline = commit_deadline + reveal_secs * NS;
        let delivery_deadline = reveal_deadline + delivery_secs * NS;
        let arbiter_deadline = delivery_deadline + delivery_secs * NS;
        let id = self.rounds.len() as u64;
        let opener = env::predecessor_account_id();
        self.rounds.push(Round {
            id,
            item: item.clone(),
            ref_price: it.ref_price,
            ceiling_price,
            min_total_qty,
            total_qty: 0,
            opener: opener.clone(),
            opened_at: now,
            join_deadline,
            commit_deadline,
            reveal_deadline,
            delivery_deadline,
            arbiter_deadline,
            state: RoundState::Active,
            participants: vec![],
            bids: vec![],
            winner: None,
            clearing_price: None,
        });
        event(
            "round_opened",
            json!({"round_id": id, "item": item, "ceiling_price": ceiling_price,
                   "ref_price": it.ref_price, "min_total_qty": min_total_qty, "opener": opener}),
        );
        id
    }

    /// §5.2 — callable by the owner or its agent (function-call key).
    #[payable]
    pub fn join_round(&mut self, round_id: u64, qty: u64) {
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let policy = self
            .policies
            .get(&account)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no policy: owner must call set_policy first"));
        if !policy.auto_join {
            require!(
                env::attached_deposit() == NearToken::from_yoctonear(1),
                "auto_join is off: owner must join (attach 1 yocto)"
            );
        }
        let mut r = self.get_round_mut(round_id).clone();
        require!(phase_of(&r, now) == Phase::Join, "round is not accepting joins");
        require!(qty >= 1, "qty must be >= 1");
        require!(r.participants.len() < MAX_PARTICIPANTS, "round is full");
        require!(
            !r.participants.iter().any(|p| p.account_id == account),
            "already joined this round"
        );
        let max = policy
            .max_price
            .get(&r.item)
            .unwrap_or_else(|| env::panic_str("item not in owner policy"));
        require!(r.ceiling_price.0 <= max.0, "ceiling above owner max_price");
        let cost = r.ceiling_price.0 * qty as u128;
        let week = now / WEEK_NS;
        let spent = self.spent.get(&(account.clone(), week)).copied().unwrap_or(0);
        require!(spent + cost <= policy.weekly_budget.0, "weekly budget exceeded");
        let bal = self.balance(&account);
        require!(bal >= cost, "insufficient available balance");

        self.balances.insert(account.clone(), bal - cost);
        self.add_held(&account, cost);
        self.spent.insert((account.clone(), week), spent + cost);
        r.total_qty += qty;
        r.participants.push(Participant {
            account_id: account.clone(),
            qty,
            week,
            held: U128(cost),
            delivery: Delivery::Pending,
        });
        event(
            "joined",
            json!({"round_id": round_id, "account_id": account, "qty": qty, "locked": U128(cost), "total_qty": r.total_qty}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §5.4
    pub fn reveal_bid(&mut self, round_id: u64, unit_price: U128, salt: String) {
        let seller = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(phase_of(&r, now) == Phase::Reveal, "round is not in reveal phase");
        let ceiling = r.ceiling_price.0;
        let bid = r
            .bids
            .iter_mut()
            .find(|b| b.seller_id == seller)
            .unwrap_or_else(|| env::panic_str("no commit from this seller"));
        require!(bid.revealed_price.is_none(), "already revealed");
        require!(
            bid_hash(round_id, &seller, unit_price.0, &salt) == bid.hash,
            "hash mismatch"
        );
        bid.revealed_price = Some(unit_price);
        bid.valid = unit_price.0 >= 1 && unit_price.0 <= ceiling;
        let valid = bid.valid;
        event(
            "bid_revealed",
            json!({"round_id": round_id, "seller_id": seller, "unit_price": unit_price, "valid": valid}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §5.5 — anyone, once.
    pub fn settle(&mut self, round_id: u64) -> RoundState {
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(
            phase_of(&r, now) == Phase::ReadyToSettle,
            "round is not ready to settle"
        );

        // Bonds of sellers that never revealed are forfeited to buyers.
        let mut forfeited: u128 = 0;
        for b in r.bids.iter_mut().filter(|b| b.revealed_price.is_none()) {
            forfeited += b.bond_held.0;
            self.sub_held(&b.seller_id, b.bond_held.0);
            b.bond_held = U128(0);
        }

        // Lowest valid price; ties go to the earlier commit (vector order).
        let winner = r
            .bids
            .iter()
            .enumerate()
            .filter(|(_, b)| b.valid)
            .min_by(|(ia, a), (ib, b)| {
                a.revealed_price
                    .unwrap()
                    .0
                    .cmp(&b.revealed_price.unwrap().0)
                    .then(ia.cmp(ib))
            })
            .map(|(i, _)| i);

        let failed = r.total_qty < r.min_total_qty || winner.is_none();

        // Revealed losing (or all, if failed) bonds go back.
        for (i, b) in r.bids.iter_mut().enumerate() {
            if b.revealed_price.is_some() && (failed || Some(i) != winner) && b.bond_held.0 > 0 {
                let amt = b.bond_held.0;
                b.bond_held = U128(0);
                self.sub_held(&b.seller_id, amt);
                self.credit(&b.seller_id, amt);
            }
        }

        if failed {
            for p in r.participants.iter_mut() {
                let amt = p.held.0;
                p.held = U128(0);
                self.sub_held(&p.account_id, amt);
                self.credit(&p.account_id, amt);
                self.unspend(&p.account_id, p.week, amt);
            }
            r.state = RoundState::Failed;
            event(
                "round_failed",
                json!({"round_id": round_id, "total_qty": r.total_qty, "forfeited_bonds": U128(forfeited)}),
            );
        } else {
            let w = winner.unwrap();
            let clearing = r.bids[w].revealed_price.unwrap().0;
            let diff = r.ceiling_price.0 - clearing;
            for p in r.participants.iter_mut() {
                let refund = diff * p.qty as u128;
                p.held = U128(p.held.0 - refund);
                self.sub_held(&p.account_id, refund);
                self.credit(&p.account_id, refund);
                self.unspend(&p.account_id, p.week, refund);
            }
            r.winner = Some(w as u32);
            r.clearing_price = Some(U128(clearing));
            r.state = RoundState::Settled;
            let saving = (r.ref_price.0 - clearing) * r.total_qty as u128;
            event(
                "round_settled",
                json!({"round_id": round_id, "winner": r.bids[w].seller_id, "clearing_price": U128(clearing),
                       "total_qty": r.total_qty, "saving_vs_ref": U128(saving), "forfeited_bonds": U128(forfeited)}),
            );
        }

        if forfeited > 0 {
            self.distribute_pro_rata(&r, forfeited);
        }
        let state = r.state;
        self.rounds.replace(round_id as u32, r);
        state
    }

    /// §6 — owner only.
    #[payable]
    pub fn confirm_delivery(&mut self, round_id: u64) {
        assert_one_yocto();
        let buyer = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(phase_of(&r, now) == Phase::Delivery, "not in delivery window");
        let seller = r.bids[r.winner.unwrap() as usize].seller_id.clone();
        let p = Self::participant_mut(&mut r, &buyer);
        require!(p.delivery == Delivery::Pending, "delivery already decided");
        let amt = p.held.0;
        p.held = U128(0);
        p.delivery = Delivery::Confirmed;
        self.sub_held(&buyer, amt);
        self.credit(&seller, amt);
        event(
            "delivery_confirmed",
            json!({"round_id": round_id, "account_id": buyer, "paid": U128(amt), "seller_id": seller}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §6 — owner only.
    #[payable]
    pub fn dispute(&mut self, round_id: u64) {
        assert_one_yocto();
        let buyer = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(phase_of(&r, now) == Phase::Delivery, "not in delivery window");
        let p = Self::participant_mut(&mut r, &buyer);
        require!(p.delivery == Delivery::Pending, "delivery already decided");
        p.delivery = Delivery::Disputed;
        event("disputed", json!({"round_id": round_id, "account_id": buyer}));
        self.rounds.replace(round_id as u32, r);
    }

    /// §6 — arbiter only, before `arbiter_deadline`.
    pub fn resolve_dispute(&mut self, round_id: u64, buyer: AccountId, refund_buyer: bool) {
        require!(env::predecessor_account_id() == self.arbiter, "arbiter only");
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(r.state == RoundState::Settled, "round is not settled");
        require!(now < r.arbiter_deadline, "arbiter deadline passed");
        let w = r.winner.unwrap() as usize;
        let seller = r.bids[w].seller_id.clone();
        let total_qty = r.total_qty as u128;
        let bond = r.bids[w].bond.0;
        let p = Self::participant_mut(&mut r, &buyer);
        require!(p.delivery == Delivery::Disputed, "buyer has no open dispute");
        let amt = p.held.0;
        let qty = p.qty as u128;
        let week = p.week;
        p.held = U128(0);
        p.delivery = Delivery::Resolved { refunded: refund_buyer };
        self.sub_held(&buyer, amt);
        let mut share = 0;
        if refund_buyer {
            share = bond * qty / total_qty;
            self.credit(&buyer, amt + share);
            self.unspend(&buyer, week, amt);
            let b = &mut r.bids[w];
            b.bond_held = U128(b.bond_held.0 - share);
            self.sub_held(&seller, share);
        } else {
            self.credit(&seller, amt);
        }
        event(
            "dispute_resolved",
            json!({"round_id": round_id, "account_id": buyer, "refund_buyer": refund_buyer, "bond_share": U128(share)}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §6 — anyone, after `delivery_deadline`; may be called again until CLOSED.
    pub fn finalize(&mut self, round_id: u64) -> RoundState {
        let now = env::block_timestamp();
        let mut r = self.get_round_mut(round_id).clone();
        require!(
            phase_of(&r, now) == Phase::AwaitingFinalize,
            "round is not awaiting finalize"
        );
        let w = r.winner.unwrap() as usize;
        let seller = r.bids[w].seller_id.clone();
        let arbiter_expired = now >= r.arbiter_deadline;
        let mut open_disputes = 0;
        let mut paid_to_seller = 0u128;
        let mut refunds: Vec<(AccountId, u64, u128)> = vec![];
        for p in r.participants.iter_mut() {
            match p.delivery {
                Delivery::Pending => {
                    paid_to_seller += p.held.0;
                    refunds.push((p.account_id.clone(), p.week, 0));
                    self.sub_held(&p.account_id, p.held.0);
                    p.held = U128(0);
                    p.delivery = Delivery::Accepted;
                }
                Delivery::Disputed if arbiter_expired => {
                    refunds.push((p.account_id.clone(), p.week, p.held.0));
                    self.sub_held(&p.account_id, p.held.0);
                    p.held = U128(0);
                    p.delivery = Delivery::DefaultRefunded;
                }
                Delivery::Disputed => open_disputes += 1,
                _ => {}
            }
        }
        if paid_to_seller > 0 {
            self.credit(&seller, paid_to_seller);
        }
        for (acc, week, amt) in refunds.into_iter().filter(|x| x.2 > 0) {
            self.credit(&acc, amt);
            self.unspend(&acc, week, amt);
        }
        if open_disputes == 0 {
            let b = &mut r.bids[w];
            let rest = b.bond_held.0;
            b.bond_held = U128(0);
            self.sub_held(&seller, rest);
            self.credit(&seller, rest);
            r.state = RoundState::Closed;
            event(
                "round_finalized",
                json!({"round_id": round_id, "paid_to_seller": U128(paid_to_seller), "bond_returned": U128(rest)}),
            );
        } else {
            event(
                "round_finalize_partial",
                json!({"round_id": round_id, "paid_to_seller": U128(paid_to_seller), "open_disputes": open_disputes}),
            );
        }
        let state = r.state;
        self.rounds.replace(round_id as u32, r);
        state
    }

    // ------------------------------------------------------------ views

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
        self.rounds.get(round_id as u32).map(|r| self.view(r))
    }

    pub fn list_rounds(&self, from: Option<u64>, limit: Option<u64>) -> Vec<RoundView> {
        let from = from.unwrap_or(0) as u32;
        let limit = limit.unwrap_or(20).min(50) as u32;
        (from..self.rounds.len().min(from.saturating_add(limit)))
            .filter_map(|i| self.rounds.get(i))
            .map(|r| self.view(r))
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
        let r = self.rounds.get(round_id as u32).unwrap_or_else(|| env::panic_str("no round"));
        U128(required_bond(r.ceiling_price.0, r.total_qty))
    }
}

// ---------------------------------------------------------------- ft receiver

#[near]
impl FungibleTokenReceiver for Market {
    /// §2.1 deposit (`msg = "deposit"`) and §5.3 seller commit
    /// (`msg = {"commit":{"round_id":N,"hash":"<hex>"}}`).
    /// Any rejected transfer returns the full amount.
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        if env::predecessor_account_id() != self.token {
            env::log_str("rejected: unsupported token");
            return PromiseOrValue::Value(amount);
        }
        if msg == "deposit" {
            self.credit(&sender_id, amount.0);
            self.token_held += amount.0;
            event("deposit", json!({"account_id": sender_id, "amount": amount}));
            return PromiseOrValue::Value(U128(0));
        }
        match self.try_commit(&sender_id, amount.0, &msg) {
            Ok(()) => {
                self.token_held += amount.0;
                PromiseOrValue::Value(U128(0))
            }
            Err(e) => {
                env::log_str(&format!("rejected: {}", e));
                PromiseOrValue::Value(amount)
            }
        }
    }
}

// ---------------------------------------------------------------- internals

impl Market {
    fn try_commit(&mut self, seller: &AccountId, amount: u128, msg: &str) -> Result<(), String> {
        let v: Value = serde_json::from_str(msg).map_err(|_| "unknown msg".to_string())?;
        let c = v.get("commit").ok_or("unknown msg")?;
        let round_id = c.get("round_id").and_then(Value::as_u64).ok_or("missing round_id")?;
        let hash = c.get("hash").and_then(Value::as_str).ok_or("missing hash")?.to_string();
        if hash.len() != 64 || !hash.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
            return Err("hash must be 64 lowercase hex chars".into());
        }
        let now = env::block_timestamp();
        let mut r = self.rounds.get(round_id as u32).cloned().ok_or("no such round")?;
        if phase_of(&r, now) != Phase::Commit {
            return Err("round is not in commit phase".into());
        }
        if r.total_qty < r.min_total_qty {
            return Err("not enough demand".into());
        }
        if r.bids.len() >= MAX_BIDS {
            return Err("bid limit reached".into());
        }
        if r.bids.iter().any(|b| &b.seller_id == seller) {
            return Err("seller already committed".into());
        }
        let bond = required_bond(r.ceiling_price.0, r.total_qty);
        if amount != bond {
            return Err(format!("bond must be exactly {}", bond));
        }
        r.bids.push(Bid {
            seller_id: seller.clone(),
            hash,
            bond: U128(bond),
            bond_held: U128(bond),
            revealed_price: None,
            valid: false,
        });
        self.add_held(seller, bond);
        event(
            "bid_committed",
            json!({"round_id": round_id, "seller_id": seller, "bond": U128(bond)}),
        );
        self.rounds.replace(round_id as u32, r);
        Ok(())
    }

    /// Floor split pro rata to qty; remainder to the largest qty (earliest on tie).
    fn distribute_pro_rata(&mut self, r: &Round, total: u128) {
        if r.participants.is_empty() || r.total_qty == 0 {
            env::panic_str("internal: nothing to distribute to");
        }
        let tq = r.total_qty as u128;
        let mut given = 0u128;
        for p in &r.participants {
            let share = total * p.qty as u128 / tq;
            given += share;
            self.credit(&p.account_id, share);
        }
        let rest = total - given;
        if rest > 0 {
            let mut best = &r.participants[0];
            for p in &r.participants {
                if p.qty > best.qty {
                    best = p;
                }
            }
            let acc = best.account_id.clone();
            self.credit(&acc, rest);
        }
        event("bonds_forfeited", json!({"round_id": r.id, "amount": U128(total)}));
    }

    fn get_round_mut(&self, round_id: u64) -> &Round {
        self.rounds
            .get(round_id as u32)
            .unwrap_or_else(|| env::panic_str("no such round"))
    }

    fn participant_mut<'a>(r: &'a mut Round, who: &AccountId) -> &'a mut Participant {
        r.participants
            .iter_mut()
            .find(|p| &p.account_id == who)
            .unwrap_or_else(|| env::panic_str("not a participant"))
    }

    fn view(&self, r: &Round) -> RoundView {
        let saving = r
            .clearing_price
            .map(|c| U128((r.ref_price.0 - c.0) * r.total_qty as u128));
        RoundView {
            round: r.clone(),
            phase: phase_of(r, env::block_timestamp()),
            saving,
        }
    }

    fn balance(&self, a: &AccountId) -> u128 {
        self.balances.get(a).copied().unwrap_or(0)
    }

    fn credit(&mut self, a: &AccountId, amt: u128) {
        if amt == 0 {
            return;
        }
        let b = self.balance(a);
        self.balances.insert(a.clone(), b + amt);
    }

    fn add_held(&mut self, a: &AccountId, amt: u128) {
        let h = self.held.get(a).copied().unwrap_or(0);
        self.held.insert(a.clone(), h + amt);
    }

    fn sub_held(&mut self, a: &AccountId, amt: u128) {
        if amt == 0 {
            return;
        }
        let h = self.held.get(a).copied().unwrap_or(0);
        self.held.insert(a.clone(), h - amt);
    }

    fn unspend(&mut self, a: &AccountId, week: u64, amt: u128) {
        if amt == 0 {
            return;
        }
        let key = (a.clone(), week);
        let s = self.spent.get(&key).copied().unwrap_or(0);
        self.spent.insert(key, s.saturating_sub(amt));
    }

    /// §2 invariant: token_held == Σ available + Σ held-in-rounds.
    /// Used by tests; `accounts` must cover every account that ever held funds.
    #[cfg(test)]
    pub(crate) fn check_invariant(&self, accounts: &[AccountId]) {
        let avail: u128 = accounts.iter().map(|a| self.balance(a)).sum();
        let mut in_rounds = 0u128;
        for r in self.rounds.iter() {
            in_rounds += r.participants.iter().map(|p| p.held.0).sum::<u128>();
            in_rounds += r.bids.iter().map(|b| b.bond_held.0).sum::<u128>();
        }
        let held_map: u128 = accounts.iter().map(|a| self.held.get(a).copied().unwrap_or(0)).sum();
        assert_eq!(held_map, in_rounds, "held map out of sync");
        assert_eq!(self.token_held, avail + in_rounds, "conservation invariant broken");
    }
}
