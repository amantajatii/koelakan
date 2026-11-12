import Link from "next/link";
import { HomeLive } from "@/components/home-live";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;

export default async function HomePage() {
  const { data, renderedAt } = await loadOverview();
  return (
    <>
      <section className="mb-10 max-w-3xl">
        <p className="mb-3 inline-block -rotate-1 rounded-sm border-2 border-chili px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-chili">
          kulakan = belanja ke grosir
        </p>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Warung kecil, harga <span className="text-chili">grosir</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Agen setiap warung patungan jadi satu pesanan besar, lalu agen grosir bersaing lewat lelang tawaran tersegel. Kontrak
          NEAR menahan dana dan menegakkan batas harga serta anggaran pemilik.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/rounds" className="inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-cream hover:bg-chili">
            Lihat ronde
          </Link>
          <Link href="/coba" className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-5 text-sm font-semibold hover:bg-kunyit-soft">
            Coba sendiri
          </Link>
        </div>
      </section>
      <HomeLive initial={data} renderedAt={renderedAt} />
    </>
  );
}
