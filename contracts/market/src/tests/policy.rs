//! Owner policy, budget and function-call key restrictions.
use super::*;

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
    m.set_policy(Policy {
        max_price: BTreeMap::new(),
        weekly_budget: U128(1),
        auto_join: true,
    });
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn agent_key_cannot_confirm() {
    let mut m = setup();
    let id = joined_round(&mut m);
    commit(
        &mut m,
        id,
        &g(1),
        19_500,
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    reveal(
        &mut m,
        id,
        &g(1),
        19_500,
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
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
