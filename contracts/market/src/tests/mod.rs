//! Unit tests for RULES.md, grouped by area. Each test ends with the
//! conservation invariant. Shared fixtures live here.

use std::collections::BTreeMap;

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::U128;
use near_sdk::{AccountId, NearToken, PromiseOrValue};

use crate::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;

mod auction;
mod commit;
mod delivery;
mod happy_path;
mod limits;
mod policy;

const T0: u64 = 1_000 * NS;
const REF: u128 = 20_800; // minyak-curah, PIHPS 11 Nov 2026
const ITEM: &str = "minyak-curah";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn admin() -> AccountId {
    acc("admin.near")
}
fn arbiter() -> AccountId {
    acc("arbiter.near")
}
fn token() -> AccountId {
    acc("tidr.near")
}
fn w(i: u32) -> AccountId {
    acc(&format!("warung-{}.near", i))
}
fn g(i: u32) -> AccountId {
    acc(&format!("grosir-{}.near", i))
}

fn all_accounts() -> Vec<AccountId> {
    let mut v = vec![admin(), arbiter()];
    v.extend((1..=6).map(w));
    v.extend((1..=5).map(g));
    v
}

/// Set the caller, time and attached deposit (yocto).
fn ctx(who: &AccountId, ts: u64, yocto: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("market.near"))
        .predecessor_account_id(who.clone())
        .block_timestamp(ts)
        .attached_deposit(NearToken::from_yoctonear(yocto));
    testing_env!(b.build());
}

fn setup() -> Market {
    ctx(&admin(), T0, 0);
    let mut m = Market::new(admin(), arbiter(), token());
    ctx(&admin(), T0, 1);
    m.set_item(Item {
        id: ITEM.into(),
        name: "Minyak goreng curah".into(),
        unit: "kg".into(),
        ref_price: U128(REF),
        het: None,
        source: "PIHPS Nasional".into(),
        as_of: "2026-11-11".into(),
    });
    m
}

fn deposit(m: &mut Market, who: &AccountId, amt: u128, ts: u64) {
    ctx(&token(), ts, 0);
    match m.ft_on_transfer(who.clone(), U128(amt), "deposit".into()) {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 0),
        _ => panic!("expected value"),
    }
}

fn policy(m: &mut Market, who: &AccountId, max: u128, budget: u128, auto: bool, ts: u64) {
    ctx(who, ts, 1);
    let mut mp = BTreeMap::new();
    mp.insert(ITEM.to_string(), U128(max));
    m.set_policy(Policy {
        max_price: mp,
        weekly_budget: U128(budget),
        auto_join: auto,
    });
}

/// warung ready: deposit + permissive policy.
fn warung(m: &mut Market, who: &AccountId, ts: u64) {
    deposit(m, who, 2_000_000, ts);
    policy(m, who, 21_000, 1_500_000, true, ts);
}

/// Opens a round: join 120 s, commit 60 s, reveal 60 s, delivery 300 s.
fn open(m: &mut Market, ceiling: u128, min: u64) -> u64 {
    ctx(&acc("koordinator.near"), T0, 0);
    m.open_round(ITEM.into(), U128(ceiling), min, 120, 60, 60, 300)
}

fn r(m: &Market, id: u64) -> Round {
    m.get_round(id).unwrap().round
}

// time helpers for a round opened at T0
fn t_join() -> u64 {
    T0 + 10 * NS
}
fn t_commit() -> u64 {
    T0 + 130 * NS
}
fn t_reveal() -> u64 {
    T0 + 190 * NS
}
fn t_settle() -> u64 {
    T0 + 250 * NS
}
fn t_delivery() -> u64 {
    T0 + 300 * NS
}
fn t_after_delivery() -> u64 {
    T0 + 560 * NS
}
fn t_after_arbiter() -> u64 {
    T0 + 900 * NS
}

fn commit(m: &mut Market, id: u64, seller: &AccountId, price: u128, salt: &str) -> u128 {
    let bond = m.get_required_bond(id).0;
    // seller must own the bond: model the token transfer as a prior deposit-less send
    ctx(&token(), t_commit(), 0);
    let h = bid_hash(id, seller, price, salt);
    let msg = format!(r#"{{"commit":{{"round_id":{},"hash":"{}"}}}}"#, id, h);
    match m.ft_on_transfer(seller.clone(), U128(bond), msg) {
        PromiseOrValue::Value(v) => v.0,
        _ => panic!(),
    }
}

fn reveal(m: &mut Market, id: u64, seller: &AccountId, price: u128, salt: &str) {
    ctx(seller, t_reveal(), 0);
    m.reveal_bid(id, U128(price), salt.into());
}

fn bal(m: &Market, a: &AccountId) -> u128 {
    m.get_balance(a.clone()).available.0
}

/// 3 warungs (10 + 40 + 5 = 55 kg), min 50.
fn joined_round(m: &mut Market) -> u64 {
    for i in 1..=3 {
        warung(m, &w(i), T0);
    }
    let id = open(m, REF, 50);
    for (i, q) in [(1, 10u64), (2, 40), (3, 5)] {
        ctx(&w(i), t_join(), 0); // agent key: no deposit
        m.join_round(id, q);
    }
    id
}
