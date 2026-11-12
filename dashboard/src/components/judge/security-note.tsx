import { config } from "@/lib/config";

export function SecurityNote() {
  return (
    <aside aria-labelledby="keamanan" className="rounded-lg border-2 border-pandan bg-pandan-soft/50 p-4 text-sm">
      <h2 id="keamanan" className="font-display text-xl font-semibold text-pandan">Kenapa kunci ini aman</h2>
      <ul className="mt-2 space-y-2">
        <li>
          Kunci yang dibuat dompet hanya boleh memanggil <code className="num">join_round</code> di <code className="num">{config.marketId}</code>.
          Kunci fungsi tidak bisa melampirkan deposit.
        </li>
        <li>
          <code className="num">withdraw</code>, <code className="num">set_policy</code>, <code className="num">confirm_delivery</code> dan{" "}
          <code className="num">dispute</code> wajib 1 yocto, jadi hanya kunci penuh Anda yang sah. Kunci terbatas tidak bisa memindahkan dana.
        </li>
        <li>
          Kontrak yang menolak, bukan agen: harga maks ronde, anggaran mingguan, dan saldo diperiksa di dalam <code className="num">join_round</code>.
          Kunci yang bocor paling jauh hanya ikut ronde yang sudah diizinkan kebijakan.
        </li>
      </ul>
    </aside>
  );
}
