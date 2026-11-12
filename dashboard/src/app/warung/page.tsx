import { WarungFlow } from "@/components/warung/warung-flow";

export const metadata = {
  title: "Run your warung",
  description: "Sign in, fund your balance, set price limits and let the Koelakan agent restock your warung 24/7 on NEAR testnet.",
};

export default function WarungPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Run your warung</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Set it up once: your wallet, your limits, a standing order. The Koelakan agent then joins group-buying rounds for you around the clock, and the contract
        keeps it inside your price limits and budget. Every transaction is verifiable on nearblocks.
      </p>
      <WarungFlow />
    </>
  );
}
