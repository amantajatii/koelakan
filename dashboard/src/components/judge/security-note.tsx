import { ShieldCheck } from "lucide-react";
import { TechNote, codeClass } from "@/components/warung/tech-note";
import { config } from "@/lib/config";

export function SecurityNote() {
  return (
    <aside aria-labelledby="security" className="rounded-card bg-brand-soft p-5 ring-1 ring-inset ring-brand/15 sm:p-6">
      <h2 id="security" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-brand-ink">
        <ShieldCheck className="size-5" aria-hidden /> Why letting the agent shop is safe
      </h2>
      <ul className="mt-3 space-y-3 text-sm text-ink/85">
        <li>The agent can only join group buys for you. It can never take money out of your balance.</li>
        <li>Only you can withdraw, change your limits or confirm and report deliveries. Your wallet has to approve each of those.</li>
        <li>Your price limits and weekly budget are enforced by the contract, not by the agent. Even a hacked agent could only buy what your limits already allow.</li>
        <li>You can stop the agent any time. Your standing order is signed with your wallet, never with a password.</li>
      </ul>
      <TechNote className="mt-4 bg-white/70">
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
