import { StatusView } from "@/components/status-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Service status",
  description: "Live status of the Koelakan 24/7 agent service: round cadence, active rounds, budget and recent events.",
};

export default function StatusPage() {
  return (
    <>
      <PageHeader title="Service status">
        The Koelakan agent service opens rounds on a schedule and runs the seeded grosir agents. This page shows what it is doing right now. Round data itself always comes straight from the chain.
      </PageHeader>
      <StatusView />
    </>
  );
}
