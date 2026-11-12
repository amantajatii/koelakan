import { config } from "@/lib/config";

export function SecurityNote() {
  return (
    <aside aria-labelledby="security" className="rounded-lg border-2 border-pandan bg-pandan-soft/50 p-4 text-sm">
      <h2 id="security" className="font-display text-xl font-semibold text-pandan">Why delegating is safe</h2>
      <ul className="mt-2 space-y-2">
        <li>
          The agent&apos;s key can only call <code className="num">join_round</code> on <code className="num">{config.marketId}</code>.
          A function-call key cannot attach a deposit, so it can never move money out.
        </li>
        <li>
          <code className="num">withdraw</code>, <code className="num">set_policy</code>, <code className="num">confirm_delivery</code> and{" "}
          <code className="num">dispute</code> require 1 yocto, so only your own full-access key works. You stay in control.
        </li>
        <li>
          The contract enforces your limits, not the agent: max price, weekly budget and balance are checked inside <code className="num">join_round</code>.
          Even a compromised agent can only join rounds your policy already allows.
        </li>
        <li>Revoke the key any time. Your standing order is signed with your wallet, never with a password.</li>
      </ul>
    </aside>
  );
}
