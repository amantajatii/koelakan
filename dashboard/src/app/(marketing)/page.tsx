import { ControlCard } from "@/components/landing/control-card";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { PriceProof } from "@/components/landing/price-proof";
import { RoundSteps } from "@/components/landing/round-steps";
import { SiteFooter } from "@/components/layout/site-footer";
import { DEFAULT_DEMO_ACCOUNT } from "@/lib/demo";
import { marketSnapshots } from "@/lib/item-summary";
import { buildLandingChat, latestShowcaseRound } from "@/lib/landing-chat";
import { loadOverview } from "@/lib/overview";
import { aggregate, itemOf } from "@/lib/stats";

export const revalidate = 15;
// ISR every 15 s, like /overview (see the note there).
export const dynamic = "force-static";

export default async function LandingPage() {
  const { data } = await loadOverview();
  const showcase = data ? latestShowcaseRound(data.rounds) : null;
  const showcaseItem = data && showcase ? itemOf(data.items, showcase.item) : undefined;
  const chat = showcase && showcaseItem ? buildLandingChat(showcase, showcaseItem, DEFAULT_DEMO_ACCOUNT) : null;
  const agg = data ? aggregate(data.rounds) : null;
  const snapshots = data ? marketSnapshots(data.items, data.rounds) : [];

  return (
    <>
      <LandingNav />
      <main id="content" tabIndex={-1}>
        <LandingHero chat={chat} agg={agg} />
        <RoundSteps chat={chat} />
        <PriceProof snapshots={snapshots} asOf={data?.items[0]?.as_of ?? null} />
        <ControlCard />
      </main>
      <SiteFooter overTabBar={false} />
    </>
  );
}
