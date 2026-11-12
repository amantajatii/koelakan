"use client";

import { OfflineNote } from "@/components/offline-note";
import { Chip } from "@/components/ui/chip";
import { linkClass } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { TableWrap, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { accountUrl } from "@/lib/config";
import { rupiah, shortAccount } from "@/lib/format";
import { formatNear } from "@/lib/status-format";

export function GrosirTable() {
  const { status, loading } = useAgentStatus();
  if (loading) return <Skeleton className="h-40" />;
  if (!status) return <OfflineNote />;
  const rows = status.agents.grosir;
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted">The service is not running any grosir agents right now.</p>;
  return (
    <TableWrap>
      <table className={`${tableClass} min-w-[36rem]`}>
        <caption className="sr-only">Grosir agents run by the Koelakan service</caption>
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={th}>Grosir</th>
            <th scope="col" className={thRight}>NEAR (gas)</th>
            <th scope="col" className={thRight}>tIDR in wallet (bonds)</th>
            <th scope="col" className={thRight}>Earnings in market</th>
            <th scope="col" className={`${th} pl-4`}>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.account_id} className={trClass}>
              <th scope="row" className={`${td} font-normal`}>
                <a href={accountUrl(g.account_id)} target="_blank" rel="noreferrer" className={`num ${linkClass}`}>{shortAccount(g.account_id)}</a>
              </th>
              <td className={tdRight}>{formatNear(g.near)}</td>
              <td className={tdRight}>{rupiah(g.tidr_wallet)}</td>
              <td className={tdRight}>{rupiah(g.market_available)}</td>
              <td className={`${td} pl-4`}>{g.paused ? <Chip tone="warn">Paused</Chip> : <Chip tone="good">Bidding</Chip>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
