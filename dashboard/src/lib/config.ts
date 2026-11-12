/** Deployment configuration. Every value can be overridden with NEXT_PUBLIC_* env vars. */

const root = process.env.NEXT_PUBLIC_ROOT_ACCOUNT ?? "koelakan.testnet";

export const config = {
  network: process.env.NEXT_PUBLIC_NETWORK ?? "testnet",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.testnet.fastnear.com",
  rpcFallbackUrl: process.env.NEXT_PUBLIC_RPC_FALLBACK_URL ?? "https://rpc.testnet.near.org",
  marketId: process.env.NEXT_PUBLIC_MARKET_ID ?? `market.${root}`,
  tidrId: process.env.NEXT_PUBLIC_TIDR_ID ?? `tidr.${root}`,
  rootAccount: root,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet.nearblocks.io",
} as const;

export const accountUrl = (account: string): string => `${config.explorerUrl}/address/${account}`;
export const txUrl = (hash: string): string => `${config.explorerUrl}/txns/${hash}`;

/** Gas allowance of the restricted key is set by the wallet; these are per-call gas limits. */
export const GAS = {
  light: "30000000000000",
  ftTransferCall: "60000000000000",
} as const;

export const ONE_YOCTO = "1";

/** Demo durations (seconds) for "Open round". Each must be 30 s .. 30 days on-chain. */
export const DEMO_DURATIONS = { join: 120, commit: 60, reveal: 60, delivery: 120 } as const;
