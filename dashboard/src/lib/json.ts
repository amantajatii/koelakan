/** u64 fields that hold nanosecond timestamps. They overflow Number, so we keep them as strings. */
const NS_FIELDS = [
  "opened_at",
  "join_deadline",
  "commit_deadline",
  "reveal_deadline",
  "delivery_deadline",
  "arbiter_deadline",
];
const NS_PATTERN = new RegExp(`"(${NS_FIELDS.join("|")})"\\s*:\\s*(\\d+)`, "g");

/** Parse contract JSON without losing precision on nanosecond timestamps. */
export function parseChainJson<T>(raw: string): T {
  return JSON.parse(raw.replace(NS_PATTERN, '"$1":"$2"')) as T;
}

/** Nanosecond timestamp (string or bigint) to epoch milliseconds. */
export function nsToMs(ns: string | bigint): number {
  return Number(BigInt(ns) / 1_000_000n);
}
