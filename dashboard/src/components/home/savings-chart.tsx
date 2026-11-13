import { cn } from "@/components/ui/cn";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { int, percent, rupiah } from "@/lib/format";
import { itemTheme } from "@/lib/item-theme";
import { aggregate } from "@/lib/stats";
import type { RoundView } from "@/lib/types";
import { savingsSeries, type SavingsPoint } from "./series";

const PLOT_REM = 11;
const MIN_BAR_PCT = 3;

function Tooltip({ point, alignRight }: { point: SavingsPoint; alignRight: boolean }) {
  return (
    <span aria-hidden className={cn("absolute bottom-full mb-2 whitespace-nowrap rounded-lg bg-night px-2.5 py-1.5 text-xs font-semibold text-white", alignRight ? "right-0" : "left-0")}>
      <span className="num">{percent(point.percent)}</span> · Round <span className="num">#{point.roundId}</span>
    </span>
  );
}

function summary(points: readonly SavingsPoint[]): string {
  const last = points[points.length - 1];
  return `Bar chart of the saving below the PIHPS price for the last ${points.length} settled rounds. Latest is round ${last?.roundId} at ${last ? percent(last.percent) : ""}.`;
}

/** Thin navy bars, one per settled round; the newest is lime with a tooltip. Plain divs, no chart library. */
export function SavingsChart({ rounds }: { rounds: readonly RoundView[] }) {
  const points = savingsSeries(rounds);
  const agg = aggregate(rounds);
  const max = Math.max(...points.map((p) => p.percent), 1);
  const lastIndex = points.length - 1;
  return (
    <Panel aria-labelledby="savings-chart-title" className="flex flex-col">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="savings-chart-title" className="text-lg font-bold tracking-[-0.01em]">Savings per round</h2>
          {agg.settledRounds > 0 && (
            <p className="num mt-1 text-sm text-muted">
              <span className="font-semibold text-brand-ink">{percent(agg.avgPercentBelow)}</span> below PIHPS on average across {int(agg.settledRounds)} settled {agg.settledRounds === 1 ? "round" : "rounds"}
            </p>
          )}
        </div>
        {points.length > 0 && <p className="text-xs text-muted">Last {points.length} settled</p>}
      </div>
      {points.length === 0 ? (
        <EmptyState title="No settled round yet">The first settled round draws its saving here.</EmptyState>
      ) : (
        <>
          <div aria-hidden className="relative flex items-end gap-1 border-b border-line px-1 pt-12 sm:gap-2" style={{ height: `${PLOT_REM + 3}rem` }}>
            {points.map((p, i) => {
              const isLatest = i === lastIndex;
              const heightPct = Math.max(MIN_BAR_PCT, (p.percent / max) * 100);
              return (
                <div key={p.roundId} className="relative flex h-full flex-1 items-end justify-center">
                  <div className="relative w-2.5 rounded-full sm:w-3" style={{ height: `${heightPct}%` }}>
                    <span className={cn("absolute inset-0 rounded-full", isLatest ? "bg-brand ring-1 ring-ink/10" : "bg-night")} />
                    {isLatest && <Tooltip point={p} alignRight={i >= points.length / 2} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div aria-hidden className="mt-2 flex gap-1 px-1 sm:gap-2">
            {points.map((p) => (
              <span key={p.roundId} className="num flex-1 text-center text-[11px] text-muted">{p.roundId}</span>
            ))}
          </div>
          <p aria-hidden className="mt-1 text-center text-[11px] text-muted">Round number</p>
          <div className="sr-only"><table>
            <caption>{summary(points)}</caption>
            <thead><tr><th scope="col">Round</th><th scope="col">Item</th><th scope="col">Below PIHPS</th><th scope="col">Saved</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.roundId}><th scope="row">#{p.roundId}</th><td>{itemTheme(p.itemId).short}</td><td>{percent(p.percent)}</td><td>{rupiah(p.saving)}</td></tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </Panel>
  );
}
