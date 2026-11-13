import { Gavel, Lock, PackageCheck, Users, type LucideIcon } from "lucide-react";
import type { LandingChat } from "@/lib/landing-chat";

interface Step {
  phase: string;
  /** Real phase length on the running service (RULES.md cadence). */
  duration: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Which chat beat illustrates the step, if the round has it. */
  beat: number;
}

const STEPS: readonly Step[] = [
  { phase: "Join", duration: "5 min", icon: Users, title: "Warungs pool their orders", beat: 1,
    body: "Each warung's agent adds its owner's quantity to the round, inside the owner's max price and weekly budget. Small orders become one wholesale lot." },
  { phase: "Sealed bids", duration: "90 s", icon: Lock, title: "Grosirs bid without seeing each other", beat: 2,
    body: "Every grosir commits a hidden price with a 5% bond, so nobody can copy a rival or undercut at the last second." },
  { phase: "Reveal", duration: "90 s", icon: Gavel, title: "The lowest price wins, for everyone", beat: 3,
    body: "Bids open, the lowest valid price wins, and every warung in the round pays it. The gap to the max price goes back to their balances." },
  { phase: "Delivery", duration: "10 min", icon: PackageCheck, title: "Money moves when the goods arrive", beat: 4,
    body: "The contract holds the money until the owner confirms, or the window closes without a dispute. A grosir that never reveals loses its bond to the buyers." },
];

function quote(chat: LandingChat | null, i: number): string | null {
  const beat = chat?.beats[i];
  if (!beat) return null;
  return beat.kind === "result" ? `Winning bid: ${beat.percentBelow.toFixed(1)}% below PIHPS.` : beat.text;
}

/** The round in its real durations, each step paired with what the agent told the owner at that moment. */
export function RoundSteps({ chat }: { chat: LandingChat | null }) {
  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto w-full max-w-[84rem] scroll-mt-6 px-4 py-16 sm:px-8 lg:py-24">
      <div className="max-w-2xl">
        <h2 id="how-title" className="text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.6rem] sm:leading-[1.1]">One round takes about twenty minutes.</h2>
        <p className="mt-4 text-lg text-muted">A new round opens every hour. This is what happens inside one, and what the agent says while it does.</p>
      </div>
      <ol className="mt-12 grid gap-x-10 lg:grid-cols-2">
        {STEPS.map((s, i) => {
          const said = quote(chat, s.beat);
          const Icon = s.icon;
          return (
            <li key={s.phase} className="relative flex gap-5 pb-10 last:pb-0 lg:[&:nth-last-child(2)]:pb-0">
              <div className="flex flex-col items-center">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-night text-brand">
                  <Icon aria-hidden className="size-5" />
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="mt-2 w-px flex-1 bg-line-strong lg:hidden" />}
              </div>
              <div className="min-w-0 pt-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {s.phase}
                  <span className="num rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted shadow-card">{s.duration}</span>
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.015em]">{s.title}</h3>
                <p className="mt-2 max-w-[34rem] text-muted">{s.body}</p>
                {said && (
                  <p className="mt-4 inline-block max-w-[30rem] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-sm shadow-card">
                    <span className="sr-only">The agent said: </span>{said}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
