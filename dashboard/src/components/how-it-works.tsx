const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Pool orders", body: "Every warung has an agent. The agent locks balance for the quantity needed and never goes past the owner's price limit or budget." },
  { title: "Sealed-bid auction", body: "Each grosir (wholesaler) submits a price hash plus a 5% bond, then reveals the price in the next phase. The lowest valid price wins." },
  { title: "Difference refunded", body: "Warungs get back the gap between the max price and the winning price. The bond of a grosir that never reveals is split among buyers." },
  { title: "Deliver and pay", body: "Payment stays in the contract until the owner confirms receipt, or counts as received automatically if the owner stays silent until the deadline." },
];

/** Four short steps in one row of plain text, numbered, separated by hairlines. */
export function HowItWorks() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line" aria-label="How it works">
      {STEPS.map(({ title, body }, i) => (
        <li key={title} className="lg:px-5 lg:first:pl-0 lg:last:pr-0">
          <h3 className="font-bold"><span className="num mr-2 text-brand-ink">{i + 1}</span>{title}</h3>
          <p className="mt-1 text-sm text-muted">{body}</p>
        </li>
      ))}
    </ol>
  );
}
