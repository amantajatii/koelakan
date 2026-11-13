"use client";

import { Notice } from "@/components/ui/notice";
import { linkClass } from "@/components/ui/panel";
import { describeBudgetAmount, describeDuration, type BudgetPlan } from "@/lib/budget";
import { int, rupiah } from "@/lib/format";

interface Props {
  plan: BudgetPlan;
  weeklyBudget: bigint | null;
  spent: bigint;
  /** Show the "used this week" bar (needs a budget that exists on chain). */
  showUsage?: boolean;
  /** Where the limits editor lives; shows a "Set a budget" link when no real budget is set. */
  editHref?: string;
}

/** Jump to the limits editor, opening it first when it sits inside a collapsed <details>. */
function openEditor(href: string): void {
  const target = document.getElementById(href.replace(/^#/, ""));
  if (target instanceof HTMLDetailsElement) target.open = true;
}

/** What the order costs per round, how far the weekly budget goes, and warnings when the two do not fit. */
export function BudgetSummary({ plan, weeklyBudget, spent, showUsage = true, editHref }: Props) {
  const ordering = plan.lockPerRound > 0n;
  const hasBudget = weeklyBudget !== null && !plan.unlimited;
  return (
    <div className="space-y-3 border-t border-line pt-4 text-sm" aria-live="polite">
      {ordering ? (
        <dl className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <dt>This order locks up to</dt>
            <dd className="num font-bold">{rupiah(plan.lockPerRound)} <span className="font-medium text-muted">per round</span></dd>
          </div>
          {hasBudget && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt>Your weekly budget covers about</dt>
              <dd className="num font-bold">
                {plan.roundsCovered === null ? "" : `${int(plan.roundsCovered)} ${plan.roundsCovered === 1 ? "round" : "rounds"}`}
                {plan.roundsPerWeek !== null && <span className="font-medium text-muted"> of about {int(plan.roundsPerWeek)} a week</span>}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-muted">Pick what to buy and we show how far your weekly budget goes.</p>
      )}
      {plan.unlimited && (
        <p className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span><span className="font-semibold">Weekly budget:</span> none set</span>
          {editHref && <a href={editHref} onClick={() => openEditor(editHref)} className={linkClass}>Set a budget</a>}
        </p>
      )}
      {ordering && <p className="text-xs text-muted">Money is held while a round runs. Anything saved against the market price comes straight back to your balance.</p>}

      {showUsage && hasBudget && (
        <div>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold">Used this week</span>
            <span className="num text-muted">{`${rupiah(spent)} of ${describeBudgetAmount(weeklyBudget, rupiah)}`}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Share of this week's budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(plan.usedPercent)}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10"
          >
            <div className="h-full rounded-full bg-night transition-[width] duration-500 ease-out" style={{ width: `${Math.max(plan.usedPercent, spent > 0n ? 2 : 0)}%` }} />
          </div>
        </div>
      )}

      {weeklyBudget !== null && plan.warnings.includes("refused") && (
        <Notice tone="error" role="alert">
          Your weekly budget ({rupiah(weeklyBudget)}) is less than one round of this order ({rupiah(plan.lockPerRound)}). The agent would be refused every time. Raise the budget or order less.
        </Notice>
      )}
      {plan.warnings.includes("exhausts_fast") && plan.hoursToExhaust !== null && (
        <Notice tone="warn">
          If your agent joins every round, this order uses up the whole budget in {describeDuration(plan.hoursToExhaust)}. Raise the budget or order less if you want it to last the week.
        </Notice>
      )}
    </div>
  );
}
