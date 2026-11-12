import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import type { AccountSnapshot } from "@/hooks/use-judge";
import { int, rupiah } from "@/lib/format";
import type { Item } from "@/lib/types";

export function AccountSummary({ accountId, account, items, loading }: { accountId: string | null; account: AccountSnapshot | null; items: Item[]; loading: boolean }) {
  return (
    <Panel aria-labelledby="ringkasan-akun">
      <h2 id="ringkasan-akun" className="font-display text-xl font-semibold">Akun Anda di market</h2>
      {!accountId ? (
        <p className="mt-2 text-sm text-ink-soft">Masuk dulu untuk melihat saldo dan kebijakan.</p>
      ) : !account ? (
        loading ? <Skeleton className="mt-3 h-24" /> : <p className="mt-2 text-sm text-ink-soft">Data akun belum termuat.</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="tIDR di dompet" value={rupiah(account.tidr)} />
          <Row label="Saldo tersedia" value={rupiah(account.balance.available)} strong />
          <Row label="Terkunci di ronde" value={rupiah(account.balance.held)} />
          <Row label="Terpakai minggu ini" value={rupiah(account.spent)} />
          <div className="border-t-2 border-dashed border-rule pt-2">
            <dt className="font-semibold">Kebijakan</dt>
            {account.policy ? (
              <dd className="mt-1 space-y-1">
                <p className="num">Anggaran {rupiah(account.policy.weekly_budget)}/minggu</p>
                <p>auto_join: <strong>{account.policy.auto_join ? "ya" : "tidak"}</strong></p>
                <ul className="num text-xs text-ink-soft">
                  {Object.entries(account.policy.max_price).map(([id, v]) => {
                    const item = items.find((i) => i.id === id);
                    return <li key={id}>{item?.name ?? id}: maks {rupiah(v)}/{item?.unit ?? "unit"}</li>;
                  })}
                </ul>
                <p className="text-xs text-ink-soft">{int(Object.keys(account.policy.max_price).length)} barang diizinkan</p>
              </dd>
            ) : (
              <dd className="mt-1 text-ink-soft">Belum diatur.</dd>
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
