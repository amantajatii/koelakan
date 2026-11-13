import Link from "next/link";
import { ItemImage } from "@/components/shared/produce-art";
import { linkClass } from "@/components/ui/panel";
import { percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { percentBelow, type ItemSnapshot } from "@/lib/item-summary";

function PriceRow({ snap }: { snap: ItemSnapshot }) {
  const { item, paid, roundId } = snap;
  const below = percentBelow(item.ref_price, paid);
  const width = paid === null ? 0 : Math.max(8, Math.min(100, (Number(paid) / Number(item.ref_price)) * 100));
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-card bg-surface p-5 shadow-card sm:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto] sm:gap-x-6">
      <ItemImage itemId={item.id} size="md" plain />
      <div className="min-w-0">
        <p className="font-bold">{itemLabel(item)}</p>
        <p className="text-xs text-muted">{roundId === null ? "No settled round yet" : <>Round #{roundId}, per {item.unit}</>}</p>
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">PIHPS <s className="num">{rupiah(item.ref_price)}</s></span>
          <span className="num text-lg font-extrabold">{paid === null ? "Not yet" : rupiah(paid)}</span>
        </div>
        <div aria-hidden className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-night" style={{ width: `${width}%` }} />
        </div>
      </div>
      {below !== null && (
        <span className="num col-span-2 justify-self-start rounded-full bg-brand px-3 py-1 text-xs font-bold text-ink sm:col-span-1 sm:justify-self-end">
          {percent(below)} below
        </span>
      )}
    </li>
  );
}

/** All four staples against the real PIHPS price, from the latest settled round of each. */
export function PriceProof({ snapshots, asOf }: { snapshots: readonly ItemSnapshot[]; asOf: string | null }) {
  return (
    <section id="prices" aria-labelledby="prices-title" className="mx-auto w-full max-w-[84rem] scroll-mt-6 px-4 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h2 id="prices-title" className="text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.6rem] sm:leading-[1.1]">Measured against a price you can check.</h2>
          <p className="mt-4 text-lg text-muted">
            Every round&apos;s ceiling comes from PIHPS, Indonesia&apos;s national food price monitor, stored on-chain. A saving here is a gap to a public number, not to a price we picked.
          </p>
          <p className="mt-6 text-sm text-muted">
            PIHPS Nasional{asOf ? `, ${asOf}` : ""}. Prices paid come from testnet rounds with simulated grosir costs.{" "}
            <Link href="/rounds" className={linkClass}>See every round</Link>
          </p>
        </div>
        {snapshots.length === 0 ? (
          <p className="self-center rounded-card bg-surface p-6 text-muted shadow-card">Prices load from the chain. If this stays empty, the public NEAR node may be busy; try again in a minute.</p>
        ) : (
          <ul className="space-y-3">
            {snapshots.map((s) => <PriceRow key={s.item.id} snap={s} />)}
          </ul>
        )}
      </div>
    </section>
  );
}
