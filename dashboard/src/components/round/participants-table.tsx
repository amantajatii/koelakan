import { Chip } from "@/components/ui/chip";
import { linkClass } from "@/components/ui/panel";
import { TableWrap, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import { accountUrl } from "@/lib/config";
import { int, ownerName, rupiah, shortAccount } from "@/lib/format";
import { deliveryLabel } from "@/lib/labels";
import { isSettled } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

export function ParticipantsTable({ round, unit }: { round: RoundView; unit: string }) {
  const settled = isSettled(round);
  return (
    <TableWrap>
      <table className={`${tableClass} min-w-[36rem]`}>
        <caption className="sr-only">Participating warungs in round #{round.id}</caption>
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={th}>Warung</th>
            <th scope="col" className={thRight}>Quantity ({unit})</th>
            <th scope="col" className={thRight}>Locked</th>
            {settled && <th scope="col" className={thRight}>Paid</th>}
            <th scope="col" className={thRight}>Still held</th>
            {settled && <th scope="col" className={th}>Delivery</th>}
          </tr>
        </thead>
        <tbody>
          {[...round.participants].sort((a, b) => a.account_id.localeCompare(b.account_id)).map((p) => {
            const locked = BigInt(round.ceiling_price) * BigInt(p.qty);
            const paid = round.clearing_price === null ? 0n : BigInt(round.clearing_price) * BigInt(p.qty);
            const d = deliveryLabel(p.delivery);
            return (
              <tr key={p.account_id} className={trClass}>
                <th scope="row" className={`${td} font-normal`}>
                  <a href={accountUrl(p.account_id)} target="_blank" rel="noreferrer" className={`num ${linkClass}`}>{shortAccount(p.account_id)}</a>
                  <span className="block text-xs text-muted">{ownerName(p.account_id)}</span>
                </th>
                <td className={tdRight}>{int(p.qty)}</td>
                <td className={tdRight}>{rupiah(locked)}</td>
                {settled && <td className={tdRight}>{rupiah(paid)}</td>}
                <td className={`${tdRight} text-muted`}>{rupiah(p.held)}</td>
                {settled && <td className={`${td} pl-4`}><Chip tone={d.tone}>{d.text}</Chip></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
