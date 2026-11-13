import { ShieldCheck } from "lucide-react";
import { panelClass } from "@/components/ui/panel";
import { TechNote, codeClass } from "@/components/warung/tech-note";
import { config } from "@/lib/config";

export function SecurityNote() {
  return (
    <aside aria-labelledby="security" className={panelClass}>
      <h2 id="security" className="flex items-center gap-3 text-lg font-bold tracking-tight">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><ShieldCheck className="size-5" /></span> What the agent key can and cannot do
      </h2>
      <ul className="mt-3 space-y-3 text-sm text-muted">
        <li>The agent key can only join group buys for you. It cannot withdraw from your balance.</li>
        <li>Only you can withdraw, change your limits or confirm and report deliveries. Your wallet has to approve each of those.</li>
        <li>Your price limits and weekly budget are enforced by the contract, not by the agent. The key can only join rounds, so it cannot buy past those limits.</li>
        <li>You can stop the agent any time. Your standing order is signed with your wallet, not with a password.</li>
        <li>This is a testnet contract and it has not been audited.</li>
      </ul>
      <TechNote className="mt-4">
        <p>
          The agent&apos;s function-call key can only call <code className={codeClass}>join_round</code> on <code className={codeClass}>{config.marketId}</code>. A function-call key cannot attach a deposit, so it cannot move funds.
        </p>
        <p>
          <code className={codeClass}>withdraw</code>, <code className={codeClass}>set_policy</code>, <code className={codeClass}>confirm_delivery</code> and <code className={codeClass}>dispute</code> require 1 yocto, which only a full-access key can attach.
        </p>
        <p>
          Max price, weekly budget and balance are checked inside <code className={codeClass}>join_round</code>, and the round&apos;s ceiling can never exceed the PIHPS reference price stored on-chain.
        </p>
        <p>
          Your standing order is not a transaction. Your wallet signs a NEP-413 message with a single-use nonce, and the agent service verifies it before saving.
        </p>
      </TechNote>
    </aside>
  );
}
