import { ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";

const code = "font-mono text-xs text-ink";

export function SecurityNote() {
  return (
    <aside aria-labelledby="security" className="rounded-card bg-brand-soft p-5 ring-1 ring-inset ring-brand/15 sm:p-6">
      <h2 id="security" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-brand-ink">
        <ShieldCheck className="size-5" aria-hidden /> Why delegating is safe
      </h2>
      <ul className="mt-3 space-y-3 text-sm text-ink/85">
        <li>
          The agent&apos;s key can only call <code className={code}>join_round</code> on <code className={code}>{config.marketId}</code>.
          A function-call key cannot attach a deposit, so it can never move money out.
        </li>
        <li>
          <code className={code}>withdraw</code>, <code className={code}>set_policy</code>, <code className={code}>confirm_delivery</code> and{" "}
          <code className={code}>dispute</code> require 1 yocto, so only your own full-access key works. You stay in control.
        </li>
        <li>
          The contract enforces your limits, not the agent: max price, weekly budget and balance are checked inside <code className={code}>join_round</code>.
          Even a compromised agent can only join rounds your policy already allows.
        </li>
        <li>Revoke the key any time. Your standing order is signed with your wallet, never with a password.</li>
      </ul>
    </aside>
  );
}
