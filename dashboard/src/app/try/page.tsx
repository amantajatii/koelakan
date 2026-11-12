import { JudgeFlow } from "@/components/judge/judge-flow";

export const metadata = { title: "Try it yourself | Koelakan" };

export default function TryPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Try it yourself</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Be a warung owner on testnet. Six steps from signing in to joining a round, with every transaction verifiable on nearblocks.
      </p>
      <JudgeFlow />
    </>
  );
}
