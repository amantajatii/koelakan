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
    <div className="rounded-lg border-2 border-chili bg-chili-soft/50 p-4">
      <p className="font-semibold">
        Bond forfeited: <span className="num">{rupiah(total)}</span> from {names}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Did not reveal a bid in the reveal phase, so the bond is split among the {int(round.participants.length)} warungs in
        proportion to their quantity. Rounding dust goes to the buyer with the largest quantity.
      </p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold underline underline-offset-4">See the split per warung</summary>
        <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {round.participants.map((p, i) => (
            <li key={p.account_id} className="flex justify-between border-b border-dashed border-rule py-0.5">
              <span>{shortAccount(p.account_id)} <span className="text-ink-soft">({ownerName(p.account_id)})</span></span>
              <span className="num">{rupiah(shares[i] ?? 0n)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
