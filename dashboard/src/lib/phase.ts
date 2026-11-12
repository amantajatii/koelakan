import { nsToMs } from "./json";
import type { Phase, RoundView } from "./types";

const NS_PER_MS = 1_000_000n;

type Deadlines = Pick<
  RoundView,
  "state" | "total_qty" | "min_total_qty" | "join_deadline" | "commit_deadline" | "reveal_deadline" | "delivery_deadline"
>;

/** Mirror of `phase_of` in contracts/market/src/lib.rs (RULES §5), evaluated at `nowMs`. */
export function derivePhase(round: Deadlines, nowMs: number): Phase {
  const now = BigInt(Math.floor(nowMs)) * NS_PER_MS;
  switch (round.state) {
    case "Failed":
      return "Failed";
    case "Closed":
      return "Closed";
    case "Settled":
      return now < BigInt(round.delivery_deadline) ? "Delivery" : "AwaitingFinalize";
    case "Active":
      if (now < BigInt(round.join_deadline)) return "Join";
      if (round.total_qty < round.min_total_qty || now >= BigInt(round.reveal_deadline)) return "ReadyToSettle";
      if (now < BigInt(round.commit_deadline)) return "Commit";
      return "Reveal";
  }
}

export const PHASE_LABEL: Record<Phase, string> = {
  Join: "Pendaftaran",
  Commit: "Tawaran tersegel",
  Reveal: "Buka tawaran",
  ReadyToSettle: "Siap diselesaikan",
  Delivery: "Pengiriman",
  AwaitingFinalize: "Menunggu finalisasi",
  Failed: "Gagal",
  Closed: "Selesai",
};

export const PHASE_HINT: Record<Phase, string> = {
  Join: "Warung boleh ikut dan mengunci saldo.",
  Commit: "Grosir mengirim hash tawaran dan jaminan.",
  Reveal: "Grosir membuka harga tawarannya.",
  ReadyToSettle: "Siapa saja boleh memanggil settle.",
  Delivery: "Barang dikirim, pembeli konfirmasi terima.",
  AwaitingFinalize: "Siapa saja boleh memanggil finalize.",
  Failed: "Semua dana dikembalikan.",
  Closed: "Pembayaran sudah diteruskan ke grosir.",
};

/** A phase is "live" while the clock can still change what actions are possible. */
export const isActivePhase = (p: Phase): boolean => p === "Join" || p === "Commit" || p === "Reveal";

export type StepStatus = "done" | "current" | "upcoming" | "skipped";

export interface TimelineStep {
  key: "join" | "commit" | "reveal" | "settle" | "delivery";
  label: string;
  deadlineMs: number;
  status: StepStatus;
}

/** Phase timeline for the round detail page. */
export function buildTimeline(round: RoundView, nowMs: number): TimelineStep[] {
  const phase = derivePhase(round, nowMs);
  const failedEarly = round.state === "Failed";
  const order: Phase[] = ["Join", "Commit", "Reveal", "ReadyToSettle", "Delivery"];
  const idx = (p: Phase): number => {
    if (p === "AwaitingFinalize" || p === "Closed") return 5;
    if (p === "Failed") return 3;
    return order.indexOf(p);
  };
  const current = idx(phase);
  const steps: Array<Omit<TimelineStep, "status"> & { at: number }> = [
    { key: "join", label: "Pendaftaran warung", deadlineMs: nsToMs(round.join_deadline), at: 0 },
    { key: "commit", label: "Tawaran tersegel", deadlineMs: nsToMs(round.commit_deadline), at: 1 },
    { key: "reveal", label: "Buka tawaran", deadlineMs: nsToMs(round.reveal_deadline), at: 2 },
    { key: "settle", label: "Penentuan pemenang", deadlineMs: nsToMs(round.reveal_deadline), at: 3 },
    { key: "delivery", label: "Pengiriman dan konfirmasi", deadlineMs: nsToMs(round.delivery_deadline), at: 4 },
  ];
  return steps.map(({ at, ...step }) => {
    let status: StepStatus = at < current ? "done" : at === current ? "current" : "upcoming";
    if (failedEarly && at > 3) status = "skipped";
    if (failedEarly && at === 3) status = "done";
    if (phase === "Closed" && at === 4) status = "done";
    return { ...step, status };
  });
}

/** The deadline that ends the current live phase, or null once nothing is counting down. */
export function currentDeadlineMs(round: RoundView, nowMs: number): number | null {
  switch (derivePhase(round, nowMs)) {
    case "Join":
      return nsToMs(round.join_deadline);
    case "Commit":
      return nsToMs(round.commit_deadline);
    case "Reveal":
      return nsToMs(round.reveal_deadline);
    case "Delivery":
      return nsToMs(round.delivery_deadline);
    default:
      return null;
  }
}
