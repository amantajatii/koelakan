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
          <div className="rounded-2xl bg-ground p-4">
            <dt className="text-xs font-medium text-muted">In Koelakan, ready to spend</dt>
            <dd className="num mt-1 text-3xl font-bold tracking-tight">{rupiah(account.balance.available)}</dd>
          </div>
          <WithdrawRow available={BigInt(account.balance.available)} onDone={onDone} readOnly={readOnly} />
          <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2">
            <Stat label="In your wallet (not yet in Koelakan)" value={rupiah(account.tidr)} />
            <Stat label="Held in open rounds" value={rupiah(account.balance.held)} />
            <Stat label="Spent this week" value={rupiah(account.spent)} />
          </div>
          <div className="border-t border-line pt-3">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ground p-3.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="num mt-1 text-lg font-bold tracking-tight">{value}</dd>
    </div>
  );
}
