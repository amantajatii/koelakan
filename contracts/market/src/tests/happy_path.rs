//! Full round happy path.
use super::*;

#[test]
fn full_round_happy_path() {
    let mut m = setup();
    let id = joined_round(&mut m);
    assert_eq!(bal(&m, &w(1)), 2_000_000 - 10 * REF);
    m.check_invariant(&all_accounts());

    let bond = required_bond(REF, 55);
    assert_eq!(bond, (REF * 55 * 5).div_ceil(100));
    assert_eq!(
        commit(
            &mut m,
            id,
            &g(1),
            19_900,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        ),
        0
    );
    assert_eq!(
        commit(
            &mut m,
            id,
            &g(2),
            19_500,
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ),
        0
    );
    assert_eq!(
        commit(
            &mut m,
            id,
            &g(3),
            20_200,
            "cccccccccccccccccccccccccccccccc"
        ),
        0
    );
    assert_eq!(
        commit(
            &mut m,
            id,
            &g(4),
            19_000,
            "dddddddddddddddddddddddddddddddd"
        ),
        0
    ); // never reveals
    m.check_invariant(&all_accounts());

    reveal(
        &mut m,
        id,
        &g(1),
        19_900,
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    reveal(
        &mut m,
        id,
        &g(2),
        19_500,
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    reveal(
        &mut m,
        id,
        &g(3),
        20_200,
        "cccccccccccccccccccccccccccccccc",
    );

    ctx(&acc("anyone.near"), t_settle(), 0);
    assert_eq!(m.settle(id), RoundState::Settled);
    let rd = m.get_round(id).unwrap();
    assert_eq!(rd.round.clearing_price, Some(U128(19_500)));
    assert_eq!(
        rd.round.bids[rd.round.winner.unwrap() as usize].seller_id,
        g(2)
    );
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
    assert_eq!(
        bal(&m, &w(2)),
        2_000_000 - 40 * REF + 40 * 1_300 + s2 + rest
    ); // largest qty gets dust
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
