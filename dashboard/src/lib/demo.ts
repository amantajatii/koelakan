/** Seeded warung accounts that are delegated to the live agent service and can be shown read-only. */
const DEMO_ACCOUNT = /^warung-\d{2}\.koelakan\.testnet$/;

export const DEFAULT_DEMO_ACCOUNT = "warung-20.koelakan.testnet";

/** Valid `?demo=` value or null. Anything else (other accounts, paths, empty) is ignored, never trusted. */
export function parseDemoParam(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  return DEMO_ACCOUNT.test(v) ? v : null;
}

/** `/warung?demo=...` link used by the "See a warung in action" actions. */
export const demoHref = (account: string = DEFAULT_DEMO_ACCOUNT): string => `/warung?demo=${encodeURIComponent(account)}`;
