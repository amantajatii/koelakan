import { Info } from "lucide-react";
import { int, ownerName, rupiah, shortAccount } from "@/lib/format";
import { forfeitedBids, forfeitedBond, proRataShares } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

/** Bond of sellers that never revealed, split among buyers pro rata to quantity (RULES §5.5). */
export function ForfeitBox({ round }: { round: RoundView }) {
  const total = forfeitedBond(round);
  if (total === 0n) return null;
  const shares = proRataShares(total, round.participants.map((p) => BigInt(p.qty)));
  const names = forfeitedBids(round).map((b) => shortAccount(b.seller_id)).join(", ");
  return (
    <aside aria-label="Forfeited bond" className="rounded-card bg-info-soft p-5 sm:p-6">
      <div className="flex gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            Bond forfeited: <span className="num">{rupiah(total)}</span> from {names}
          </p>
          <p className="mt-1 text-sm text-ink/80">
            Did not reveal a bid in the reveal phase, so the bond is split among the {int(round.participants.length)} warungs in
            proportion to their quantity. Rounding dust goes to the buyer with the largest quantity.
          </p>
          <details className="mt-3 text-sm">
            <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-info underline underline-offset-4">See the split per warung</summary>
            <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
              {round.participants.map((p, i) => (
                <li key={p.account_id} className="flex justify-between gap-3 border-b border-info/15 py-1.5">
                  <span>{shortAccount(p.account_id)} <span className="text-muted">({ownerName(p.account_id)})</span></span>
                  <span className="num font-semibold">{rupiah(shares[i] ?? 0n)}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </aside>
  );
}
