import { Stamp, type Tone } from "@/components/ui/stamp";
import { PHASE_LABEL } from "@/lib/phase";
import type { Phase } from "@/lib/types";

const TONE: Record<Phase, Tone> = {
  Join: "good",
  Commit: "info",
  Reveal: "info",
  ReadyToSettle: "warn",
  Delivery: "warn",
  AwaitingFinalize: "warn",
  Failed: "bad",
  Closed: "neutral",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  return <Stamp tone={TONE[phase]}>{PHASE_LABEL[phase]}</Stamp>;
}
