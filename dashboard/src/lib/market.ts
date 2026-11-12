import { cached, invalidate } from "./cache";
import { config } from "./config";
import { viewCall } from "./rpc";
import type { Balance, Item, MarketConfig, Policy, RoundView } from "./types";

const TTL = { items: 5 * 60_000, rounds: 8_000, account: 4_000 } as const;
const PAGE = 50;

const market = <T,>(method: string, args: unknown = {}): Promise<T> => viewCall<T>(config.marketId, method, args);

export const getItems = (): Promise<Item[]> =>
  cached("items", TTL.items, () => market<Item[]>("get_items"));

export const getConfig = (): Promise<MarketConfig> =>
  cached("config", TTL.rounds, () => market<MarketConfig>("get_config"));

/** All rounds, paged by the contract's 50-row cap. */
export async function listAllRounds(): Promise<RoundView[]> {
  return cached("rounds", TTL.rounds, async () => {
    const all: RoundView[] = [];
    for (let from = 0; ; from += PAGE) {
      const page = await market<RoundView[]>("list_rounds", { from, limit: PAGE });
      all.push(...page);
      if (page.length < PAGE) return all;
    }
  });
}

export const getRound = (id: number): Promise<RoundView | null> =>
  cached(`round:${id}`, TTL.rounds, () => market<RoundView | null>("get_round", { round_id: id }));

export const getBalance = (account: string): Promise<Balance> =>
  cached(`bal:${account}`, TTL.account, () => market<Balance>("get_balance", { account_id: account }));

export const getPolicy = (account: string): Promise<Policy | null> =>
  cached(`pol:${account}`, TTL.account, () => market<Policy | null>("get_policy", { account_id: account }));

export const getSpent = (account: string): Promise<string> =>
  cached(`spent:${account}`, TTL.account, () => market<string>("get_spent", { account_id: account }));

export const getTidrBalance = (account: string): Promise<string> =>
  cached(`tidr:${account}`, TTL.account, () =>
    viewCall<string>(config.tidrId, "ft_balance_of", { account_id: account }),
  );

/** Drop cached account reads after a transaction so the UI shows fresh numbers. */
export function invalidateAccount(account: string): void {
  for (const p of ["bal:", "pol:", "spent:", "tidr:"]) invalidate(p + account);
  invalidate("round");
  invalidate("config");
}
