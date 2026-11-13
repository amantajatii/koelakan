//! Delivery and disputes (§6): confirm, dispute, arbiter ruling, finalize.

use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{assert_one_yocto, env, near, require, AccountId};

use crate::events::event;
use crate::types::{Delivery, Phase, RoundState};
use crate::{Market, MarketExt};

#[near]
impl Market {
    /// §6: owner only.
    #[payable]
    pub fn confirm_delivery(&mut self, round_id: u64) {
        assert_one_yocto();
        let buyer = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(r.phase_at(now) == Phase::Delivery, "not in delivery window");
        let seller = r.bids[r.winner.unwrap() as usize].seller_id.clone();
        let p = Self::participant_mut(&mut r, &buyer);
        require!(p.delivery == Delivery::Pending, "delivery already decided");
        let amt = p.held.0;
        p.held = U128(0);
        p.delivery = Delivery::Confirmed;
        self.sub_held(&buyer, amt);
        self.credit(&seller, amt);
        event(
            "delivery_confirmed",
            json!({"round_id": round_id, "account_id": buyer, "paid": U128(amt), "seller_id": seller}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §6: owner only.
    #[payable]
    pub fn dispute(&mut self, round_id: u64) {
        assert_one_yocto();
        let buyer = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(r.phase_at(now) == Phase::Delivery, "not in delivery window");
        let p = Self::participant_mut(&mut r, &buyer);
        require!(p.delivery == Delivery::Pending, "delivery already decided");
        p.delivery = Delivery::Disputed;
        event(
            "disputed",
            json!({"round_id": round_id, "account_id": buyer}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §6: arbiter only, before `arbiter_deadline`.
    pub fn resolve_dispute(&mut self, round_id: u64, buyer: AccountId, refund_buyer: bool) {
        require!(
            env::predecessor_account_id() == self.arbiter,
            "arbiter only"
        );
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(r.state == RoundState::Settled, "round is not settled");
        require!(now < r.arbiter_deadline, "arbiter deadline passed");
        let w = r.winner.unwrap() as usize;
        let seller = r.bids[w].seller_id.clone();
        let total_qty = r.total_qty as u128;
        let bond = r.bids[w].bond.0;
        let p = Self::participant_mut(&mut r, &buyer);
        require!(
            p.delivery == Delivery::Disputed,
            "buyer has no open dispute"
        );
        let amt = p.held.0;
        let qty = p.qty as u128;
        let week = p.week;
        p.held = U128(0);
        p.delivery = Delivery::Resolved {
            refunded: refund_buyer,
        };
        self.sub_held(&buyer, amt);
        let mut share = 0;
        if refund_buyer {
            // Buyer gets its payment back plus a pro-rata slice of the seller bond.
            share = bond * qty / total_qty;
            self.credit(&buyer, amt + share);
            self.unspend(&buyer, week, amt);
            let b = &mut r.bids[w];
            b.bond_held = U128(b.bond_held.0 - share);
            self.sub_held(&seller, share);
        } else {
            self.credit(&seller, amt);
        }
        event(
            "dispute_resolved",
            json!({"round_id": round_id, "account_id": buyer, "refund_buyer": refund_buyer, "bond_share": U128(share)}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §6: anyone, after `delivery_deadline`; may be called again until CLOSED.
    pub fn finalize(&mut self, round_id: u64) -> RoundState {
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(
            r.phase_at(now) == Phase::AwaitingFinalize,
            "round is not awaiting finalize"
        );
        let w = r.winner.unwrap() as usize;
        let seller = r.bids[w].seller_id.clone();
        let arbiter_expired = now >= r.arbiter_deadline;
        let mut open_disputes = 0;
        let mut paid_to_seller = 0u128;
        // (buyer, week, refund amount); amount 0 means no refund.
        let mut refunds: Vec<(AccountId, u64, u128)> = vec![];
        for p in r.participants.iter_mut() {
            match p.delivery {
                // Silence counts as acceptance: paid to the seller.
                Delivery::Pending => {
                    paid_to_seller += p.held.0;
                    refunds.push((p.account_id.clone(), p.week, 0));
                    self.sub_held(&p.account_id, p.held.0);
                    p.held = U128(0);
                    p.delivery = Delivery::Accepted;
                }
                // Arbiter missed its deadline: refund, no bond share.
                Delivery::Disputed if arbiter_expired => {
                    refunds.push((p.account_id.clone(), p.week, p.held.0));
                    self.sub_held(&p.account_id, p.held.0);
                    p.held = U128(0);
                    p.delivery = Delivery::DefaultRefunded;
                }
                Delivery::Disputed => open_disputes += 1,
                _ => {}
            }
        }
        if paid_to_seller > 0 {
            self.credit(&seller, paid_to_seller);
        }
        for (acc, week, amt) in refunds.into_iter().filter(|x| x.2 > 0) {
            self.credit(&acc, amt);
            self.unspend(&acc, week, amt);
        }
        if open_disputes == 0 {
            let b = &mut r.bids[w];
            let rest = b.bond_held.0;
            b.bond_held = U128(0);
            self.sub_held(&seller, rest);
            self.credit(&seller, rest);
            r.state = RoundState::Closed;
            event(
                "round_finalized",
                json!({"round_id": round_id, "paid_to_seller": U128(paid_to_seller), "bond_returned": U128(rest)}),
            );
        } else {
            event(
                "round_finalize_partial",
                json!({"round_id": round_id, "paid_to_seller": U128(paid_to_seller), "open_disputes": open_disputes}),
            );
        }
        let state = r.state;
        self.rounds.replace(round_id as u32, r);
        state
    }
}
