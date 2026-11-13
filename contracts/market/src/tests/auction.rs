//! Auction outcomes: ties, failures, forfeits and round validation.
use super::*;

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
    assert_eq!(bal(&m, &g(1)), bond); // revealed -> bond back
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
