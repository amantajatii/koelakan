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
        Jaminan hangus <span className="num">{rupiah(total)}</span> dari {names}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Tidak membuka tawaran di fase buka, jadi jaminannya dibagi ke {int(round.participants.length)} warung sesuai jumlah
        pesanan. Sisa pembulatan masuk ke pembeli dengan jumlah terbesar.
      </p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold underline underline-offset-4">Lihat pembagian per warung</summary>
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
