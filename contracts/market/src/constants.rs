//! Protocol limits and unit constants (§1 to §6).

use near_sdk::Gas;

pub const MAX_PARTICIPANTS: usize = 50;
pub const MAX_BIDS: usize = 10;
pub const MIN_PHASE_SECS: u64 = 30;
pub const MAX_PHASE_SECS: u64 = 30 * 24 * 3_600;
/// Nanoseconds per second (NEAR block timestamps are in ns).
pub const NS: u64 = 1_000_000_000;
pub const WEEK_NS: u64 = 7 * 24 * 3_600 * NS;
/// Seller bond: 5% of ceiling x total qty, in basis points.
pub const BOND_BPS: u128 = 500;

pub(crate) const BPS_DENOMINATOR: u128 = 10_000;
pub(crate) const MAX_ITEM_ID_LEN: usize = 32;
/// Length of a sha256 digest in lowercase hex.
pub(crate) const BID_HASH_HEX_LEN: usize = 64;
/// Default and maximum page size of `list_rounds`.
pub(crate) const DEFAULT_LIST_LIMIT: u64 = 20;
pub(crate) const MAX_LIST_LIMIT: u64 = 50;
/// Upper bound on the promise result size read in `on_withdraw`.
pub(crate) const MAX_PROMISE_RESULT_LEN: usize = 64;

pub(crate) const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
pub(crate) const GAS_CALLBACK: Gas = Gas::from_tgas(10);
