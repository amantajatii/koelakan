//! Token gate, seller commits and reveal hash checks.
use super::*;

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
