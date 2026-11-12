import type { Policy } from "./types";

export type StepId = "signin" | "faucet" | "deposit" | "policy" | "delegate" | "order";
export type StepStatus = "done" | "next" | "todo" | "locked";

export interface FlowInput {
  accountId: string | null;
  tidr: bigint | null;
  available: bigint | null;
  held: bigint | null;
  policy: Policy | null;
  /** From chain (view_access_key) or the API. Null while unknown. */
  delegated: boolean | null;
  /** Saved standing order from the API, null if none or service unreachable. */
  demand: Readonly<Record<string, number>> | null;
  apiOnline: boolean;
}

export interface FlowStep {
  id: StepId;
  status: StepStatus;
}

export const STEP_ORDER: readonly StepId[] = ["signin", "faucet", "deposit", "policy", "delegate", "order"];

export const hasDemand = (demand: FlowInput["demand"]): boolean => demand !== null && Object.values(demand).some((q) => q > 0);

function isDone(id: StepId, i: FlowInput): boolean {
  switch (id) {
    case "signin":
      return i.accountId !== null;
    case "faucet":
      return (i.tidr ?? 0n) > 0n || (i.available ?? 0n) > 0n || (i.held ?? 0n) > 0n;
    case "deposit":
      return (i.available ?? 0n) > 0n || (i.held ?? 0n) > 0n;
    case "policy":
      return i.policy !== null;
    case "delegate":
      return i.delegated === true;
    case "order":
      return hasDemand(i.demand);
  }
}

/**
 * Which step is next, given chain and API state. Steps stay locked until you sign in; the standing
 * order is locked while the service is offline (it cannot be saved). Nothing is skipped: the first
 * unfinished, unlocked step is "next", later ones are "todo".
 */
export function computeSteps(input: FlowInput): FlowStep[] {
  let nextTaken = false;
  return STEP_ORDER.map((id) => {
    if (isDone(id, input)) return { id, status: "done" as const };
    const locked = (!input.accountId && id !== "signin") || (id === "order" && !input.apiOnline);
    if (locked) return { id, status: "locked" as const };
    if (!nextTaken) {
      nextTaken = true;
      return { id, status: "next" as const };
    }
    return { id, status: "todo" as const };
  });
}

export const nextStep = (steps: readonly FlowStep[]): StepId | null => steps.find((s) => s.status === "next")?.id ?? null;

export const isReady = (steps: readonly FlowStep[]): boolean => steps.every((s) => s.status === "done");
