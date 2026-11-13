import Link from "next/link";
import { CircleCheck, Hourglass, RotateCcw, Timer, type LucideIcon } from "lucide-react";
import { Chip, type Tone } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { itemTheme } from "@/lib/item-theme";
import type { RoundView } from "@/lib/types";
import { bucketRounds, type StatusBucket } from "./series";

interface Meta { title: string; icon: LucideIcon; tone: Tone; tile: string; ink: string }

const META: Record<StatusBucket, Meta> = {
  live: { title: "Live auction", icon: Timer, tone: "info", tile: "bg-info-soft", ink: "text-info" },
  waiting: { title: "Awaiting settlement", icon: Hourglass, tone: "warn", tile: "bg-warn-soft", ink: "text-warn" },
  closed: { title: "Closed and paid", icon: CircleCheck, tone: "good", tile: "bg-brand-soft", ink: "text-brand-ink" },
  failed: { title: "Failed, refunded", icon: RotateCcw, tone: "bad", tile: "bg-danger-soft", ink: "text-danger" },
};

function Row({ bucket, count, latest }: { bucket: StatusBucket; count: number; latest: RoundView | null }) {
  const { title, icon: Icon, tone, tile, ink } = META[bucket];
  const content = (
    <>
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", tile, ink)}><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-muted">
          {latest ? <>Latest: round <span className="num">#{latest.id}</span> · {itemTheme(latest.item).short}</> : "None right now"}
        </span>
      </span>
      <Chip tone={tone}><span className="num">{count}</span>&nbsp;{count === 1 ? "round" : "rounds"}</Chip>
    </>
  );
  const base = "-mx-2 flex min-h-16 items-center gap-3 rounded-2xl p-2";
  return (
    <li>
      {latest ? (
        <Link href={`/rounds/${latest.id}`} className={cn(base, "transition-colors duration-150 hover:bg-ground/70")}>{content}</Link>
      ) : (
        <div className={base}>{content}</div>
      )}
    </li>
  );
}

/** Rounds grouped by what they are waiting for; each row opens the newest round of its kind. */
export function RoundStatus({ rounds, nowMs }: { rounds: readonly RoundView[]; nowMs: number }) {
  return (
    <Panel aria-labelledby="round-status-title">
      <SectionTitle><span id="round-status-title">Round status</span></SectionTitle>
      <ul className="space-y-1">
        {bucketRounds(rounds, nowMs).map((b) => <Row key={b.bucket} {...b} />)}
      </ul>
    </Panel>
  );
}
