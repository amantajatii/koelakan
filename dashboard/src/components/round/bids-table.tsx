import { Chip } from "@/components/ui/chip";
import { TableWrap, tableClass, td, tdRight, th, thRight, theadClass, trClass } from "@/components/ui/table";
import { accountUrl } from "@/lib/config";
import { rupiah, shortAccount, shortHash } from "@/lib/format";
import { BID_LABEL, bidStatus } from "@/lib/labels";
import { linkClass } from "@/components/ui/panel";
import type { RoundView } from "@/lib/types";

export function BidsTable({ round }: { round: RoundView }) {
  return (
    <TableWrap>
      <table className={`${tableClass} min-w-[36rem]`}>
        <caption className="sr-only">Grosir bids for round #{round.id}</caption>
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={th}>Grosir</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={thRight}>Price</th>
            <th scope="col" className={thRight}>Bond</th>
            <th scope="col" className={th}>Commit hash</th>
          </tr>
        </thead>
        <tbody>
          {round.bids.map((b, i) => {
            const st = BID_LABEL[bidStatus(round, b, i)];
            return (
              <tr key={b.seller_id} className={trClass}>
                <th scope="row" className={`${td} font-normal`}>
                  <a href={accountUrl(b.seller_id)} target="_blank" rel="noreferrer" className={`num ${linkClass}`}>{shortAccount(b.seller_id)}</a>
                </th>
                <td className={td}><Chip tone={st.tone}>{st.text}</Chip></td>
                <td className={tdRight}>{b.revealed_price === null ? "sealed" : rupiah(b.revealed_price)}</td>
                <td className={tdRight}>{rupiah(b.bond)}</td>
                <td className={`${td} num text-xs text-muted`} title={b.hash}>{shortHash(b.hash)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableWrap>
  );
}
