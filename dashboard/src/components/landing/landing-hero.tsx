import Link from "next/link";
import { Eye } from "lucide-react";
import { PhoneChat } from "@/components/landing/phone-chat";
import { buttonClass } from "@/components/ui/button";
import { demoHref } from "@/lib/demo";
import { percent } from "@/lib/format";
import type { LandingChat } from "@/lib/landing-chat";
import type { Aggregate } from "@/lib/stats";

/** First viewport: the promise and its two actions on the left, the round replaying in the phone on the right. */
export function LandingHero({ chat, agg }: { chat: LandingChat | null; agg: Aggregate | null }) {
  return (
    <section className="mx-auto grid w-full max-w-[84rem] items-center gap-10 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12 lg:pb-24 xl:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] xl:gap-20">
      <div className="max-w-[44rem]">
        <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl xl:text-[4.75rem]">
          Warungs pool orders. Grosirs bid for them.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">
          Your agent joins a shared restock round with other neighbourhood shops. Grosirs bid in a sealed auction, and a NEAR contract holds the money and checks your limits on every join.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/warung" className={buttonClass("primary", "min-h-12 px-6 text-base")}>Set up my warung</Link>
          <Link href={demoHref()} className={buttonClass("secondary", "min-h-12 px-6 text-base")}>
            <Eye aria-hidden className="size-4" />
            See a warung in action
          </Link>
        </div>
        {agg && agg.settledRounds > 0 && (
          <p className="mt-8 flex max-w-[34rem] items-start gap-2.5 text-sm text-muted">
            <span aria-hidden className="live-dot mt-1.5 size-2 shrink-0 rounded-full bg-brand-ink" />
            <span>
              <strong className="num font-bold text-ink">{agg.settledRounds} settled testnet rounds</strong> so far, cleared{" "}
              <strong className="num font-bold text-brand-ink">{percent(agg.avgPercentBelow)} below the PIHPS price</strong> on average. Grosir costs are simulated and the money is test rupiah.
            </span>
          </p>
        )}
      </div>
      <PhoneChat chat={chat} className="h-[34rem] sm:h-[38rem] lg:h-[40rem]" />
    </section>
  );
}
