"use client";

import { AccountSummary } from "@/components/judge/account-summary";
import { DepositStep } from "@/components/judge/deposit-step";
import { FaucetStep } from "@/components/judge/faucet-step";
import { JoinStep } from "@/components/judge/join-step";
import { LoginStep } from "@/components/judge/login-step";
import { OpenStep } from "@/components/judge/open-step";
import { PolicyStep } from "@/components/judge/policy-step";
import { SecurityNote } from "@/components/judge/security-note";
import { ErrorNote, Skeleton } from "@/components/ui/states";
import { useJudge } from "@/hooks/use-judge";
import { useWallet } from "@/lib/wallet";

export function JudgeFlow() {
  const { accountId } = useWallet();
  const data = useJudge(accountId);
  const { overview, account } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4 lg:order-1">
        {data.error && <ErrorNote message={data.error} onRetry={data.refresh} />}
        <LoginStep />
        {!overview ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <FaucetStep accountId={accountId} tidr={account?.tidr ?? null} marketAvailable={account ? BigInt(account.balance.available) : null} onDone={data.refreshAfterTx} />
            <DepositStep accountId={accountId} tidr={account?.tidr ?? null} available={account ? BigInt(account.balance.available) : null} onDone={data.refreshAfterTx} />
            <PolicyStep accountId={accountId} items={overview.items} policy={account?.policy ?? null} onDone={data.refreshAfterTx} />
            <JoinStep accountId={accountId} rounds={overview.rounds} items={overview.items} account={account} clockOffsetMs={data.clockOffsetMs} onDone={data.refreshAfterTx} />
            <OpenStep accountId={accountId} items={overview.items} onDone={data.refreshAfterTx} />
          </>
        )}
      </div>
      <div className="space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
        <AccountSummary accountId={accountId} account={account} items={overview?.items ?? []} loading={data.loading} />
        <SecurityNote />
      </div>
    </div>
  );
}
