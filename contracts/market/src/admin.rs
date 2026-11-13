//! Admin-only configuration (1 yocto, admin account).

use near_sdk::serde_json::json;
use near_sdk::{assert_one_yocto, env, near, require, AccountId};

use crate::constants::MAX_ITEM_ID_LEN;
use crate::events::event;
use crate::types::Item;
use crate::{Market, MarketExt};

#[near]
impl Market {
    #[payable]
    pub fn set_item(&mut self, item: Item) {
        assert_one_yocto();
        require!(env::predecessor_account_id() == self.admin, "admin only");
        require!(item.ref_price.0 >= 1, "ref_price must be >= 1");
        require!(
            !item.id.is_empty() && item.id.len() <= MAX_ITEM_ID_LEN,
            "bad item id"
        );
        event(
            "item_set",
            json!({"id": item.id, "ref_price": item.ref_price, "as_of": item.as_of}),
        );
        self.items.insert(item.id.clone(), item);
    }

    #[payable]
    pub fn set_arbiter(&mut self, arbiter: AccountId) {
        assert_one_yocto();
        require!(env::predecessor_account_id() == self.admin, "admin only");
        self.arbiter = arbiter;
    }
}
