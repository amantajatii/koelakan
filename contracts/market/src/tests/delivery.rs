//! Delivery, disputes, arbiter and finalize.
use super::*;

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
