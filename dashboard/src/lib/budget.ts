import type { Item } from "./types";

const MINUTES_PER_WEEK = 7 * 24 * 60;
/** At or above this a weekly budget is not a limit anyone will hit (10^12 rupiah). */
export const UNLIMITED_BUDGET = 1_000_000_000_000n;
/** An order that empties the budget faster than this deserves a warning. */
export const FAST_EXHAUST_HOURS = 24;

export type BudgetWarning = "refused" | "exhausts_fast";

export interface BudgetInput {
  /** Standing order: kg per round, keyed by item id. */
  demand: Readonly<Record<string, number>>;
  items: readonly Pick<Item, "id" | "ref_price">[];
  /** Weekly budget in rupiah; null while not set. */
  weeklyBudget: bigint | null;
  /** Already spent or locked this week. */
  spent: bigint;
  /** Service cadence from /status; null when the service is offline. */
  roundEveryMin: number | null;
  /** Per-item price ceilings the contract will use; defaults to each item's PIHPS reference price. */
  ceilings?: Readonly<Record<string, bigint>>;
}

export interface BudgetPlan {
  /** What one round locks at most: sum of kg times the round ceiling. */
  lockPerRound: bigint;
  roundsPerWeek: number | null;
  /** Whole rounds the weekly budget covers; null when nothing is ordered or no budget is set. */
  roundsCovered: number | null;
  /** How long the full budget lasts if the agent joins every round; null when unknown or unlimited. */
  hoursToExhaust: number | null;
  unlimited: boolean;
  /** 0 to 100. */
  usedPercent: number;
  warnings: BudgetWarning[];
}

/** Pure budget maths behind the standing order and limits screens (contract: ceiling x qty is checked against the weekly budget). */
export function planBudget(input: BudgetInput): BudgetPlan {
  const { demand, items, weeklyBudget, spent, roundEveryMin, ceilings } = input;
  let lock = 0n;
  for (const item of items) {
    const qty = demand[item.id] ?? 0;
    if (!Number.isInteger(qty) || qty <= 0) continue;
    lock += (ceilings?.[item.id] ?? BigInt(item.ref_price)) * BigInt(qty);
  }
  const roundsPerWeek = roundEveryMin !== null && roundEveryMin > 0 ? Math.floor(MINUTES_PER_WEEK / roundEveryMin) : null;
  const unlimited = weeklyBudget !== null && weeklyBudget >= UNLIMITED_BUDGET;
  const hasBudget = weeklyBudget !== null && weeklyBudget > 0n;
  const roundsCovered = lock > 0n && hasBudget ? Number(weeklyBudget / lock) : null;
  const hoursToExhaust =
    roundsCovered !== null && !unlimited && roundEveryMin !== null && roundEveryMin > 0 ? (roundsCovered * roundEveryMin) / 60 : null;

  const warnings: BudgetWarning[] = [];
  if (lock > 0n && weeklyBudget !== null && weeklyBudget < lock) warnings.push("refused");
  else if (hoursToExhaust !== null && hoursToExhaust < FAST_EXHAUST_HOURS) warnings.push("exhausts_fast");

  const usedPercent = hasBudget && !unlimited ? Math.min(100, Number((spent * 10_000n) / weeklyBudget) / 100) : 0;
  return { lockPerRound: lock, roundsPerWeek, roundsCovered, hoursToExhaust, unlimited, usedPercent, warnings };
}

/** Weekly budget for people: huge values read as no limit instead of a wall of zeros. */
export function describeBudgetAmount(budget: bigint, format: (n: bigint) => string): string {
  return budget >= UNLIMITED_BUDGET ? "none set" : format(budget);
}

/** "about 3 hours" / "about 2 days" for the exhaustion warning. */
export function describeDuration(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 48) {
    const h = Math.round(hours);
    return `about ${h} ${h === 1 ? "hour" : "hours"}`;
  }
  return `about ${Math.round(hours / 24)} days`;
}
