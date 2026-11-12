import { Stamp } from "@/components/ui/stamp";
import { accountUrl } from "@/lib/config";
import { rupiah, shortAccount, shortHash } from "@/lib/format";
import { BID_LABEL, bidStatus } from "@/lib/labels";
import type { RoundView } from "@/lib/types";

export function BidsTable({ round }: { round: RoundView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Tawaran grosir ronde #{round.id}</caption>
        <thead>
          <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
            <th scope="col" className="py-2 pr-3 font-semibold">Grosir</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Harga</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Jaminan</th>
            <th scope="col" className="py-2 font-semibold">Hash komitmen</th>
          </tr>
        </thead>
        <tbody>
          {round.bids.map((b, i) => {
            const st = BID_LABEL[bidStatus(round, b, i)];
            return (
              <tr key={b.seller_id} className="border-b border-dashed border-rule">
                <th scope="row" className="py-2 pr-3 font-normal">
                  <a href={accountUrl(b.seller_id)} target="_blank" rel="noreferrer" className="num underline decoration-rule underline-offset-4 hover:text-chili">
                    {shortAccount(b.seller_id)}
                  </a>
                </th>
                <td className="py-2 pr-3"><Stamp tone={st.tone}>{st.text}</Stamp></td>
                <td className="num py-2 pr-3 text-right">{b.revealed_price === null ? "tersegel" : rupiah(b.revealed_price)}</td>
                <td className="num py-2 pr-3 text-right">{rupiah(b.bond)}</td>
                <td className="num py-2 text-xs text-ink-soft" title={b.hash}>{shortHash(b.hash)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
