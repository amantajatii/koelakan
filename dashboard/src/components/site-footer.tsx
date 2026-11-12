import { StatusBadge } from "@/components/status-badge";
import { accountUrl, config } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-paper-deep/70">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-6 text-sm text-ink-soft sm:px-6 md:grid-cols-2">
        <p>
          Koelakan runs on <strong className="text-ink">NEAR testnet</strong>. tIDR is test rupiah, not real money. Reference
          prices come from PIHPS (national food price monitor); costs of the service&apos;s own grosirs are assumptions.
        </p>
        <div className="md:col-span-2"><StatusBadge /></div>
        <p className="md:col-span-2">
          Contracts:{" "}
          <a className="num underline decoration-rule underline-offset-4 hover:text-ink" href={accountUrl(config.marketId)} target="_blank" rel="noreferrer">
            {config.marketId}
          </a>
          {" · "}
          <a className="num underline decoration-rule underline-offset-4 hover:text-ink" href={accountUrl(config.tidrId)} target="_blank" rel="noreferrer">
            {config.tidrId}
          </a>
        </p>
      </div>
    </footer>
  );
}
