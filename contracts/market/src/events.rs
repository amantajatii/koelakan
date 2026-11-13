//! NEP-297 style event logs. Names and payloads are consumed by agents and
//! the dashboard, so they are part of the public interface.

use near_sdk::env;
use near_sdk::serde_json::{json, Value};

/// Logs `EVENT_JSON:{"standard":"koelakan",...}` with a single data entry.
pub(crate) fn event(name: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({"standard": "koelakan", "version": "1.0.0", "event": name, "data": [data]})
    ));
}
