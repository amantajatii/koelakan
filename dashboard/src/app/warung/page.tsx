import { Suspense } from "react";
import { WarungFlow } from "@/components/warung/warung-flow";
import { Skeleton } from "@/components/ui/states";

export const metadata = {
  title: "Run your warung",
  description: "Add test money, set your limits and let the Koelakan agent restock your warung around the clock on NEAR testnet. Or look at a live demo warung without a wallet.",
};

export default function WarungPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72" />}>
      <WarungFlow />
    </Suspense>
  );
}
