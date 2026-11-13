import { accountUrl } from "@/lib/config";
import { int, percent, rupiah, shortAccount } from "@/lib/format";
import { isSettled, savingOf, savingPercent, winnerBid } from "@/lib/stats";
import type { RoundView } from "@/lib/types";

const DARK_LINK = "num font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-brand";

/** Focal navy card: the winning price, its distance below PIHPS, and what the lot saved. */
export function ResultCard({ round, unit }: { round: RoundView; unit: string }) {
  const winner = winnerBid(round);
  const clearing = round.clearing_price;
  const settled = isSettled(round) && winner !== null && clearing !== null;
  return (
    <section aria-labelledby="result" className="on-dark rounded-card bg-night p-6 text-white sm:p-8">
      <h2 id="result" className="text-sm font-semibold text-night-muted">Auction result</h2>
      {settled ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <p className="text-sm text-night-muted">Winning price</p>
            <p className="num mt-1 flex flex-wrap items-baseline gap-x-1 text-5xl font-extrabold tracking-[-0.03em] sm:text-6xl">
              <span className="sr-only">Winning price </span>{rupiah(clearing)}<span className="text-lg font-semibold text-night-muted">/{unit}</span>
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="num inline-flex items-center whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-bold text-ink">{percent(savingPercent(round))} below PIHPS</span>
              <span className="num text-sm text-night-muted"><span className="line-through">{rupiah(round.ref_price)}</span> PIHPS price</span>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-night-raised p-5">
            <p className="text-sm text-night-muted">Saved vs PIHPS</p>
            <p className="num mt-1 text-3xl font-extrabold text-brand">{rupiah(savingOf(round))}</p>
            <p className="num mt-2 text-sm text-night-muted">
              ({rupiah(round.ref_price)} - {rupiah(clearing)}) x {int(round.total_qty)} {unit}
            </p>
            <p className="mt-4 text-sm text-night-muted">
              Winner{" "}
              <a className={DARK_LINK} target="_blank" rel="noreferrer" href={accountUrl(winner.seller_id)}>{shortAccount(winner.seller_id)}</a>
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 max-w-xl text-lg font-semibold">
          {round.state === "Failed"
            ? "Round failed: no valid bid, or demand was below the minimum. All funds were refunded."
            : "The winner is picked once the reveal phase ends."}
        </p>
      )}
    </section>
  );
}
