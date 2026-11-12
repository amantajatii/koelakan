import { WarungFlow } from "@/components/warung/warung-flow";

export const metadata = {
  title: "Run your warung",
  description: "Sign in, fund your balance, set price limits and let the Koelakan agent restock your warung 24/7 on NEAR testnet.",
};

export default function WarungPage() {
  return <WarungFlow />;
}
