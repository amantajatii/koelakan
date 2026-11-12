import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { WithdrawRow } from "@/components/warung/withdraw-panel";
import type { AccountSnapshot } from "@/hooks/use-judge";
import { rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import type { Item } from "@/lib/types";

interface Props {
  accountId: string | null;
  account: AccountSnapshot | null;
  items: Item[];
  loading: boolean;
  onDone: () => void;
  readOnly?: boolean;
}

export function AccountSummary({ accountId, account, items, loading, onDone, readOnly = false }: Props) {
  return (
    <Panel aria-labelledby="account-summary">
      <h2 id="account-summary" className="text-lg font-bold tracking-tight">Your money</h2>
      {!accountId ? (
        <p className="mt-2 text-sm text-muted">Sign in to see your balance and limits.</p>
      ) : !account ? (
        loading ? <Skeleton className="mt-3 h-28" /> : <p className="mt-2 text-sm text-muted">Account data has not loaded yet.</p>
      ) : (
        <dl className="mt-3 text-sm">
          <Row label="In Koelakan, ready to spend" value={rupiah(account.balance.available)} strong />
          <WithdrawRow available={BigInt(account.balance.available)} onDone={onDone} readOnly={readOnly} />
          <Row label="In your wallet (not yet in Koelakan)" value={rupiah(account.tidr)} />
          <Row label="Held in open rounds" value={rupiah(account.balance.held)} />
          <Row label="Spent this week" value={rupiah(account.spent)} />
          <div className="pt-3">
            <dt className="font-semibold">Your limits</dt>
            {account.policy ? (
              <dd className="mt-1 space-y-1">
                <p>Agent shopping: <strong>{account.policy.auto_join ? "on" : "off"}</strong></p>
                <ul className="num text-xs text-muted">
                  {Object.entries(account.policy.max_price).map(([id, v]) => {
                    const item = items.find((i) => i.id === id);
                    return <li key={id}>{itemLabel(item, id)}: up to {rupiah(v)}/{item?.unit ?? "unit"}</li>;
                  })}
                </ul>
              </dd>
            ) : (
              <dd className="mt-1 text-muted">Not set yet. Set your limits in the setup steps.</dd>
            )}
          </div>
        </dl>
      )}
    </Panel>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`num ${strong ? "text-lg font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
