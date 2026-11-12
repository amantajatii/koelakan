//! Golden test: replays sim/golden/scenarios.json against the contract and checks
//! the same `expected` snapshot that the TypeScript engine (sim/) is tested against.

use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;

const SCENARIOS: &str = include_str!("../../../sim/golden/scenarios.json");

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn ctx(who: &AccountId, ts: u64, yocto: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("market.near"))
        .predecessor_account_id(who.clone())
        .block_timestamp(ts)
        .attached_deposit(NearToken::from_yoctonear(yocto));
    testing_env!(b.build());
}

fn s(v: &Value, k: &str) -> String {
    v[k].as_str().unwrap_or_else(|| panic!("missing string {k}")).to_string()
}

fn num(v: &Value, k: &str) -> u128 {
    s(v, k).parse().unwrap()
}

fn id(v: &Value) -> u64 {
    v["round_id"].as_u64().unwrap()
}

fn expect_zero(r: PromiseOrValue<U128>) {
    match r {
        PromiseOrValue::Value(v) => assert_eq!(v.0, 0, "transfer was rejected"),
        _ => panic!("expected a value"),
    }
}

fn build_market(sc: &Value) -> Market {
    let (admin, start) = (acc(&s(sc, "admin")), s(sc, "start").parse().unwrap());
    ctx(&admin, start, 0);
    let mut m = Market::new(admin.clone(), acc(&s(sc, "arbiter")), acc(&s(sc, "token")));
    for it in sc["items"].as_array().unwrap() {
        ctx(&admin, start, 1);
        m.set_item(Item {
            id: s(it, "id"),
            name: s(it, "name"),
            unit: s(it, "unit"),
            ref_price: U128(num(it, "ref_price")),
            het: it["het"].as_str().map(|h| U128(h.parse().unwrap())),
            source: s(it, "source"),
            as_of: s(it, "as_of"),
        });
    }
    m
}

fn do_policy(m: &mut Market, who: &AccountId, now: u64, a: &Value) {
    let max_price = a["max_price"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(k, v)| (k.clone(), U128(v.as_str().unwrap().parse().unwrap())))
        .collect();
    ctx(who, now, 1);
    m.set_policy(Policy {
        max_price,
        weekly_budget: U128(num(a, "weekly_budget")),
        auto_join: a["auto_join"].as_bool().unwrap(),
    });
}

fn do_commit(m: &mut Market, token: &AccountId, who: &AccountId, now: u64, a: &Value) {
    let rid = id(a);
    let bond = m.get_required_bond(rid).0;
    let hash = bid_hash(rid, who, num(a, "price"), &s(a, "salt"));
    let msg = format!(r#"{{"commit":{{"round_id":{rid},"hash":"{hash}"}}}}"#);
    ctx(token, now, 0);
    expect_zero(m.ft_on_transfer(who.clone(), U128(bond), msg));
}

fn do_open(m: &mut Market, who: &AccountId, now: u64, a: &Value) {
    ctx(who, now, 0);
    let n = |k: &str| a[k].as_u64().unwrap();
    m.open_round(
        s(a, "item"),
        U128(num(a, "ceiling_price")),
        n("min_total_qty"),
        n("join_secs"),
        n("commit_secs"),
        n("reveal_secs"),
        n("delivery_secs"),
    );
}

fn apply(m: &mut Market, sc: &Value, act: &Value) {
    let now: u64 = s(act, "now").parse().unwrap();
    let who = acc(&s(act, "caller"));
    let a = &act["args"];
    let token = acc(&s(sc, "token"));
    match s(act, "method").as_str() {
        "set_policy" => do_policy(m, &who, now, a),
        "deposit" => {
            ctx(&token, now, 0);
            expect_zero(m.ft_on_transfer(who, U128(num(a, "amount")), "deposit".into()));
        }
        "open_round" => do_open(m, &who, now, a),
        "join_round" => {
            ctx(&who, now, 0);
            m.join_round(id(a), a["qty"].as_u64().unwrap());
        }
        "commit" => do_commit(m, &token, &who, now, a),
        "reveal_bid" => {
            ctx(&who, now, 0);
            m.reveal_bid(id(a), U128(num(a, "unit_price")), s(a, "salt"));
        }
        "settle" => {
            ctx(&who, now, 0);
            m.settle(id(a));
        }
        "finalize" => {
            ctx(&who, now, 0);
            m.finalize(id(a));
        }
        "confirm_delivery" => {
            ctx(&who, now, 1);
            m.confirm_delivery(id(a));
        }
        "dispute" => {
            ctx(&who, now, 1);
            m.dispute(id(a));
        }
        "resolve_dispute" => {
            ctx(&who, now, 0);
            m.resolve_dispute(id(a), acc(&s(a, "buyer")), a["refund_buyer"].as_bool().unwrap());
        }
        "withdraw" => {
            ctx(&who, now, 1);
            let _ = m.withdraw(U128(num(a, "amount")));
        }
        other => panic!("unknown golden method: {other}"),
    }
}

fn state_name(st: RoundState) -> &'static str {
    match st {
        RoundState::Active => "Active",
        RoundState::Failed => "Failed",
        RoundState::Settled => "Settled",
        RoundState::Closed => "Closed",
    }
}

fn delivery_name(d: Delivery) -> &'static str {
    match d {
        Delivery::Pending => "Pending",
        Delivery::Confirmed => "Confirmed",
        Delivery::Disputed => "Disputed",
        Delivery::Resolved { refunded: true } => "ResolvedRefunded",
        Delivery::Resolved { refunded: false } => "ResolvedPaid",
        Delivery::Accepted => "Accepted",
        Delivery::DefaultRefunded => "DefaultRefunded",
    }
}

fn opt(v: Option<U128>) -> Value {
    v.map_or(Value::Null, |x| json!(x.0.to_string()))
}

fn round_snapshot(rv: RoundView) -> Value {
    let r = rv.round;
    let winner = r.winner.map(|w| r.bids[w as usize].seller_id.to_string());
    json!({
        "id": r.id,
        "state": state_name(r.state),
        "total_qty": r.total_qty.to_string(),
        "winner": winner,
        "clearing_price": opt(r.clearing_price),
        "saving": opt(rv.saving),
        "participants": r.participants.iter().map(|p| json!({
            "account_id": p.account_id.to_string(),
            "qty": p.qty.to_string(),
            "held": p.held.0.to_string(),
            "delivery": delivery_name(p.delivery),
        })).collect::<Vec<_>>(),
        "bids": r.bids.iter().map(|b| json!({
            "seller_id": b.seller_id.to_string(),
            "bond": b.bond.0.to_string(),
            "bond_held": b.bond_held.0.to_string(),
            "revealed_price": opt(b.revealed_price),
            "valid": b.valid,
        })).collect::<Vec<_>>(),
    })
}

fn snapshot(m: &Market, expected: &Value) -> Value {
    let balances: serde_json::Map<String, Value> = expected["balances"]
        .as_object()
        .unwrap()
        .keys()
        .map(|name| {
            let a = acc(name);
            let b = m.get_balance(a.clone());
            let spent = m.get_spent(a, Some(0));
            let v = json!({
                "available": b.available.0.to_string(),
                "held": b.held.0.to_string(),
                "spent_week0": spent.0.to_string(),
            });
            (name.clone(), v)
        })
        .collect();
    let rounds: Vec<Value> = m.list_rounds(Some(0), Some(50)).into_iter().map(round_snapshot).collect();
    json!({
        "token_held": m.get_config().token_held.0.to_string(),
        "balances": balances,
        "rounds": rounds,
    })
}

fn run_scenario(sc: &Value) {
    let name = s(sc, "name");
    let mut m = build_market(sc);
    for act in sc["actions"].as_array().unwrap() {
        apply(&mut m, sc, act);
    }
    let expected = &sc["expected"];
    assert!(!expected.is_null(), "{name}: run `pnpm golden:gen` in sim/");
    let last = sc["actions"].as_array().unwrap().last().unwrap();
    ctx(&acc(&s(sc, "admin")), s(last, "now").parse().unwrap(), 0);
    assert_eq!(&snapshot(&m, expected), expected, "golden mismatch in scenario {name}");

    let mut accounts: Vec<AccountId> =
        expected["balances"].as_object().unwrap().keys().map(|k| acc(k)).collect();
    accounts.extend([acc(&s(sc, "admin")), acc(&s(sc, "arbiter"))]);
    m.check_invariant(&accounts);
}

#[test]
fn golden_scenarios_match_expected() {
    let file: Value = serde_json::from_str(SCENARIOS).unwrap();
    let scenarios = file["scenarios"].as_array().unwrap();
    assert!(scenarios.len() >= 4, "expected at least 4 golden scenarios");
    for sc in scenarios {
        // The mocked blockchain (and its storage) is thread-local: a fresh thread per
        // scenario guarantees a clean contract state.
        let sc = sc.clone();
        let name = s(&sc, "name");
        std::thread::spawn(move || run_scenario(&sc))
            .join()
            .unwrap_or_else(|_| panic!("scenario {name} failed"));
    }
}
