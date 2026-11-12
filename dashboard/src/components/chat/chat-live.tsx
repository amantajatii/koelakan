"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Thread } from "@/components/chat/thread";
import { EmptyState, ErrorNote, Skeleton } from "@/components/ui/states";
import { useLive } from "@/hooks/use-live";
import { ownerName, shortAccount } from "@/lib/format";
import { fetchOverview, type Overview } from "@/lib/overview";
import { itemOf } from "@/lib/stats";
import { buildRoundChat, filterByAccount } from "@/lib/wa";

const REFRESH_MS = 15_000;
const ALL = "__all__";

const selectClass =
  "min-h-11 w-full rounded-md border-2 border-ink bg-cream px-3 text-sm font-semibold focus-visible:outline-offset-0";

export function ChatLive({ initial }: { initial: Overview | null }) {
  const { data, error, loading, refresh } = useLive(fetchOverview, initial, REFRESH_MS);
  const params = useSearchParams();
  const requested = Number(params.get("round"));
  const [roundChoice, setRoundChoice] = useState<number | null>(Number.isInteger(requested) && params.has("round") ? requested : null);
  const [warungChoice, setWarungChoice] = useState<string | null>(null);

  const withParticipants = useMemo(() => (data?.rounds ?? []).filter((r) => r.participants.length > 0), [data]);
  const round = useMemo(() => {
    if (!data) return null;
    const picked = roundChoice !== null ? data.rounds.find((r) => r.id === roundChoice) : undefined;
    return picked ?? withParticipants[withParticipants.length - 1] ?? null;
  }, [data, roundChoice, withParticipants]);
  const item = data && round ? itemOf(data.items, round.item) : undefined;

  const messages = useMemo(() => (round && item ? buildRoundChat(round, item) : []), [round, item]);

  if (!data) {
    return loading ? <Skeleton className="h-96" /> : <ErrorNote message={error ?? "Tidak ada balasan."} onRetry={refresh} />;
  }
  if (!round || !item) {
    return <EmptyState title="Belum ada percakapan">Chat muncul setelah ada warung yang ikut ronde. <Link className="underline" href="/coba">Coba sendiri</Link>.</EmptyState>;
  }

  const accounts = round.participants.map((p) => p.account_id).sort();
  const warung = warungChoice !== null && warungChoice !== ALL && accounts.includes(warungChoice) ? warungChoice : warungChoice === ALL ? null : (accounts[0] ?? null);
  const shown = filterByAccount(messages, warung);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-4">
        <div>
          <label htmlFor="pilih-ronde" className="mb-1 block text-sm font-semibold">Ronde</label>
          <select
            id="pilih-ronde"
            className={selectClass}
            value={round.id}
            onChange={(e) => { setRoundChoice(Number(e.target.value)); setWarungChoice(null); }}
          >
            {withParticipants.map((r) => (
              <option key={r.id} value={r.id}>#{r.id} {itemOf(data.items, r.item)?.name ?? r.item}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pilih-warung" className="mb-1 block text-sm font-semibold">Warung</label>
          <select id="pilih-warung" className={selectClass} value={warung ?? ALL} onChange={(e) => setWarungChoice(e.target.value)}>
            <option value={ALL}>Semua warung ({accounts.length})</option>
            {accounts.map((a) => (
              <option key={a} value={a}>{shortAccount(a)} ({ownerName(a)})</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-ink-soft">
          Pesan dibuat otomatis dari data ronde di chain, bukan disimpan di server. Kontrak tidak mencatat jam tiap peristiwa, jadi jam
          pesan diperkirakan di dalam jendela fase yang nyata. Lihat transaksi asli di{" "}
          <Link className="underline" href={`/rounds/${round.id}`}>halaman ronde</Link>.
        </p>
        {error && <ErrorNote message={error} onRetry={refresh} />}
      </div>

      <section aria-label="Percakapan agen" className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border-2 border-ink shadow-[4px_4px_0_0_rgba(42,33,24,0.85)] lg:mx-0">
        <header className="flex items-center gap-3 border-b-2 border-ink bg-ledger px-4 py-3 text-cream">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-kunyit-soft font-display text-lg font-bold text-ink">
            {warung ? shortAccount(warung).slice(-2) : "ALL"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold leading-tight">{warung ? `Agen ${shortAccount(warung)}` : "Semua agen warung"}</h2>
            <p className="truncate text-xs text-cream/80">
              {warung ? `untuk ${ownerName(warung)} · ronde #${round.id}, ${item.name}` : `ronde #${round.id}, ${item.name}`}
            </p>
          </div>
        </header>
        <div className="max-h-[70vh] min-h-80 overflow-y-auto bg-paper-deep/70 p-3 sm:p-4" tabIndex={0}>
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">Belum ada pesan untuk pilihan ini.</p>
          ) : (
            <Thread messages={shown} showSender={warung === null} />
          )}
        </div>
        <footer className="border-t-2 border-ink bg-cream px-4 py-2 text-xs text-ink-soft">
          Hanya baca. Agen bertindak dalam batas kebijakan yang Anda atur di kontrak.
        </footer>
      </section>
    </div>
  );
}
