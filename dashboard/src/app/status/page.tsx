import { StatusView } from "@/components/status-view";

export const metadata = {
  title: "Service status",
  description: "Live status of the Koelakan 24/7 agent service: round cadence, active rounds, budget and recent events.",
};

export default function StatusPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Service status</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        The Koelakan agent service opens rounds on a schedule and runs the seeded grosir agents. This page shows what it is doing right now. Round data itself always comes straight from the chain.
      </p>
      <StatusView />
    </>
  );
}
