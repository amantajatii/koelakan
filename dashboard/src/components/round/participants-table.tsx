import { Stamp } from "@/components/ui/stamp";
import { accountUrl } from "@/lib/config";
import { int, ownerName, rupiah, shortAccount } from "@/lib/format";
import { deliveryLabel } from "@/lib/labels";
import { isSettled } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

export function ParticipantsTable({ round, unit }: { round: RoundView; unit: string }) {
  const settled = isSettled(round);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Participating warungs in round #{round.id}</caption>
        <thead>
          <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
            <th scope="col" className="py-2 pr-3 font-semibold">Warung</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Quantity ({unit})</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Locked</th>
            {settled && <th scope="col" className="py-2 pr-3 text-right font-semibold">Paid</th>}
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Still held</th>
            {settled && <th scope="col" className="py-2 font-semibold">Delivery</th>}
          </tr>
        </thead>
        <tbody>
          {[...round.participants].sort((a, b) => a.account_id.localeCompare(b.account_id)).map((p) => {
            const locked = BigInt(round.ceiling_price) * BigInt(p.qty);
            const paid = round.clearing_price === null ? 0n : BigInt(round.clearing_price) * BigInt(p.qty);
            const d = deliveryLabel(p.delivery);
            return (
              <tr key={p.account_id} className="border-b border-dashed border-rule">
                <th scope="row" className="py-2 pr-3 font-normal">
                  <a href={accountUrl(p.account_id)} target="_blank" rel="noreferrer" className="num underline decoration-rule underline-offset-4 hover:text-chili">
                    {shortAccount(p.account_id)}
                  </a>
                  <span className="block text-xs text-ink-soft">{ownerName(p.account_id)}</span>
                </th>
                <td className="num py-2 pr-3 text-right">{int(p.qty)}</td>
                <td className="num py-2 pr-3 text-right">{rupiah(locked)}</td>
                {settled && <td className="num py-2 pr-3 text-right">{rupiah(paid)}</td>}
                <td className="num py-2 pr-3 text-right text-ink-soft">{rupiah(p.held)}</td>
                {settled && <td className="py-2"><Stamp tone={d.tone}>{d.text}</Stamp></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
