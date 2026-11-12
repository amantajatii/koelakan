import { cn } from "@/components/ui/cn";
import { formatClock, shortAccount } from "@/lib/format";
import type { ChatMessage } from "@/lib/wa";

function Ticks() {
  return (
    <svg viewBox="0 0 18 10" className="inline size-3.5 text-ledger" aria-label="Read" role="img">
      <path d="M1 5.5 4 8.5 10 1.5M7.5 8.5 14 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const KIND_TAG: Partial<Record<ChatMessage["kind"], string>> = {
  settled: "Round result",
  failed: "Round failed",
  bond_forfeited: "Bond forfeited",
  delivery_confirmed: "Delivery",
  auto_accepted: "Auto-accepted",
  disputed: "Dispute",
  dispute_resolved: "Dispute",
};

export function Bubble({ message, showSender }: { message: ChatMessage; showSender: boolean }) {
  const mine = message.direction === "owner_to_agent";
  const tag = KIND_TAG[message.kind];
  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-3 py-2 text-[0.92rem] leading-snug shadow-[0_1px_0_rgba(42,33,24,0.25)]",
          mine ? "rounded-tr-none bg-pandan-soft" : "rounded-tl-none bg-cream",
        )}
      >
        {showSender && (
          <p className="mb-0.5 text-xs font-bold text-ledger">
            Agent {shortAccount(message.account)} <span className="font-normal text-ink-soft">for {message.owner}</span>
          </p>
        )}
        {mine && <p className="mb-0.5 text-xs font-bold text-pandan">{message.owner}</p>}
        {tag && <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-chili">{tag}</p>}
        <p>{message.text}</p>
        <p className="num mt-1 flex items-center justify-end gap-1 text-[0.68rem] text-ink-soft">
          <time dateTime={new Date(message.t).toISOString()}>{formatClock(message.t)}</time>
          {mine && <Ticks />}
        </p>
      </div>
    </li>
  );
}
