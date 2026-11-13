import { Info } from "lucide-react";
import type { Item } from "@/lib/types";

/** The page's h1 and one muted line, like a greeting. */
export function HomeHeader({ reference }: { reference?: Pick<Item, "source" | "as_of"> }) {
  return (
    <header className="pt-1">
      <h1 className="max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-4xl">Warungs pool orders. Grosirs bid for them.</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">
        Small neighbourhood shops pool their orders, wholesalers bid in a sealed auction, and a NEAR contract holds the money.
        {reference?.source && reference.as_of && <span className="num"> Reference prices: {reference.source}, {reference.as_of}.</span>}
      </p>
    </header>
  );
}

export function RealVsAssumed() {
  return (
    <p className="flex max-w-3xl gap-2.5 text-xs text-muted" aria-label="What is real and what is assumed">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold text-ink">What is real and what is assumed.</strong> The PIHPS reference prices (11 Nov 2026) and HET (government ceiling price) are official data, stored on-chain; no round&apos;s max price can exceed the PIHPS price. The costs of the grosirs we run ourselves are <strong className="font-semibold text-ink">assumptions</strong> (0.85 to 0.97 times HET), not real wholesale prices. tIDR is testnet test rupiah. Warungs named <span className="num">warung-NN</span> are seeded test accounts with fictional owner names; any other account was created outside our seeded set.
      </span>
    </p>
  );
}
