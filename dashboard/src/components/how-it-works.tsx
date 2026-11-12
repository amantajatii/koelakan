const STEPS = [
  { n: "1", title: "Patungan", body: "Setiap warung punya agen. Agen mengunci saldo untuk jumlah barang yang dibutuhkan, tidak pernah melewati batas harga dan anggaran pemilik." },
  { n: "2", title: "Lelang tersegel", body: "Grosir mengirim hash harga plus jaminan 5%, lalu membuka harga di fase berikutnya. Harga terendah yang valid menang." },
  { n: "3", title: "Selisih kembali", body: "Warung dikembalikan selisih harga maks dan harga menang. Jaminan grosir yang tidak membuka tawaran dibagi ke pembeli." },
  { n: "4", title: "Kirim dan bayar", body: "Pembayaran ditahan di kontrak sampai pemilik konfirmasi terima, atau diterima otomatis bila diam sampai batas waktu." },
] as const;

export function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Cara kerja">
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
