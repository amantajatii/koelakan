import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { AgentStatus } from "@/lib/agent-types";

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tint: string;
}

export function Stat({ label, value, hint, icon: Icon, tint }: StatProps) {
  return (
    <div className="flex items-start gap-4 rounded-card bg-surface p-5 shadow-card">
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tint)}><Icon className="size-5" /></span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="num mt-1 text-xl font-bold">{value}</dd>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function PhaseDurations({ cadence: c }: { cadence: AgentStatus["cadence"] }) {
  const rows = [["Joining", c.join_secs], ["Sealed bids", c.commit_secs], ["Reveal", c.reveal_secs], ["Delivery", c.delivery_secs]] as const;
  const longest = Math.max(1, ...rows.map(([, secs]) => secs));
  return (
    <ol className="mt-4 space-y-4 text-sm">
      {rows.map(([name, secs]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-3"><span className="font-bold">{name}</span><span className="num text-muted">{secs} s</span></div>
          <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-ground">
            <div className="h-full rounded-full bg-night" style={{ width: `${Math.max(3, (secs / longest) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
