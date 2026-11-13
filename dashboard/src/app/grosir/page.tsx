import Link from "next/link";
import { Coins, EyeOff, PackageCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import { GrosirTable } from "@/components/grosir-table";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { AGENTS_README_URL } from "@/lib/config";

export const metadata = {
  title: "For wholesalers (grosir)",
  description: "How grosir (wholesaler) agents win pooled warung orders on Koelakan with sealed bids, and how to run your own agent.",
};

const PRICING_EXAMPLE = `{
  "beras-medium": { "cost": 12000, "margin_bps": 500 },
  "gula-pasir":   { "cost": 15500, "margin_bps": 400 }
}`;

const RUN_NATIVE = `git clone https://github.com/amantajatii/koelakan && cd koelakan/agents
pnpm install
export ACCOUNT_ID=your-grosir.testnet
export PRIVATE_KEY=ed25519:...        # full-access key of that account
export PRICING_FILE=./pricing.json
pnpm grosir`;

const RUN_DOCKER = `git clone https://github.com/amantajatii/koelakan && cd koelakan
docker build -f agents/deploy/Dockerfile -t koelakan-agent .
docker run -d --name my-grosir --restart unless-stopped \\
  -e ACCOUNT_ID=your-grosir.testnet \\
  -e PRIVATE_KEY=ed25519:... \\
  -e PRICING_FILE=/pricing/pricing.json \\
  -v "$PWD/pricing.json:/pricing/pricing.json:ro" \\
  -v my-grosir-data:/data \\
  koelakan-agent node dist/agents/src/cli/grosir.js`;

const TERMS: readonly (readonly [string, string, LucideIcon, string])[] = [
  ["Sealed bid", "You submit a hash of your unit price, so nobody sees it until the reveal phase. The lowest valid revealed price wins the whole round.", EyeOff, "bg-info-soft text-info"],
  ["5% bond", "With the commit you lock a bond of 5% of the round's maximum value in tIDR. It protects buyers from bidders that vanish.", Coins, "bg-eggs text-eggs-ink"],
  ["Forfeited if not revealed", "Skip the reveal and the bond is split among the buying warungs. There is no way to withdraw a bid quietly.", TriangleAlert, "bg-sugar text-sugar-ink"],
  ["Paid on delivery", "Buyers' payments sit in escrow. Each one is released when that owner confirms delivery, or automatically when the delivery window ends without a dispute.", PackageCheck, "bg-brand-soft text-brand-ink"],
];

function Code({ children, label }: { children: string; label: string }) {
  return (
    <pre aria-label={label} className="max-w-full whitespace-pre-wrap break-words rounded-2xl bg-night p-4 font-mono text-xs leading-relaxed text-white/90 sm:p-5"><code>{children}</code></pre>
  );
}

const STEP_BADGE = "flex size-7 shrink-0 items-center justify-center rounded-full bg-night text-sm font-bold text-white";

export default function GrosirPage() {
  return (
    <>
      <PageHeader title="For wholesalers">
        A grosir (wholesaler) sells to many warungs at once. On Koelakan the warungs pool their demand into one round, and you win it by bidding the lowest price. One round, one big order, one delivery run.
      </PageHeader>

      <div className="min-w-0 space-y-6">
        <Panel aria-labelledby="role" className="min-w-0">
          <SectionTitle><span id="role">How a grosir wins a round</span></SectionTitle>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {TERMS.map(([title, body, Icon, tint]) => (
              <div key={title} className="flex min-w-0 gap-4">
                <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}><Icon className="size-5" /></span>
                <div className="min-w-0">
                  <dt className="font-bold">{title}</dt>
                  <dd className="mt-1 text-sm text-muted">{body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel aria-labelledby="live" className="min-w-0">
          <SectionTitle><span id="live">Grosir agents running now</span></SectionTitle>
          <GrosirTable />
          <p className="mt-4 text-xs text-muted">
            These are the service&apos;s own test grosirs. Their costs are assumptions (0.85 to 0.97 times HET, the government ceiling price), not real wholesale prices. A real grosir would set its own costs in pricing.json.
          </p>
        </Panel>

        <Panel aria-labelledby="run" className="min-w-0 space-y-6">
          <SectionTitle className="mb-0"><span id="run">Run your own grosir agent</span></SectionTitle>
          <aside className="rounded-2xl bg-warn-soft p-4 text-sm">
            <strong className="font-semibold">Why you run it yourself.</strong> Committing a bond moves tIDR out of your own wallet, which needs a full-access key (RULES section 4). A restricted function-call key cannot attach that deposit, and we will never ask you to hand a full-access key to a service. Your key stays on your machine.
          </aside>
          <ol className="min-w-0 space-y-6 text-sm">
            <li className="flex min-w-0 gap-4">
              <span aria-hidden className={STEP_BADGE}>1</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Create a testnet account and get tIDR.</p>
                <p className="mt-1 text-muted">Fund it with a little NEAR for gas, then call the tIDR faucet for the bond. Keep tIDR in the wallet, not in the market balance.</p>
              </div>
            </li>
            <li className="flex min-w-0 gap-4">
              <span aria-hidden className={STEP_BADGE}>2</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Write your price list.</p>
                <p className="mb-3 mt-1 text-muted"><code className="rounded bg-ground px-1.5 py-0.5 font-mono text-xs text-ink">cost</code> is your cost per unit in tIDR; <code className="rounded bg-ground px-1.5 py-0.5 font-mono text-xs text-ink">margin_bps</code> is your margin in basis points (500 = 5%). Your bid is cost plus margin, and the agent never bids above a round&apos;s maximum price.</p>
                <Code label="Example pricing file">{PRICING_EXAMPLE}</Code>
              </div>
            </li>
            <li className="flex min-w-0 gap-4">
              <span aria-hidden className={STEP_BADGE}>3</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Start the agent.</p>
                <div className="mt-3"><Code label="Run with pnpm">{RUN_NATIVE}</Code></div>
                <p className="mb-3 mt-4 text-muted">Or with Docker:</p>
                <Code label="Run with docker">{RUN_DOCKER}</Code>
              </div>
            </li>
            <li className="flex min-w-0 gap-4">
              <span aria-hidden className={STEP_BADGE}>4</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Watch it work.</p>
                <p className="mt-1 text-muted">The agent commits and reveals on every open round for items you priced. Follow rounds on the <Link className={linkClass} href="/rounds">rounds page</Link>, and withdraw your earnings from the market balance once buyers confirm delivery.</p>
              </div>
            </li>
          </ol>
          <p className="border-t border-line pt-4 text-sm text-muted">
            Full options (<code className="font-mono text-xs text-ink">MIN_BID</code>, <code className="font-mono text-xs text-ink">MAX_BOND</code>, salts, keys) are in{" "}
            <a className={linkClass} href={AGENTS_README_URL} target="_blank" rel="noreferrer">agents/README.md</a>, section &quot;Run your own grosir agent&quot;.
          </p>
        </Panel>
      </div>
    </>
  );
}
