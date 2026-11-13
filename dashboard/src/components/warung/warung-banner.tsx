import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Eye, LogIn } from "lucide-react";
import { HeroBanner } from "@/components/warung/hero-banner";
import { Button, buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { demoHref } from "@/lib/demo";
import { ownerName, rupiah, shortAccount } from "@/lib/format";
import type { StepId } from "@/lib/steps";

const NEXT_ACTION_LABEL: Record<StepId, string> = {
  signin: "Sign in",
  funds: "Add test money",
  limits: "Set your limits",
  order: "Choose what to buy",
};

const ghostOnBrand = buttonClass("ghost", "bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white");

interface Props {
  /** Validated demo account, or null for the signed-in owner. */
  demo: string | null;
  accountId: string | null;
  week: { saving: bigint; rounds: number };
  /** True while the chain overview has not loaded yet. */
  loading: boolean;
  allDone: boolean;
  next: StepId | null;
  ready: boolean;
  signIn: () => void;
}

function BannerLine({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading ? <Skeleton className="h-12 max-w-md bg-white/15" /> : <p>{children}</p>;
}

/** The page's hero: demo, signed-in or signed-out copy and the matching call to action. */
export function WarungBanner({ demo, accountId, week, loading, allDone, next, ready, signIn }: Props) {
  const savedLine = (who: string): string => (week.rounds > 0 ? `${who} saved ${rupiah(week.saving)} test rupiah this week.` : "");
  if (demo !== null) {
    return (
      <HeroBanner
        title={week.rounds > 0 ? savedLine(`${ownerName(demo)}'s warung`) : `${ownerName(demo)}'s demo warung.`}
        actions={
          <>
            <Button variant="onBrand" onClick={signIn} disabled={!ready} busy={!ready} className="gap-2 px-5"><LogIn className="size-4" aria-hidden /> Sign in to run your own</Button>
            <Link href="/#how-it-works" className={ghostOnBrand}>How it works</Link>
          </>
        }
      >
        <BannerLine loading={loading}>
          {week.rounds > 0
            ? <>Against the PIHPS market price, across {week.rounds} {week.rounds === 1 ? "round" : "rounds"} this agent bought in. Everything below is read from the testnet blockchain. The demo warung is seeded.</>
            : <>This agent shops for the warung on its own inside the owner&apos;s limits. Once a round settles, the saving against the PIHPS market price shows up here.</>}
        </BannerLine>
      </HeroBanner>
    );
  }
  if (accountId) {
    return (
      <HeroBanner
        title={week.rounds > 0 ? `You saved ${rupiah(week.saving)} test rupiah this week.` : `Welcome back, ${shortAccount(accountId)}.`}
        actions={
          allDone ? (
            <a href="#standing-order" className={buttonClass("onBrand", "gap-2 px-5")}>Edit standing order</a>
          ) : (
            <a href={next ? `#step-${next}` : "#setup"} className={buttonClass("onBrand", "gap-2 px-5")}>
              {next ? NEXT_ACTION_LABEL[next] : "Continue setup"} <ArrowRight className="size-4" aria-hidden />
            </a>
          )
        }
      >
        <BannerLine loading={loading}>
          {week.rounds > 0
            ? <>Against the PIHPS market price, across {week.rounds} {week.rounds === 1 ? "round" : "rounds"} your agent bought in.</>
            : allDone
              ? <>You are set. Your agent joins every round that fits your limits and standing order. Once a round settles, your saving against the PIHPS market price shows up here.</>
              : <>Finish the steps below and your agent starts buying with you. Your saving against the PIHPS market price shows up here after your first settled round.</>}
        </BannerLine>
      </HeroBanner>
    );
  }
  return (
    <HeroBanner
      title="Run your warung."
      actions={
        <>
          <Button variant="onBrand" onClick={signIn} disabled={!ready} busy={!ready} className="gap-2 px-5"><LogIn className="size-4" aria-hidden /> Sign in with a NEAR wallet</Button>
          <Link href={demoHref()} className={`${ghostOnBrand} gap-2`}><Eye className="size-4" aria-hidden /> See a warung in action</Link>
        </>
      }
    >
      <p>
        Set up once: add test money, set your limits, choose what to buy. Then the Koelakan agent joins group buys for you around the clock, and the contract keeps it inside your limits. No wallet yet? Look at a live demo warung first.
      </p>
    </HeroBanner>
  );
}
