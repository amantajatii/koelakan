//! Limits and bond math.
use super::*;

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
    assert_eq!(required_bond(3, 1), 1); // 0.15 -> 1
    assert_eq!(required_bond(20_800, 180), 187_200);
}
