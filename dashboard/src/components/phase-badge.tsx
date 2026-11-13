import { Chip, type Tone } from "@/components/ui/chip";
import { PHASE_LABEL } from "@/lib/phase";
import type { Phase } from "@/lib/types";

/** Lavender = in progress, amber = waiting on someone, lime = closed, red = failed. */
const TONE: Record<Phase, Tone> = {
  Join: "info",
  Commit: "info",
  Reveal: "info",
  ReadyToSettle: "warn",
  Delivery: "warn",
  AwaitingFinalize: "warn",
  Failed: "bad",
  Closed: "good",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  return <Chip tone={TONE[phase]}>{PHASE_LABEL[phase]}</Chip>;
}
