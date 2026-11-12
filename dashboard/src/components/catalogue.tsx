import { Panel, SectionTitle } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { percent, rupiah } from "@/lib/format";
import { aboveHetPercent } from "@/lib/stats";
import type { Item } from "@/lib/types";

export function Catalogue({ items }: { items: Item[] }) {
  const asOf = items[0]?.as_of;
  const source = items[0]?.source;
  return (
    <Panel aria-labelledby="katalog">
      <SectionTitle aside={source && asOf ? <span className="text-sm text-ink-soft">{source}, {asOf}</span> : null}>
        <span id="katalog">Katalog dan harga acuan</span>
      </SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Harga acuan PIHPS dan HET per barang</caption>
          <thead>
            <tr className="border-b-2 border-ink text-xs uppercase tracking-wider text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-semibold">Barang</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Harga pasar PIHPS</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">HET</th>
              <th scope="col" className="py-2 font-semibold">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const above = aboveHetPercent(item);
              return (
                <tr key={item.id} className="border-b border-dashed border-rule align-top">
                  <th scope="row" className="py-3 pr-3 font-semibold">
                    {item.name}
                    <span className="block text-xs font-normal text-ink-soft">per {item.unit} · <span className="num">{item.id}</span></span>
                  </th>
                  <td className="num py-3 pr-3 text-right text-base font-semibold">{rupiah(item.ref_price)}</td>
                  <td className="num py-3 pr-3 text-right">{item.het === null ? "tidak ada" : rupiah(item.het)}</td>
                  <td className="py-3">
                    {above === null ? (
                      <span className="text-ink-soft">n/a</span>
                    ) : above > 0 ? (
                      <Stamp tone="bad">{percent(above)} di atas HET</Stamp>
                    ) : (
                      <Stamp tone="good">{percent(Math.abs(above))} di bawah HET</Stamp>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Harga acuan adalah harga <strong className="text-ink">nyata</strong> rata-rata nasional (PIHPS Nasional) yang tersimpan
        on-chain, dan batas harga setiap ronde tidak bisa melebihinya. HET dari Surat Edaran Bapanas No. 456/2026, hanya untuk
        konteks.
      </p>
    </Panel>
  );
}
