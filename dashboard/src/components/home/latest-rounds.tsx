import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Countdown } from "@/components/shared/countdown";
import { ItemImage } from "@/components/shared/produce-art";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { itemTheme } from "@/lib/item-theme";
import { currentDeadlineMs, derivePhase, PHASE_LABEL } from "@/lib/phase";
import type { RoundView } from "@/lib/types";

const ROWS = 4;

function RoundLine({ round, nowMs }: { round: RoundView; nowMs: number }) {
  const phase = derivePhase(round, nowMs);
  const deadline = currentDeadlineMs(round, nowMs);
  const short = itemTheme(round.item).short;
  return (
    <li>
      <Link href={`/rounds/${round.id}`} className="group -mx-2 flex min-h-16 items-center gap-3 rounded-2xl p-2 transition-colors duration-150 hover:bg-ground/70">
        <ItemImage itemId={round.item} size="sm" plain />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">Round <span className="num">#{round.id}</span> · {short}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">
            {PHASE_LABEL[phase]}

            {deadline !== null && <> · ends in <Countdown deadlineMs={deadline} nowMs={nowMs} /></>}
          </span>
        </span>
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ground text-ink transition-colors duration-150 group-hover:bg-brand">
          <ChevronRight className="size-5" />
        </span>
      </Link>
    </li>
  );
}

/** The four newest rounds with their phase, each a link to the round. */
export function LatestRounds({ rounds, nowMs }: { rounds: readonly RoundView[]; nowMs: number }) {
  const latest = [...rounds].sort((a, b) => b.id - a.id).slice(0, ROWS);
  return (
    <Panel aria-labelledby="latest-rounds-title">
      <SectionTitle><span id="latest-rounds-title">Latest rounds</span></SectionTitle>
      {latest.length === 0 ? (
        <EmptyState title="No rounds yet">The agent service opens rounds on a schedule.</EmptyState>
      ) : (
        <ul className="space-y-1">{latest.map((r) => <RoundLine key={r.id} round={r} nowMs={nowMs} />)}</ul>
      )}
    </Panel>
  );
}
