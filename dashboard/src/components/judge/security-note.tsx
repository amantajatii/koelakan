import { config } from "@/lib/config";

export function SecurityNote() {
  return (
    <aside aria-labelledby="security" className="rounded-lg border-2 border-pandan bg-pandan-soft/50 p-4 text-sm">
      <h2 id="security" className="font-display text-xl font-semibold text-pandan">Why this key is safe</h2>
      <ul className="mt-2 space-y-2">
        <li>
          The key the wallet creates can only call <code className="num">join_round</code> on <code className="num">{config.marketId}</code>.
          A function-call key cannot attach a deposit.
        </li>
        <li>
          <code className="num">withdraw</code>, <code className="num">set_policy</code>, <code className="num">confirm_delivery</code> and{" "}
          <code className="num">dispute</code> require 1 yocto, so only your full-access key is valid. The restricted key cannot move funds.
        </li>
        <li>
          The contract rejects, not the agent: the round max price, weekly budget and balance are checked inside <code className="num">join_round</code>.
          A leaked key can at worst join rounds your policy already allows.
        </li>
      </ul>
    </aside>
  );
}
