const STEPS = [
  { n: "1", title: "Pool orders", body: "Every warung has an agent. The agent locks balance for the quantity needed and never goes past the owner's price limit or budget." },
  { n: "2", title: "Sealed-bid auction", body: "Each grosir (wholesaler) submits a price hash plus a 5% bond, then reveals the price in the next phase. The lowest valid price wins." },
  { n: "3", title: "Difference refunded", body: "Warungs get back the gap between the max price and the winning price. The bond of a grosir that never reveals is split among buyers." },
  { n: "4", title: "Deliver and pay", body: "Payment stays in the contract until the owner confirms receipt, or counts as received automatically if the owner stays silent until the deadline." },
] as const;

export function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How it works">
      {STEPS.map((s) => (
        <li key={s.n} className="rounded-lg border-2 border-ink/80 bg-cream p-4">
          <span className="font-display text-3xl font-bold text-chili">{s.n}</span>
          <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
