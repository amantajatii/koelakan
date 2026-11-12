"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Chip, type Tone } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { linkClass } from "@/components/ui/panel";
import type { CallResult } from "@/lib/wallet";
import { txUrl } from "@/lib/config";
import type { StepId } from "@/lib/steps";

export { Field, inputClass } from "@/components/ui/field";

export type StepState = "done" | "ready" | "locked" | "optional" | "next" | "todo";

const BADGE: Record<StepState, { text: string; tone: Tone }> = {
  done: { text: "Done", tone: "good" },
  ready: { text: "Ready", tone: "info" },
  next: { text: "Next up", tone: "info" },
  todo: { text: "To do", tone: "neutral" },
  locked: { text: "Locked", tone: "neutral" },
  optional: { text: "Optional", tone: "neutral" },
};

interface StepperValue {
  open: StepId | null;
  toggle: (id: StepId) => void;
}
const StepperContext = createContext<StepperValue | null>(null);

/**
 * Vertical stepper: the current step is expanded, the others collapse to a one-line row with a state chip.
 * Opening another row is the user's choice and resets when the current step advances.
 */
export function Stepper({ nextId, children, label }: { nextId: StepId | null; children: ReactNode; label: string }) {
  const [pick, setPick] = useState<{ forNext: StepId | null; id: StepId | null } | null>(null);
  const open = pick && pick.forNext === nextId ? pick.id : nextId;
  const toggle = (id: StepId): void => setPick({ forNext: nextId, id: open === id ? null : id });
  return (
    <StepperContext.Provider value={{ open, toggle }}>
      <ol aria-label={label} className="divide-y divide-line">{children}</ol>
    </StepperContext.Provider>
  );
}

interface StepCardProps {
  index: string;
  title: string;
  state: StepState;
  intro: ReactNode;
  children?: ReactNode;
  /** Set when the step lives inside a Stepper. Without it the step renders as a plain, always-open section. */
  stepId?: StepId;
}

function Marker({ state, index }: { state: StepState; index: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200",
        state === "done" && "bg-brand text-white",
        (state === "next" || state === "ready") && "bg-brand-soft text-brand-ink outline outline-2 outline-brand",
        (state === "todo" || state === "optional") && "bg-ground text-muted outline outline-1 outline-line-strong",
        state === "locked" && "bg-ground text-muted",
      )}
    >
      {state === "done" ? <Check className="size-4" strokeWidth={3} /> : state === "locked" ? <Lock className="size-3.5" /> : index}
    </span>
  );
}

export function StepCard({ index, title, state, intro, children, stepId }: StepCardProps) {
  const ctx = useContext(StepperContext);
  const badge = BADGE[state];
  const accordion = ctx !== null && stepId !== undefined;
  const open = accordion ? ctx.open === stepId && state !== "locked" : true;
  const bodyId = `step-body-${stepId ?? index}`;
  const titleId = `step-${stepId ?? index}`;

  const head = (
    <>
      <Marker state={state} index={index} />
      <span className="min-w-0 flex-1 text-left">
        <span id={titleId} className={cn("block font-bold", state === "locked" && "text-muted")}>{title}</span>
      </span>
      <Chip tone={badge.tone}>{badge.text}</Chip>
      {accordion && <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180", state === "locked" && "invisible")} />}
    </>
  );
  const body = open && (
    <div id={bodyId} className="pb-5 pt-1 sm:pl-12">
      <div className="text-sm text-muted">{intro}</div>
      {children && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );

  if (!accordion) {
    return (
      <section aria-labelledby={titleId} className="py-1">
        <div className="flex min-h-12 items-center gap-3 py-2">{head}</div>
        {body}
      </section>
    );
  }
  return (
    <li aria-labelledby={titleId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        disabled={state === "locked"}
        onClick={() => ctx.toggle(stepId)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl py-2 transition-colors duration-150 enabled:hover:bg-ground/70 disabled:cursor-not-allowed"
      >
        {head}
      </button>
      {body}
    </li>
  );
}

/** Success or failure line under a step's action, with a link to the transaction when known. */
export function TxResult({ result }: { result: CallResult | null }) {
  if (!result) return null;
  return (
    <Notice tone={result.ok ? "ok" : "error"}>
      {result.ok ? "Done. It is saved on the blockchain." : result.error ?? "That did not go through. Try again."}{" "}
      {result.hash && (
        <a className={`num ${linkClass}`} target="_blank" rel="noreferrer" href={txUrl(result.hash)}>
          see it on nearblocks
        </a>
      )}
    </Notice>
  );
}
