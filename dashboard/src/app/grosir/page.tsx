import Link from "next/link";
import { GrosirTable } from "@/components/grosir-table";
import { Panel, SectionTitle } from "@/components/ui/panel";
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

const TERMS = [
  ["Sealed bid", "You submit a hash of your unit price, so nobody sees it until the reveal phase. The lowest valid revealed price wins the whole round."],
  ["5% bond", "With the commit you lock a bond of 5% of the round's maximum value in tIDR. It protects buyers from bidders that vanish."],
  ["Forfeited if not revealed", "Skip the reveal and the bond is split among the buying warungs. There is no way to withdraw a bid quietly."],
  ["Paid on delivery", "Buyers' payments sit in escrow. Each one is released when that owner confirms delivery, or automatically when the delivery window ends without a dispute."],
] as const;

function Code({ children, label }: { children: string; label: string }) {
  return (
    <pre aria-label={label} className="num overflow-x-auto rounded-md border-2 border-ink bg-ink p-3 text-xs leading-relaxed text-cream"><code>{children}</code></pre>
  );
}

export default function GrosirPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">For wholesalers</h1>
      <p className="mb-8 mt-2 max-w-2xl text-ink-soft">
        A grosir (wholesaler) sells to many warungs at once. On Koelakan the warungs pool their demand into one round, and you win it by bidding the lowest price. One round, one big order, one delivery run.
      </p>

      <section aria-labelledby="role" className="mb-10">
        <SectionTitle><span id="role">How a grosir wins a round</span></SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TERMS.map(([title, body]) => (
            <li key={title} className="rounded-lg border-2 border-ink/80 bg-cream p-4">
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="live" className="mb-10">
        <SectionTitle><span id="live">Grosir agents running now</span></SectionTitle>
        <GrosirTable />
        <p className="mt-2 text-xs text-ink-soft">
          These are the service&apos;s own test grosirs. Their costs are assumptions (0.85 to 0.97 times HET, the government ceiling price), not real wholesale prices. Real grosirs bid their real costs.
        </p>
      </section>

      <section aria-labelledby="run" className="mb-10">
        <SectionTitle><span id="run">Run your own grosir agent</span></SectionTitle>
        <Panel className="space-y-5">
          <aside className="rounded-md border-2 border-kunyit bg-kunyit-soft/60 p-3 text-sm">
            <strong>Why you run it yourself.</strong> Committing a bond moves tIDR out of your own wallet, which needs a full-access key (RULES section 4). A restricted function-call key cannot attach that deposit, and we will never ask you to hand a full-access key to a service. Your key stays on your machine.
          </aside>
          <ol className="space-y-5 text-sm">
            <li>
              <p className="font-semibold">1. Create a testnet account and get tIDR.</p>
              <p className="mt-1 text-ink-soft">Fund it with a little NEAR for gas, then call the tIDR faucet for the bond. Keep tIDR in the wallet, not in the market balance.</p>
            </li>
            <li>
              <p className="font-semibold">2. Write your price list.</p>
              <p className="mb-2 mt-1 text-ink-soft"><code className="num">cost</code> is your cost per unit in tIDR; <code className="num">margin_bps</code> is your margin in basis points (500 = 5%). Your bid is cost plus margin, and the agent never bids above a round&apos;s maximum price.</p>
              <Code label="Example pricing file">{PRICING_EXAMPLE}</Code>
            </li>
            <li>
              <p className="font-semibold">3. Start the agent.</p>
              <div className="mt-2"><Code label="Run with pnpm">{RUN_NATIVE}</Code></div>
              <p className="mb-2 mt-3 text-ink-soft">Or with Docker:</p>
              <Code label="Run with docker">{RUN_DOCKER}</Code>
            </li>
            <li>
              <p className="font-semibold">4. Watch it work.</p>
              <p className="mt-1 text-ink-soft">The agent commits and reveals on every open round for items you priced. Follow rounds on the <Link className="underline underline-offset-4" href="/rounds">rounds page</Link>, and withdraw your earnings from the market balance once buyers confirm delivery.</p>
            </li>
          </ol>
          <p className="text-sm">
            Full options (<code className="num">MIN_BID</code>, <code className="num">MAX_BOND</code>, salts, keys) are in{" "}
            <a className="font-semibold underline underline-offset-4 hover:text-chili" href={AGENTS_README_URL} target="_blank" rel="noreferrer">agents/README.md</a>, section &quot;Run your own grosir agent&quot;.
          </p>
        </Panel>
      </section>
    </>
  );
}
