import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import type { AccountSnapshot } from "@/hooks/use-judge";
import { int, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import type { Item } from "@/lib/types";

export function AccountSummary({ accountId, account, items, loading }: { accountId: string | null; account: AccountSnapshot | null; items: Item[]; loading: boolean }) {
  return (
    <Panel aria-labelledby="account-summary">
      <h2 id="account-summary" className="font-display text-xl font-semibold">Your account in the market</h2>
      {!accountId ? (
        <p className="mt-2 text-sm text-ink-soft">Sign in to see your balance and policy.</p>
      ) : !account ? (
        loading ? <Skeleton className="mt-3 h-24" /> : <p className="mt-2 text-sm text-ink-soft">Account data has not loaded yet.</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="tIDR in wallet" value={rupiah(account.tidr)} />
          <Row label="Available balance" value={rupiah(account.balance.available)} strong />
          <Row label="Locked in rounds" value={rupiah(account.balance.held)} />
          <Row label="Spent this week" value={rupiah(account.spent)} />
          <div className="border-t-2 border-dashed border-rule pt-2">
            <dt className="font-semibold">Policy</dt>
            {account.policy ? (
              <dd className="mt-1 space-y-1">
                <p className="num">Budget {rupiah(account.policy.weekly_budget)}/week</p>
                <p>auto_join: <strong>{account.policy.auto_join ? "yes" : "no"}</strong></p>
                <ul className="num text-xs text-ink-soft">
                  {Object.entries(account.policy.max_price).map(([id, v]) => {
                    const item = items.find((i) => i.id === id);
                    return <li key={id}>{itemLabel(item, id)}: max {rupiah(v)}/{item?.unit ?? "unit"}</li>;
                  })}
                </ul>
                <p className="text-xs text-ink-soft">{int(Object.keys(account.policy.max_price).length)} items allowed</p>
              </dd>
            ) : (
              <dd className="mt-1 text-ink-soft">Not set yet.</dd>
            )}
          </div>
        </dl>
      )}
    </Panel>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-rule pb-1">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`num ${strong ? "text-lg font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
