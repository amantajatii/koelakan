import { Panel, SectionTitle } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { percent, rupiah } from "@/lib/format";
import { itemLabel } from "@/lib/items";
import { aboveHetPercent } from "@/lib/stats";
import type { Item } from "@/lib/types";

export function Catalogue({ items }: { items: Item[] }) {
  const asOf = items[0]?.as_of;
  const source = items[0]?.source;
  return (
    <Panel aria-labelledby="catalogue">
      <SectionTitle aside={source && asOf ? <span className="text-sm text-ink-soft">{source}, {asOf}</span> : null}>
        <span id="catalogue">Catalogue and reference prices</span>
      </SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">PIHPS reference price and HET per item</caption>
          <thead>
            <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">PIHPS market price</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">HET</th>
              <th scope="col" className="py-2 font-semibold">Gap</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const above = aboveHetPercent(item);
              return (
                <tr key={item.id} className="border-b border-dashed border-rule align-top">
                  <th scope="row" className="py-3 pr-3 font-semibold">
                    {itemLabel(item)}
                    <span className="block text-xs font-normal text-ink-soft">per {item.unit} · <span className="num">{item.id}</span></span>
                  </th>
                  <td className="num py-3 pr-3 text-right text-base font-semibold">{rupiah(item.ref_price)}</td>
                  <td className="num py-3 pr-3 text-right">{item.het === null ? "none" : rupiah(item.het)}</td>
                  <td className="py-3">
                    {above === null ? (
                      <span className="text-ink-soft">n/a</span>
                    ) : above > 0 ? (
                      <Stamp tone="bad">{percent(above)} above HET</Stamp>
                    ) : (
                      <Stamp tone="good">{percent(Math.abs(above))} below HET</Stamp>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        The reference price is the <strong className="text-ink">real</strong> national average market price from PIHPS
        (Indonesia&apos;s national food price monitor), stored on-chain, and no round&apos;s max price can exceed it. HET is the
        official retail price ceiling (Bapanas Circular No. 456/2026), shown for context only.
      </p>
    </Panel>
  );
}
