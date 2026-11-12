import { CheckCheck } from "lucide-react";
import { Chip, type Tone } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { formatClock, shortAccount } from "@/lib/format";
import type { ChatMessage } from "@/lib/wa";

const KIND_TAG: Partial<Record<ChatMessage["kind"], { text: string; tone: Tone }>> = {
  settled: { text: "Round result", tone: "good" },
  failed: { text: "Round failed", tone: "bad" },
  bond_forfeited: { text: "Bond forfeited", tone: "info" },
  delivery_confirmed: { text: "Delivery", tone: "good" },
  auto_accepted: { text: "Auto-accepted", tone: "neutral" },
  disputed: { text: "Dispute", tone: "warn" },
  dispute_resolved: { text: "Dispute", tone: "warn" },
};

export function Bubble({ message, showSender }: { message: ChatMessage; showSender: boolean }) {
  const mine = message.direction === "owner_to_agent";
  const tag = KIND_TAG[message.kind];
  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.94rem] leading-snug",
          mine ? "rounded-br-md bg-brand-soft text-ink" : "rounded-bl-md border border-line bg-surface shadow-[0_1px_2px_rgba(15,42,34,0.05)]",
        )}
      >
        {showSender && (
          <p className="mb-1 text-xs font-bold text-brand-ink">
            Agent {shortAccount(message.account)} <span className="font-medium text-muted">for {message.owner}</span>
          </p>
        )}
        {mine && <p className="mb-1 text-xs font-bold text-brand-ink">{message.owner}</p>}
        {tag && <Chip tone={tag.tone} className="mb-1.5">{tag.text}</Chip>}
        <p>{message.text}</p>
        <p className="num mt-1 flex items-center justify-end gap-1 text-[0.7rem] text-muted">
          <time dateTime={new Date(message.t).toISOString()}>{formatClock(message.t)}</time>
          {mine && <CheckCheck className="size-3.5 text-brand" aria-label="Read" role="img" />}
        </p>
      </div>
    </li>
  );
}
