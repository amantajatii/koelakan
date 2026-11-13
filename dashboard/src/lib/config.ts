/** Deployment configuration. Every value can be overridden with NEXT_PUBLIC_* env vars. */

const DEFAULT_AGENT_API = "https://agent.43-157-202-28.sslip.io";

function env(value: string | undefined, fallback: string): string {
  const v = value?.trim();
  return v ? v : fallback;
}

/** Accept only http(s) URLs (trailing slashes removed); anything else falls back with a console hint. */
export function validUrl(value: string, fallback: string): string {
  try {
    const u = new URL(value);
    if (u.protocol === "http:" || u.protocol === "https:") return value.replace(/\/+$/, "");
  } catch {
    // fall through
  }
  return fallback;
}

const NEAR_ACCOUNT = /^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]$/;

/** Account ids must look like NEAR accounts; a typo in an env var should not silently point elsewhere. */
export function validAccount(value: string, fallback: string): string {
  return NEAR_ACCOUNT.test(value) ? value : fallback;
}

const root = validAccount(env(process.env.NEXT_PUBLIC_ROOT_ACCOUNT, "koelakan.testnet"), "koelakan.testnet");

export const config = {
  network: env(process.env.NEXT_PUBLIC_NETWORK, "testnet") === "mainnet" ? "mainnet" : "testnet",
  rpcUrl: validUrl(env(process.env.NEXT_PUBLIC_RPC_URL, ""), "https://rpc.testnet.fastnear.com"),
  rpcFallbackUrl: validUrl(env(process.env.NEXT_PUBLIC_RPC_FALLBACK_URL, ""), "https://rpc.testnet.near.org"),
  marketId: validAccount(env(process.env.NEXT_PUBLIC_MARKET_ID, ""), `market.${root}`),
  tidrId: validAccount(env(process.env.NEXT_PUBLIC_TIDR_ID, ""), `tidr.${root}`),
  rootAccount: root,
  explorerUrl: validUrl(env(process.env.NEXT_PUBLIC_EXPLORER_URL, ""), "https://testnet.nearblocks.io"),
  agentApiUrl: validUrl(env(process.env.NEXT_PUBLIC_AGENT_API_URL, ""), DEFAULT_AGENT_API),
  siteUrl: validUrl(env(process.env.NEXT_PUBLIC_SITE_URL, ""), "http://localhost:3000"),
  /**
   * Development only: pretend this account is signed in so the owner screens can be reviewed without a wallet.
   * Unset in production; it only changes what the UI shows, every transaction still needs a real wallet.
   */
  devFixtureAccount: validAccount(env(process.env.NEXT_PUBLIC_DEV_FIXTURE_ACCOUNT, ""), "") || null,
} as const;

export const accountUrl = (account: string): string => `${config.explorerUrl}/address/${account}`;
export const txUrl = (hash: string): string => `${config.explorerUrl}/txns/${hash}`;

/** Gas allowance of the restricted key is set by the wallet; these are per-call gas limits. */
export const GAS = {
  light: "30000000000000",
  ftTransferCall: "60000000000000",
} as const;

export const ONE_YOCTO = "1";

/** NEP-413 recipient the agent service expects. */
export const AGENT_RECIPIENT = "koelakan-agent";

/** 0.25 NEAR, the gas allowance of the key delegated to the agent service. */
export const DELEGATION_ALLOWANCE_YOCTO = "250000000000000000000000";

export const REPO_URL = "https://github.com/amantajatii/koelakan";
export const AGENTS_README_URL = `${REPO_URL}/blob/main/agents/README.md`;

/** Demo durations (seconds) for "Open round". Each must be 30 s .. 30 days on-chain. */
export const DEMO_DURATIONS = { join: 120, commit: 60, reveal: 60, delivery: 120 } as const;
