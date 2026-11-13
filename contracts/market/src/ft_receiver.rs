//! NEP-141 receiver: tIDR deposits (§2.1) and sealed-bid commits (§5.3).

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, near, AccountId, PromiseOrValue};

use crate::constants::{BID_HASH_HEX_LEN, MAX_BIDS};
use crate::events::event;
use crate::internal::required_bond;
use crate::types::{Bid, Phase};
use crate::{Market, MarketExt};

#[near]
impl FungibleTokenReceiver for Market {
    /// §2.1 deposit (`msg = "deposit"`) and §5.3 seller commit
    /// (`msg = {"commit":{"round_id":N,"hash":"<hex>"}}`).
    /// Any rejected transfer returns the full amount.
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        if env::predecessor_account_id() != self.token {
            env::log_str("rejected: unsupported token");
            return PromiseOrValue::Value(amount);
        }
        if msg == "deposit" {
            self.credit(&sender_id, amount.0);
            self.token_held += amount.0;
            event(
                "deposit",
                json!({"account_id": sender_id, "amount": amount}),
            );
            return PromiseOrValue::Value(U128(0));
        }
        match self.try_commit(&sender_id, amount.0, &msg) {
            Ok(()) => {
                self.token_held += amount.0;
                PromiseOrValue::Value(U128(0))
            }
            Err(e) => {
                env::log_str(&format!("rejected: {}", e));
                PromiseOrValue::Value(amount)
            }
        }
    }
}

fn is_lower_hex(s: &str) -> bool {
    s.bytes()
        .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

impl Market {
    /// Records a sealed bid funded by `amount` (the bond). Errors are returned
    /// to the caller as a refund, never panicked.
    fn try_commit(&mut self, seller: &AccountId, amount: u128, msg: &str) -> Result<(), String> {
        let v: Value = serde_json::from_str(msg).map_err(|_| "unknown msg".to_string())?;
        let c = v.get("commit").ok_or("unknown msg")?;
        let round_id = c
            .get("round_id")
            .and_then(Value::as_u64)
            .ok_or("missing round_id")?;
        let hash = c
            .get("hash")
            .and_then(Value::as_str)
            .ok_or("missing hash")?
            .to_string();
        if hash.len() != BID_HASH_HEX_LEN || !is_lower_hex(&hash) {
            return Err("hash must be 64 lowercase hex chars".into());
        }
        let now = env::block_timestamp();
        let mut r = self
            .rounds
            .get(round_id as u32)
            .cloned()
            .ok_or("no such round")?;
        if r.phase_at(now) != Phase::Commit {
            return Err("round is not in commit phase".into());
        }
        if r.total_qty < r.min_total_qty {
            return Err("not enough demand".into());
        }
        if r.bids.len() >= MAX_BIDS {
            return Err("bid limit reached".into());
        }
        if r.bids.iter().any(|b| &b.seller_id == seller) {
            return Err("seller already committed".into());
        }
        let bond = required_bond(r.ceiling_price.0, r.total_qty);
        if amount != bond {
            return Err(format!("bond must be exactly {}", bond));
        }
        r.bids.push(Bid {
            seller_id: seller.clone(),
            hash,
            bond: U128(bond),
            bond_held: U128(bond),
            revealed_price: None,
            valid: false,
        });
        self.add_held(seller, bond);
        event(
            "bid_committed",
            json!({"round_id": round_id, "seller_id": seller, "bond": U128(bond)}),
        );
        self.rounds.replace(round_id as u32, r);
        Ok(())
    }
}
