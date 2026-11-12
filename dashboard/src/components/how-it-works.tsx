import { Gavel, PackageCheck, Undo2, Users, type LucideIcon } from "lucide-react";

const STEPS: ReadonlyArray<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Users, title: "Pool orders", body: "Every warung has an agent. The agent locks balance for the quantity needed and never goes past the owner's price limit or budget." },
  { icon: Gavel, title: "Sealed-bid auction", body: "Each grosir (wholesaler) submits a price hash plus a 5% bond, then reveals the price in the next phase. The lowest valid price wins." },
  { icon: Undo2, title: "Difference refunded", body: "Warungs get back the gap between the max price and the winning price. The bond of a grosir that never reveals is split among buyers." },
  { icon: PackageCheck, title: "Deliver and pay", body: "Payment stays in the contract until the owner confirms receipt, or counts as received automatically if the owner stays silent until the deadline." },
];

/** A calm left-to-right sequence joined by one hairline, not a grid of identical cards. */
export function HowItWorks() {
  return (
    <ol className="relative grid gap-7 lg:grid-cols-4 lg:gap-8" aria-label="How it works">
      <span aria-hidden className="absolute left-[1.35rem] top-5 hidden h-px w-[calc(100%-2.7rem)] bg-line-strong lg:block" />
      <span aria-hidden className="absolute bottom-6 left-[1.35rem] top-5 w-px bg-line-strong lg:hidden" />
      {STEPS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="relative flex gap-4 lg:block">
          <span aria-hidden className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink ring-4 ring-surface">
            <Icon className="size-5" strokeWidth={1.9} />
          </span>
          <div className="lg:mt-4">
            <h3 className="font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
