//! Non-exported helpers: bid hashing, bond math and balance bookkeeping.
//!
//! Every method here keeps `token_held`, `balances`, `held` and `spent`
//! consistent with the conservation invariant (§2).

use near_sdk::env;
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::AccountId;

use crate::constants::{BOND_BPS, BPS_DENOMINATOR};
use crate::events::event;
use crate::types::{Participant, Round};
use crate::Market;

fn to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push(HEX[(b >> 4) as usize] as char);
        s.push(HEX[(b & 0xf) as usize] as char);
    }
    s
}

/// sha256("{round_id}:{seller}:{unit_price}:{salt}") as lowercase hex (§5.3).
pub fn bid_hash(round_id: u64, seller: &AccountId, unit_price: u128, salt: &str) -> String {
    to_hex(&env::sha256(
        format!("{}:{}:{}:{}", round_id, seller, unit_price, salt).as_bytes(),
    ))
}

/// Exact seller bond: ceil(5% x ceiling x total_qty).
pub fn required_bond(ceiling: u128, total_qty: u64) -> u128 {
    let base = ceiling * total_qty as u128 * BOND_BPS;
    base.div_ceil(BPS_DENOMINATOR)
}

impl Market {
    pub(crate) fn round_ref(&self, round_id: u64) -> &Round {
        self.rounds
            .get(round_id as u32)
            .unwrap_or_else(|| env::panic_str("no such round"))
    }

    pub(crate) fn participant_mut<'a>(r: &'a mut Round, who: &AccountId) -> &'a mut Participant {
        r.participants
            .iter_mut()
            .find(|p| &p.account_id == who)
            .unwrap_or_else(|| env::panic_str("not a participant"))
    }

    pub(crate) fn balance(&self, a: &AccountId) -> u128 {
        self.balances.get(a).copied().unwrap_or(0)
    }

    pub(crate) fn credit(&mut self, a: &AccountId, amt: u128) {
        if amt == 0 {
            return;
        }
        let b = self.balance(a);
        self.balances.insert(a.clone(), b + amt);
    }

    pub(crate) fn add_held(&mut self, a: &AccountId, amt: u128) {
        let h = self.held.get(a).copied().unwrap_or(0);
        self.held.insert(a.clone(), h + amt);
    }

    pub(crate) fn sub_held(&mut self, a: &AccountId, amt: u128) {
        if amt == 0 {
            return;
        }
        let h = self.held.get(a).copied().unwrap_or(0);
        self.held.insert(a.clone(), h - amt);
    }

    /// Gives back budget counted against `week` (saturating at zero).
    pub(crate) fn unspend(&mut self, a: &AccountId, week: u64, amt: u128) {
        if amt == 0 {
            return;
        }
        let key = (a.clone(), week);
        let s = self.spent.get(&key).copied().unwrap_or(0);
        self.spent.insert(key, s.saturating_sub(amt));
    }

    /// Floor split pro rata to qty; remainder to the largest qty (earliest on tie).
    pub(crate) fn distribute_pro_rata(&mut self, r: &Round, total: u128) {
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
        event(
            "bonds_forfeited",
            json!({"round_id": r.id, "amount": U128(total)}),
        );
    }

    /// §2 invariant: token_held == sum(available) + sum(held in rounds).
    /// Used by tests; `accounts` must cover every account that ever held funds.
    #[cfg(test)]
    pub(crate) fn check_invariant(&self, accounts: &[AccountId]) {
        let avail: u128 = accounts.iter().map(|a| self.balance(a)).sum();
        let mut in_rounds = 0u128;
        for r in self.rounds.iter() {
            in_rounds += r.participants.iter().map(|p| p.held.0).sum::<u128>();
            in_rounds += r.bids.iter().map(|b| b.bond_held.0).sum::<u128>();
        }
        let held_map: u128 = accounts
            .iter()
            .map(|a| self.held.get(a).copied().unwrap_or(0))
            .sum();
        assert_eq!(held_map, in_rounds, "held map out of sync");
        assert_eq!(
            self.token_held,
            avail + in_rounds,
            "conservation invariant broken"
        );
    }
}
