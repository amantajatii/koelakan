//! Unit tests for RULES.md. Each test ends with the conservation invariant.

use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;

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
    m.set_policy(Policy { max_price: mp, weekly_budget: U128(budget), auto_join: auto });
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

// ---------------------------------------------------------------- happy path

#[test]
fn full_round_happy_path() {
    let mut m = setup();
    let id = joined_round(&mut m);
    assert_eq!(bal(&m, &w(1)), 2_000_000 - 10 * REF);
    m.check_invariant(&all_accounts());

    let bond = required_bond(REF, 55);
    assert_eq!(bond, (REF * 55 * 5).div_ceil(100));
    assert_eq!(commit(&mut m, id, &g(1), 19_900, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), 0);
    assert_eq!(commit(&mut m, id, &g(2), 19_500, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), 0);
    assert_eq!(commit(&mut m, id, &g(3), 20_200, "cccccccccccccccccccccccccccccccc"), 0);
    assert_eq!(commit(&mut m, id, &g(4), 19_000, "dddddddddddddddddddddddddddddddd"), 0); // never reveals
    m.check_invariant(&all_accounts());

    reveal(&mut m, id, &g(1), 19_900, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    reveal(&mut m, id, &g(2), 19_500, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    reveal(&mut m, id, &g(3), 20_200, "cccccccccccccccccccccccccccccccc");

    ctx(&acc("anyone.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Settled);
    let rd = m.get_round(id).unwrap();
    assert_eq!(rd.round.clearing_price, Some(U128(19_500)));
    assert_eq!(rd.round.bids[rd.round.winner.unwrap() as usize].seller_id, g(2));
    assert_eq!(rd.saving, Some(U128(1_300 * 55)));

    // losers' bonds back; g4's bond forfeited to buyers pro rata (10/55, 40/55, 5/55)
    assert_eq!(bal(&m, &g(1)), bond);
    assert_eq!(bal(&m, &g(3)), bond);
    assert_eq!(bal(&m, &g(4)), 0);
    let s1 = bond * 10 / 55;
    let s2 = bond * 40 / 55;
    let s3 = bond * 5 / 55;
    let rest = bond - s1 - s2 - s3;
    assert_eq!(bal(&m, &w(1)), 2_000_000 - 10 * REF + 10 * 1_300 + s1);
    assert_eq!(bal(&m, &w(2)), 2_000_000 - 40 * REF + 40 * 1_300 + s2 + rest); // largest qty gets dust
    assert_eq!(bal(&m, &w(3)), 2_000_000 - 5 * REF + 5 * 1_300 + s3);
    m.check_invariant(&all_accounts());

    // w1 confirms; w2, w3 stay silent
    ctx(&w(1), t_delivery(), 1);
    m.confirm_delivery(id);
    assert_eq!(bal(&m, &g(2)), 10 * 19_500);
    m.check_invariant(&all_accounts());

    ctx(&acc("anyone.near"), t_after_delivery(), 0);
    assert_eq!(m.finalize(id), RoundState::Closed);
    assert_eq!(bal(&m, &g(2)), 55 * 19_500 + bond);
    assert_eq!(m.get_balance(g(2)).held.0, 0);
    m.check_invariant(&all_accounts());

    // spent counter dropped by the refunded difference
    assert_eq!(m.get_spent(w(1), Some(t_join() / WEEK_NS)).0, 10 * 19_500);
}

// ---------------------------------------------------------------- policy & keys

#[test]
#[should_panic(expected = "ceiling above owner max_price")]
fn agent_cannot_join_above_owner_max() {
    let mut m = setup();
    deposit(&mut m, &w(1), 1_000_000, T0);
    policy(&mut m, &w(1), 20_000, 1_000_000, true, T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 0);
    m.join_round(id, 1);
}

#[test]
#[should_panic(expected = "weekly budget exceeded")]
fn weekly_budget_enforced() {
    let mut m = setup();
    deposit(&mut m, &w(1), 1_000_000, T0);
    policy(&mut m, &w(1), 21_000, 100_000, true, T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 0);
    m.join_round(id, 5); // 104_000 > 100_000
}

#[test]
#[should_panic(expected = "insufficient available balance")]
fn join_needs_balance() {
    let mut m = setup();
    deposit(&mut m, &w(1), 10_000, T0);
    policy(&mut m, &w(1), 21_000, 1_000_000, true, T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 0);
    m.join_round(id, 1);
}

#[test]
#[should_panic(expected = "auto_join is off")]
fn agent_cannot_join_when_auto_join_off() {
    let mut m = setup();
    deposit(&mut m, &w(1), 1_000_000, T0);
    policy(&mut m, &w(1), 21_000, 1_000_000, false, T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 0); // function-call key: cannot attach deposit
    m.join_round(id, 1);
}

#[test]
fn owner_can_join_when_auto_join_off() {
    let mut m = setup();
    deposit(&mut m, &w(1), 1_000_000, T0);
    policy(&mut m, &w(1), 21_000, 1_000_000, false, T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 1);
    m.join_round(id, 1);
    assert_eq!(r(&m, id).total_qty, 1);
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn agent_key_cannot_withdraw() {
    let mut m = setup();
    deposit(&mut m, &w(1), 1_000, T0);
    ctx(&w(1), T0, 0);
    let _ = m.withdraw(U128(1_000));
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn agent_key_cannot_change_policy() {
    let mut m = setup();
    ctx(&w(1), T0, 0);
    m.set_policy(Policy { max_price: BTreeMap::new(), weekly_budget: U128(1), auto_join: true });
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn agent_key_cannot_confirm() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(&mut m, id, &g(1), 19_500, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    reveal(&mut m, id, &g(1), 19_500, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    ctx(&acc("x.near"), t_settle(), 0);
    m.settle(id);
    ctx(&w(1), t_delivery(), 0);
    m.confirm_delivery(id);
}

#[test]
fn withdraw_debits_then_credits_back_on_failure() {
    let mut m = setup();
    deposit(&mut m, &w(1), 5_000, T0);
    ctx(&w(1), T0, 1);
    let _ = m.withdraw(U128(3_000));
    assert_eq!(bal(&m, &w(1)), 2_000);
    m.check_invariant(&all_accounts());

    // simulate a failed ft_transfer in the callback
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("market.near"))
        .predecessor_account_id(acc("market.near"))
        .block_timestamp(T0);
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Failed]
    );
    assert!(!m.on_withdraw(w(1), U128(3_000)));
    assert_eq!(bal(&m, &w(1)), 5_000);
    m.check_invariant(&all_accounts());
}

// ---------------------------------------------------------------- token gate & commit

#[test]
fn other_token_is_rejected() {
    let mut m = setup();
    ctx(&acc("fake-usdc.near"), T0, 0);
    match m.ft_on_transfer(w(1), U128(500), "deposit".into()) {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 500),
        _ => panic!(),
    }
    assert_eq!(bal(&m, &w(1)), 0);
    m.check_invariant(&all_accounts());
}

#[test]
fn unknown_msg_is_returned() {
    let mut m = setup();
    ctx(&token(), T0, 0);
    match m.ft_on_transfer(w(1), U128(500), "hello".into()) {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 500),
        _ => panic!(),
    }
}

#[test]
fn wrong_bond_is_returned() {
    let mut m = setup();
    let id = joined_round(&mut m);
    ctx(&token(), t_commit(), 0);
    let h = bid_hash(id, &g(1), 19_500, "salt-salt-salt-salt");
    let msg = format!(r#"{{"commit":{{"round_id":{},"hash":"{}"}}}}"#, id, h);
    match m.ft_on_transfer(g(1), U128(1), msg) {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 1),
        _ => panic!(),
    }
    assert!(r(&m, id).bids.is_empty());
}

#[test]
fn commit_outside_phase_is_returned() {
    let mut m = setup();
    let id = joined_round(&mut m);
    let bond = m.get_required_bond(id).0;
    ctx(&token(), t_join(), 0); // still join phase
    let h = bid_hash(id, &g(1), 19_500, "s");
    let msg = format!(r#"{{"commit":{{"round_id":{},"hash":"{}"}}}}"#, id, h);
    match m.ft_on_transfer(g(1), U128(bond), msg) {
        PromiseOrValue::Value(v) => assert_eq!(v.0, bond),
        _ => panic!(),
    }
}

#[test]
fn second_commit_from_same_seller_is_returned() {
    let mut m = setup();
    let id = joined_round(&mut m);
    let bond = m.get_required_bond(id).0;
    assert_eq!(commit(&mut m, id, &g(1), 19_500, "a"), 0);
    assert_eq!(commit(&mut m, id, &g(1), 19_400, "b"), bond);
    assert_eq!(r(&m, id).bids.len(), 1);
}

#[test]
#[should_panic(expected = "hash mismatch")]
fn reveal_with_wrong_salt_fails() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(&mut m, id, &g(1), 19_500, "right");
    reveal(&mut m, id, &g(1), 19_500, "wrong");
}

#[test]
#[should_panic(expected = "hash mismatch")]
fn reveal_with_other_price_fails() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(&mut m, id, &g(1), 19_500, "s");
    reveal(&mut m, id, &g(1), 19_000, "s");
}

#[test]
#[should_panic(expected = "hash mismatch")]
fn seller_cannot_reuse_another_sellers_hash() {
    let mut m = setup();
    let id = joined_round(&mut m);
    // g2 copies g1's hash
    let bond = m.get_required_bond(id).0;
    let h = bid_hash(id, &g(1), 19_500, "s");
    ctx(&token(), t_commit(), 0);
    let msg = format!(r#"{{"commit":{{"round_id":{},"hash":"{}"}}}}"#, id, h);
    let _ = m.ft_on_transfer(g(2), U128(bond), msg);
    reveal(&mut m, id, &g(2), 19_500, "s");
}

// ---------------------------------------------------------------- auction outcomes

#[test]
fn tie_goes_to_earlier_commit() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(&mut m, id, &g(3), 19_500, "x");
    commit(&mut m, id, &g(1), 19_500, "y");
    reveal(&mut m, id, &g(1), 19_500, "y");
    reveal(&mut m, id, &g(3), 19_500, "x");
    ctx(&acc("x.near"), t_settle(), 0);
    m.settle(id);
    let rd = r(&m, id);
    assert_eq!(rd.bids[rd.winner.unwrap() as usize].seller_id, g(3));
}

#[test]
fn bid_above_ceiling_is_invalid_and_round_fails() {
    let mut m = setup();
    let id = joined_round(&mut m);
    let bond = m.get_required_bond(id).0;
    commit(&mut m, id, &g(1), REF + 1, "s");
    reveal(&mut m, id, &g(1), REF + 1, "s");
    ctx(&acc("x.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Failed);
    assert_eq!(bal(&m, &g(1)), bond); // revealed → bond back
    assert_eq!(bal(&m, &w(1)), 2_000_000); // full refund
    assert_eq!(m.get_spent(w(1), Some(t_join() / WEEK_NS)).0, 0);
    m.check_invariant(&all_accounts());
}

#[test]
fn not_enough_demand_fails_early_and_refunds() {
    let mut m = setup();
    warung(&mut m, &w(1), T0);
    let id = open(&mut m, REF, 100);
    ctx(&w(1), t_join(), 0);
    m.join_round(id, 10);
    // right after join deadline, before reveal deadline
    ctx(&acc("x.near"), t_commit(), 0);
    assert_eq!(m.get_round(id).unwrap().phase, Phase::ReadyToSettle);
    assert_eq!(m.settle(id), RoundState::Failed);
    assert_eq!(bal(&m, &w(1)), 2_000_000);
    m.check_invariant(&all_accounts());
}

#[test]
fn no_bids_fails_and_refunds() {
    let mut m = setup();
    let id = joined_round(&mut m);
    ctx(&acc("x.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Failed);
    for i in 1..=3 {
        assert_eq!(bal(&m, &w(i)), 2_000_000);
    }
    m.check_invariant(&all_accounts());
}

#[test]
fn only_unrevealed_bids_fail_and_bonds_go_to_buyers() {
    let mut m = setup();
    let id = joined_round(&mut m);
    let bond = m.get_required_bond(id).0;
    commit(&mut m, id, &g(1), 19_500, "s");
    ctx(&acc("x.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Failed);
    let total: u128 = (1..=3).map(|i| bal(&m, &w(i))).sum();
    assert_eq!(total, 3 * 2_000_000 + bond);
    assert_eq!(bal(&m, &g(1)), 0);
    m.check_invariant(&all_accounts());
}

#[test]
#[should_panic(expected = "round is not ready to settle")]
fn cannot_settle_twice() {
    let mut m = setup();
    let id = joined_round(&mut m);
    ctx(&acc("x.near"), t_settle(), 0);
    m.settle(id);
    m.settle(id);
}

#[test]
#[should_panic(expected = "round is not ready to settle")]
fn cannot_settle_during_reveal() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(&mut m, id, &g(1), 19_500, "s");
    ctx(&acc("x.near"), t_reveal(), 0);
    m.settle(id);
}

#[test]
#[should_panic(expected = "round is not accepting joins")]
fn cannot_join_after_deadline() {
    let mut m = setup();
    warung(&mut m, &w(1), T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_commit(), 0);
    m.join_round(id, 1);
}

#[test]
#[should_panic(expected = "already joined")]
fn cannot_join_twice() {
    let mut m = setup();
    warung(&mut m, &w(1), T0);
    let id = open(&mut m, REF, 1);
    ctx(&w(1), t_join(), 0);
    m.join_round(id, 1);
    m.join_round(id, 1);
}

#[test]
#[should_panic(expected = "ceiling above reference price")]
fn ceiling_capped_by_reference_price() {
    let mut m = setup();
    open(&mut m, REF + 1, 1);
}

#[test]
#[should_panic(expected = "each duration")]
fn durations_validated() {
    let mut m = setup();
    ctx(&w(1), T0, 0);
    m.open_round(ITEM.into(), U128(REF), 1, 10, 60, 60, 300);
}

#[test]
#[should_panic(expected = "admin only")]
fn only_admin_sets_items() {
    let mut m = setup();
    ctx(&w(1), T0, 1);
    m.set_item(Item {
        id: "x".into(),
        name: "x".into(),
        unit: "kg".into(),
        ref_price: U128(1),
        het: None,
        source: "".into(),
        as_of: "".into(),
    });
}

// ---------------------------------------------------------------- delivery & disputes

fn settled_round(m: &mut Market) -> (u64, u128) {
    let id = joined_round(m);
    let bond = m.get_required_bond(id).0;
    commit(m, id, &g(1), 19_500, "s");
    reveal(m, id, &g(1), 19_500, "s");
    ctx(&acc("x.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Settled);
    (id, bond)
}

#[test]
fn dispute_refunded_by_arbiter_with_bond_share() {
    let mut m = setup();
    let (id, bond) = settled_round(&mut m);
    let before = bal(&m, &w(2));
    ctx(&w(2), t_delivery(), 1);
    m.dispute(id);
    ctx(&arbiter(), t_after_delivery(), 0);
    m.resolve_dispute(id, w(2), true);
    let share = bond * 40 / 55;
    assert_eq!(bal(&m, &w(2)), before + 40 * 19_500 + share);
    m.check_invariant(&all_accounts());

    ctx(&acc("x.near"), t_after_delivery(), 0);
    assert_eq!(m.finalize(id), RoundState::Closed);
    // seller: w1 + w3 payments + bond minus share
    assert_eq!(bal(&m, &g(1)), 15 * 19_500 + bond - share);
    m.check_invariant(&all_accounts());
}

#[test]
fn dispute_resolved_for_seller() {
    let mut m = setup();
    let (id, bond) = settled_round(&mut m);
    ctx(&w(2), t_delivery(), 1);
    m.dispute(id);
    ctx(&arbiter(), t_after_delivery(), 0);
    m.resolve_dispute(id, w(2), false);
    ctx(&acc("x.near"), t_after_delivery(), 0);
    assert_eq!(m.finalize(id), RoundState::Closed);
    assert_eq!(bal(&m, &g(1)), 55 * 19_500 + bond);
    m.check_invariant(&all_accounts());
}

#[test]
fn finalize_waits_for_arbiter_then_defaults_to_refund() {
    let mut m = setup();
    let (id, bond) = settled_round(&mut m);
    let before = bal(&m, &w(2));
    ctx(&w(2), t_delivery(), 1);
    m.dispute(id);

    ctx(&acc("x.near"), t_after_delivery(), 0);
    assert_eq!(m.finalize(id), RoundState::Settled); // dispute still open
    assert_eq!(bal(&m, &g(1)), 15 * 19_500); // undisputed paid already
    m.check_invariant(&all_accounts());

    ctx(&acc("x.near"), t_after_arbiter(), 0);
    assert_eq!(m.finalize(id), RoundState::Closed);
    assert_eq!(bal(&m, &w(2)), before + 40 * 19_500); // payment back, no bond share
    assert_eq!(bal(&m, &g(1)), 15 * 19_500 + bond); // seller keeps full bond
    m.check_invariant(&all_accounts());
}

#[test]
#[should_panic(expected = "arbiter only")]
fn only_arbiter_resolves() {
    let mut m = setup();
    let (id, _) = settled_round(&mut m);
    ctx(&w(2), t_delivery(), 1);
    m.dispute(id);
    ctx(&admin(), t_after_delivery(), 0);
    m.resolve_dispute(id, w(2), true);
}

#[test]
#[should_panic(expected = "arbiter deadline passed")]
fn arbiter_cannot_rule_after_deadline() {
    let mut m = setup();
    let (id, _) = settled_round(&mut m);
    ctx(&w(2), t_delivery(), 1);
    m.dispute(id);
    ctx(&arbiter(), t_after_arbiter(), 0);
    m.resolve_dispute(id, w(2), true);
}

#[test]
#[should_panic(expected = "delivery already decided")]
fn cannot_dispute_after_confirm() {
    let mut m = setup();
    let (id, _) = settled_round(&mut m);
    ctx(&w(1), t_delivery(), 1);
    m.confirm_delivery(id);
    m.dispute(id);
}

#[test]
#[should_panic(expected = "not in delivery window")]
fn cannot_confirm_after_deadline() {
    let mut m = setup();
    let (id, _) = settled_round(&mut m);
    ctx(&w(1), t_after_delivery(), 1);
    m.confirm_delivery(id);
}

#[test]
fn withdraw_after_round() {
    let mut m = setup();
    let (id, bond) = settled_round(&mut m);
    ctx(&acc("x.near"), t_after_delivery(), 0);
    m.finalize(id);
    ctx(&g(1), t_after_delivery(), 1);
    let _ = m.withdraw(U128(55 * 19_500 + bond));
    assert_eq!(bal(&m, &g(1)), 0);
    m.check_invariant(&all_accounts());
}

// ---------------------------------------------------------------- limits

#[test]
fn participant_cap() {
    let mut m = setup();
    let id = open(&mut m, REF, 1);
    let mut joined = 0;
    for i in 0..MAX_PARTICIPANTS as u32 {
        let a = acc(&format!("cap-{}.near", i));
        deposit(&mut m, &a, REF, T0);
        policy(&mut m, &a, REF, REF, true, T0);
        ctx(&a, t_join(), 0);
        m.join_round(id, 1);
        joined += 1;
    }
    assert_eq!(joined, MAX_PARTICIPANTS);
    let a = acc("one-too-many.near");
    deposit(&mut m, &a, REF, T0);
    policy(&mut m, &a, REF, REF, true, T0);
    ctx(&a, t_join(), 0);
    let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| m.join_round(id, 1)));
    assert!(res.is_err());
}

#[test]
fn bond_is_ceil_5_percent() {
    assert_eq!(required_bond(20_800, 55), 57_200);
    assert_eq!(required_bond(3, 1), 1); // 0.15 → 1
    assert_eq!(required_bond(20_800, 180), 187_200);
}
