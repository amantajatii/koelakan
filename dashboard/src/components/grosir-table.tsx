"use client";

import { OfflineNote } from "@/components/offline-note";
import { Chip } from "@/components/ui/chip";
import { linkClass } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import { Facts, TableWrap, stackedList, stackedRow, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { accountUrl } from "@/lib/config";
import { rupiah, shortAccount } from "@/lib/format";
import { formatNear } from "@/lib/status-format";

export function GrosirTable() {
  const { status, loading } = useAgentStatus();
  if (loading) return <Skeleton className="h-40" />;
  if (!status) return <OfflineNote />;
  const rows = status.agents.grosir;
  if (rows.length === 0) return <p className="text-sm text-muted">The service is not running any grosir agents right now.</p>;
  return (
    <>
    <ul className={stackedList}>
      {rows.map((g) => (
        <li key={g.account_id} className={stackedRow}>
          <p className="flex flex-wrap items-center justify-between gap-2">
            <a href={accountUrl(g.account_id)} target="_blank" rel="noreferrer" className={`num ${linkClass}`}>{shortAccount(g.account_id)}</a>
            {g.paused ? <Chip tone="warn">Paused</Chip> : <Chip tone="good">Bidding</Chip>}
          </p>
          <Facts items={[["NEAR (gas)", formatNear(g.near)], ["Held in market (bonds + sales)", rupiah(g.market_available)], ["tIDR in wallet", rupiah(g.tidr_wallet)]]} />
        </li>
      ))}
    </ul>
    <TableWrap className="hidden sm:block">
      <table className={tableClass}>
        <caption className="sr-only">Grosir agents run by the Koelakan service</caption>
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={th}>Grosir</th>
            <th scope="col" className={thRight}>NEAR (gas)</th>
            <th scope="col" className={thRight}>tIDR in wallet (bonds)</th>
            <th scope="col" className={thRight}>Held in market (bonds + sales)</th>
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
    </>
  );
}
