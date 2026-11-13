//! Round lifecycle up to settlement: open (§5.1), join (§5.2), reveal (§5.4)
//! and settle (§5.5). Seller commits arrive through `ft_receiver`.

use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{env, near, require, NearToken};

use crate::constants::{MAX_PARTICIPANTS, MAX_PHASE_SECS, MIN_PHASE_SECS, NS, WEEK_NS};
use crate::events::event;
use crate::internal::bid_hash;
use crate::types::{Delivery, Participant, Phase, Round, RoundState};
use crate::{Market, MarketExt};

#[near]
impl Market {
    /// §5.1: anyone may open a round.
    #[allow(clippy::too_many_arguments)]
    pub fn open_round(
        &mut self,
        item: String,
        ceiling_price: U128,
        min_total_qty: u64,
        join_secs: u64,
        commit_secs: u64,
        reveal_secs: u64,
        delivery_secs: u64,
    ) -> u64 {
        let it = self
            .items
            .get(&item)
            .cloned()
            .unwrap_or_else(|| env::panic_str("unknown item"));
        require!(ceiling_price.0 >= 1, "ceiling must be >= 1");
        require!(
            ceiling_price.0 <= it.ref_price.0,
            "ceiling above reference price"
        );
        require!(min_total_qty >= 1, "min_total_qty must be >= 1");
        for d in [join_secs, commit_secs, reveal_secs, delivery_secs] {
            require!(
                (MIN_PHASE_SECS..=MAX_PHASE_SECS).contains(&d),
                "each duration must be 30 s .. 30 days"
            );
        }
        let now = env::block_timestamp();
        let join_deadline = now + join_secs * NS;
        let commit_deadline = join_deadline + commit_secs * NS;
        let reveal_deadline = commit_deadline + reveal_secs * NS;
        let delivery_deadline = reveal_deadline + delivery_secs * NS;
        // The arbiter gets as long to rule as the buyers had to confirm.
        let arbiter_deadline = delivery_deadline + delivery_secs * NS;
        let id = self.rounds.len() as u64;
        let opener = env::predecessor_account_id();
        self.rounds.push(Round {
            id,
            item: item.clone(),
            ref_price: it.ref_price,
            ceiling_price,
            min_total_qty,
            total_qty: 0,
            opener: opener.clone(),
            opened_at: now,
            join_deadline,
            commit_deadline,
            reveal_deadline,
            delivery_deadline,
            arbiter_deadline,
            state: RoundState::Active,
            participants: vec![],
            bids: vec![],
            winner: None,
            clearing_price: None,
        });
        event(
            "round_opened",
            json!({"round_id": id, "item": item, "ceiling_price": ceiling_price,
                   "ref_price": it.ref_price, "min_total_qty": min_total_qty, "opener": opener}),
        );
        id
    }

    /// §5.2: callable by the owner or its agent (function-call key).
    #[payable]
    pub fn join_round(&mut self, round_id: u64, qty: u64) {
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let policy = self
            .policies
            .get(&account)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no policy: owner must call set_policy first"));
        if !policy.auto_join {
            require!(
                env::attached_deposit() == NearToken::from_yoctonear(1),
                "auto_join is off: owner must join (attach 1 yocto)"
            );
        }
        let mut r = self.round_ref(round_id).clone();
        require!(
            r.phase_at(now) == Phase::Join,
            "round is not accepting joins"
        );
        require!(qty >= 1, "qty must be >= 1");
        require!(r.participants.len() < MAX_PARTICIPANTS, "round is full");
        require!(
            !r.participants.iter().any(|p| p.account_id == account),
            "already joined this round"
        );
        let max = policy
            .max_price
            .get(&r.item)
            .unwrap_or_else(|| env::panic_str("item not in owner policy"));
        require!(r.ceiling_price.0 <= max.0, "ceiling above owner max_price");
        let cost = r.ceiling_price.0 * qty as u128;
        let week = now / WEEK_NS;
        let spent = self
            .spent
            .get(&(account.clone(), week))
            .copied()
            .unwrap_or(0);
        require!(
            spent + cost <= policy.weekly_budget.0,
            "weekly budget exceeded"
        );
        let bal = self.balance(&account);
        require!(bal >= cost, "insufficient available balance");

        self.balances.insert(account.clone(), bal - cost);
        self.add_held(&account, cost);
        self.spent.insert((account.clone(), week), spent + cost);
        r.total_qty += qty;
        r.participants.push(Participant {
            account_id: account.clone(),
            qty,
            week,
            held: U128(cost),
            delivery: Delivery::Pending,
        });
        event(
            "joined",
            json!({"round_id": round_id, "account_id": account, "qty": qty, "locked": U128(cost), "total_qty": r.total_qty}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §5.4
    pub fn reveal_bid(&mut self, round_id: u64, unit_price: U128, salt: String) {
        let seller = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(
            r.phase_at(now) == Phase::Reveal,
            "round is not in reveal phase"
        );
        let ceiling = r.ceiling_price.0;
        let bid = r
            .bids
            .iter_mut()
            .find(|b| b.seller_id == seller)
            .unwrap_or_else(|| env::panic_str("no commit from this seller"));
        require!(bid.revealed_price.is_none(), "already revealed");
        require!(
            bid_hash(round_id, &seller, unit_price.0, &salt) == bid.hash,
            "hash mismatch"
        );
        bid.revealed_price = Some(unit_price);
        bid.valid = unit_price.0 >= 1 && unit_price.0 <= ceiling;
        let valid = bid.valid;
        event(
            "bid_revealed",
            json!({"round_id": round_id, "seller_id": seller, "unit_price": unit_price, "valid": valid}),
        );
        self.rounds.replace(round_id as u32, r);
    }

    /// §5.5: anyone, once.
    pub fn settle(&mut self, round_id: u64) -> RoundState {
        let now = env::block_timestamp();
        let mut r = self.round_ref(round_id).clone();
        require!(
            r.phase_at(now) == Phase::ReadyToSettle,
            "round is not ready to settle"
        );

        let forfeited = self.forfeit_unrevealed_bonds(&mut r);
        let winner = lowest_valid_bid(&r);
        let failed = r.total_qty < r.min_total_qty || winner.is_none();
        self.return_revealed_bonds(&mut r, winner, failed);

        match winner {
            Some(w) if !failed => self.settle_with_winner(&mut r, w, forfeited),
            _ => self.fail_round(&mut r, forfeited),
        }

        if forfeited > 0 {
            self.distribute_pro_rata(&r, forfeited);
        }
        let state = r.state;
        self.rounds.replace(round_id as u32, r);
        state
    }
}

/// Lowest valid price wins; ties go to the earlier commit (vector order).
fn lowest_valid_bid(r: &Round) -> Option<usize> {
    r.bids
        .iter()
        .enumerate()
        .filter(|(_, b)| b.valid)
        .min_by(|(ia, a), (ib, b)| {
            a.revealed_price
                .unwrap()
                .0
                .cmp(&b.revealed_price.unwrap().0)
                .then(ia.cmp(ib))
        })
        .map(|(i, _)| i)
}

impl Market {
    /// Bonds of sellers that never revealed are forfeited to buyers.
    /// Returns the total forfeited (distributed by the caller).
    fn forfeit_unrevealed_bonds(&mut self, r: &mut Round) -> u128 {
        let mut forfeited: u128 = 0;
        for b in r.bids.iter_mut().filter(|b| b.revealed_price.is_none()) {
            forfeited += b.bond_held.0;
            self.sub_held(&b.seller_id, b.bond_held.0);
            b.bond_held = U128(0);
        }
        forfeited
    }

    /// Revealed losing bonds (all revealed bonds, if the round failed) go back.
    fn return_revealed_bonds(&mut self, r: &mut Round, winner: Option<usize>, failed: bool) {
        for (i, b) in r.bids.iter_mut().enumerate() {
            if b.revealed_price.is_some() && (failed || Some(i) != winner) && b.bond_held.0 > 0 {
                let amt = b.bond_held.0;
                b.bond_held = U128(0);
                self.sub_held(&b.seller_id, amt);
                self.credit(&b.seller_id, amt);
            }
        }
    }

    /// Failed round: every buyer gets its full lock back.
    fn fail_round(&mut self, r: &mut Round, forfeited: u128) {
        for p in r.participants.iter_mut() {
            let amt = p.held.0;
            p.held = U128(0);
            self.sub_held(&p.account_id, amt);
            self.credit(&p.account_id, amt);
            self.unspend(&p.account_id, p.week, amt);
        }
        r.state = RoundState::Failed;
        event(
            "round_failed",
            json!({"round_id": r.id, "total_qty": r.total_qty, "forfeited_bonds": U128(forfeited)}),
        );
    }

    /// Winner found: buyers get (ceiling - clearing) x qty back; the rest
    /// stays escrowed until delivery.
    fn settle_with_winner(&mut self, r: &mut Round, w: usize, forfeited: u128) {
        let clearing = r.bids[w].revealed_price.unwrap().0;
        let diff = r.ceiling_price.0 - clearing;
        for p in r.participants.iter_mut() {
            let refund = diff * p.qty as u128;
            p.held = U128(p.held.0 - refund);
            self.sub_held(&p.account_id, refund);
            self.credit(&p.account_id, refund);
            self.unspend(&p.account_id, p.week, refund);
        }
        r.winner = Some(w as u32);
        r.clearing_price = Some(U128(clearing));
        r.state = RoundState::Settled;
        let saving = (r.ref_price.0 - clearing) * r.total_qty as u128;
        event(
            "round_settled",
            json!({"round_id": r.id, "winner": r.bids[w].seller_id, "clearing_price": U128(clearing),
                   "total_qty": r.total_qty, "saving_vs_ref": U128(saving), "forfeited_bonds": U128(forfeited)}),
        );
    }
}
