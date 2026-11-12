import { JudgeFlow } from "@/components/judge/judge-flow";

export const metadata = { title: "Coba sendiri | Koelakan" };

export default function CobaPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Coba sendiri</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Jadilah pemilik warung di testnet. Enam langkah dari masuk sampai ikut ronde, dengan bukti tiap transaksi di nearblocks.
      </p>
      <JudgeFlow />
    </>
  );
}
