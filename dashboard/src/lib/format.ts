const TZ = "Asia/Jakarta";

/** Rupiah with comma thousands separators (en-US grouping) and no decimals, e.g. `Rp16,650`. */
export function rupiah(value: bigint | number | string): string {
  const n = BigInt(value);
  const digits = (n < 0n ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0n ? "-" : ""}Rp${digits}`;
}

/** Plain integer with en-US grouping, e.g. `1,422,526`. */
export function int(value: bigint | number | string): string {
  return BigInt(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Percentage with one decimal, e.g. `28.4%`. */
export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** e.g. `12 Nov, 15:23 WIB`. */
export const formatDateTime = (ms: number): string => `${dateTimeFmt.format(ms)} WIB`;
export const formatClock = (ms: number): string => timeFmt.format(ms);
export const formatDay = (ms: number): string => dayFmt.format(ms);

/** Jakarta calendar day key (YYYY-MM-DD) for grouping chat messages. */
export function dayKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(ms);
}

/** Countdown text: `02:05`, `1:02:05` or `2d 3h`. Negative values read as zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (v: number): string => String(v).padStart(2, "0");
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

/** `warung-01.koelakan.testnet` -> `warung-01`. */
export const shortAccount = (account: string): string => account.split(".")[0] ?? account;

/** Short hex for hashes, e.g. `5d8e9d...cb804`. */
export const shortHash = (hash: string): string =>
  hash.length > 14 ? `${hash.slice(0, 6)}...${hash.slice(-5)}` : hash;

const OWNER_NAMES: readonly string[] = [
  "Pak Budi", "Bu Siti", "Pak Agus", "Bu Wati", "Pak Joko", "Bu Rina", "Pak Dedi", "Bu Yanti", "Pak Eko", "Bu Lastri",
  "Pak Hendra", "Bu Tini", "Pak Slamet", "Bu Dewi", "Pak Rudi", "Bu Ani", "Pak Wahyu", "Bu Endang", "Pak Teguh", "Bu Sri",
];

/** Fictional owner name for the simulated `warung-NN` accounts; other accounts read as "Owner". */
export function ownerName(account: string): string {
  const match = /^warung-(\d+)/.exec(account);
  if (!match) return "Owner";
  const n = Number(match[1]);
  return OWNER_NAMES[(n - 1 + OWNER_NAMES.length) % OWNER_NAMES.length] ?? "Pak/Bu";
}
