import { accountUrl, config } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[84rem] px-4 pb-28 pt-4 text-xs text-muted sm:px-8 lg:pb-10">
      <div className="space-y-1.5 border-t border-line pt-5">
        <p className="max-w-3xl">
          Koelakan runs on <strong className="font-semibold text-ink">NEAR testnet</strong>. tIDR is test rupiah, not real money. Reference prices come from PIHPS (national food price monitor); costs of the service&apos;s own grosirs are assumptions.
        </p>
        <p>
          Contracts:{" "}
          <a className="num font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink" href={accountUrl(config.marketId)} target="_blank" rel="noreferrer">{config.marketId}</a>
          {" · "}
          <a className="num font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink" href={accountUrl(config.tidrId)} target="_blank" rel="noreferrer">{config.tidrId}</a>
        </p>
      </div>
    </footer>
  );
}
