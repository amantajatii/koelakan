"use client";

import { OfflineNote } from "@/components/offline-note";
import { Skeleton } from "@/components/ui/states";
import { Stamp } from "@/components/ui/stamp";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { accountUrl } from "@/lib/config";
import { rupiah, shortAccount } from "@/lib/format";
import { formatNear } from "@/lib/status-format";

export function GrosirTable() {
  const { status, loading } = useAgentStatus();
  if (loading) return <Skeleton className="h-40" />;
  if (!status) return <OfflineNote />;
  const rows = status.agents.grosir;
  if (rows.length === 0) return <p className="rounded-lg border-2 border-dashed border-rule p-4 text-sm text-ink-soft">The service is not running any grosir agents right now.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-ink/80 bg-cream">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Grosir agents run by the Koelakan service</caption>
        <thead>
          <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
            <th scope="col" className="px-4 py-2 font-semibold">Grosir</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">NEAR (gas)</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">tIDR in wallet (bonds)</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Earnings in market</th>
            <th scope="col" className="px-4 py-2 font-semibold">State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.account_id} className="border-b border-dashed border-rule last:border-0">
              <th scope="row" className="px-4 py-2 font-normal">
                <a href={accountUrl(g.account_id)} target="_blank" rel="noreferrer" className="num underline decoration-rule underline-offset-4 hover:text-chili">{shortAccount(g.account_id)}</a>
              </th>
              <td className="num px-4 py-2 text-right">{formatNear(g.near)}</td>
              <td className="num px-4 py-2 text-right">{rupiah(g.tidr_wallet)}</td>
              <td className="num px-4 py-2 text-right">{rupiah(g.market_available)}</td>
              <td className="px-4 py-2">{g.paused ? <Stamp tone="warn">Paused</Stamp> : <Stamp tone="good">Bidding</Stamp>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
