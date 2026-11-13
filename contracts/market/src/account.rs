//! Owner-facing methods: policy (§3) and withdrawals (§2.5).

use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json};
use near_sdk::{assert_one_yocto, env, near, require, AccountId, NearToken, Promise};

use crate::constants::{GAS_CALLBACK, GAS_FT_TRANSFER, MAX_PROMISE_RESULT_LEN};
use crate::events::event;
use crate::types::Policy;
use crate::{Market, MarketExt};

#[near]
impl Market {
    /// §3: owner only (1 yocto: function-call keys cannot attach it).
    #[payable]
    pub fn set_policy(&mut self, policy: Policy) {
        assert_one_yocto();
        let owner = env::predecessor_account_id();
        event(
            "policy_set",
            json!({"account_id": owner, "weekly_budget": policy.weekly_budget, "auto_join": policy.auto_join}),
        );
        self.policies.insert(owner, policy);
    }

    /// §2.5: debit first, then transfer; a failed transfer is credited back.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) -> Promise {
        assert_one_yocto();
        let account = env::predecessor_account_id();
        require!(amount.0 > 0, "amount must be > 0");
        let bal = self.balance(&account);
        require!(bal >= amount.0, "insufficient available balance");
        self.balances.insert(account.clone(), bal - amount.0);
        self.token_held -= amount.0;
        event("withdraw", json!({"account_id": account, "amount": amount}));
        Promise::new(self.token.clone())
            .function_call(
                "ft_transfer".to_string(),
                serde_json::to_vec(&json!({"receiver_id": account, "amount": amount})).unwrap(),
                NearToken::from_yoctonear(1),
                GAS_FT_TRANSFER,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_withdraw(account, amount),
            )
    }

    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, amount: U128) -> bool {
        if env::promise_result_checked(0, MAX_PROMISE_RESULT_LEN).is_ok() {
            return true;
        }
        self.credit(&account_id, amount.0);
        self.token_held += amount.0;
        event(
            "withdraw_refunded",
            json!({"account_id": account_id, "amount": amount}),
        );
        false
    }
}
