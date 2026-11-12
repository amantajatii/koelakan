"use client";

import { useCallback, useMemo } from "react";
import { AccountSummary } from "@/components/judge/account-summary";
import { DepositStep } from "@/components/judge/deposit-step";
import { FaucetStep } from "@/components/judge/faucet-step";
import { JoinStep } from "@/components/judge/join-step";
import { LoginStep } from "@/components/judge/login-step";
import { OpenStep } from "@/components/judge/open-step";
import { PolicyStep } from "@/components/judge/policy-step";
import { SecurityNote } from "@/components/judge/security-note";
import type { StepState } from "@/components/judge/step-card";
import { OfflineNote } from "@/components/offline-note";
import { ErrorNote, Skeleton } from "@/components/ui/states";
import { ActivityPanel } from "@/components/warung/activity-panel";
import { DelegateStep } from "@/components/warung/delegate-step";
import { OrderStep } from "@/components/warung/order-step";
import { PendingActions } from "@/components/warung/pending-actions";
import { ServiceCard } from "@/components/warung/service-card";
import { WithdrawPanel } from "@/components/warung/withdraw-panel";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useJudge } from "@/hooks/use-judge";
import { useNow } from "@/hooks/use-now";
import { useWarung } from "@/hooks/use-warung";
import { myParticipations, pendingActions } from "@/lib/owner-actions";
import { computeSteps, isReady, type StepId } from "@/lib/steps";
import { useWallet } from "@/lib/wallet";

export function WarungFlow() {
  const { accountId } = useWallet();
  const data = useJudge(accountId);
  const { status } = useAgentStatus();
  const warung = useWarung(accountId, status?.service_public_key ?? null);
  const { overview, account } = data;
  const now = useNow(0) + data.clockOffsetMs;
  const live = now > data.clockOffsetMs + 1;

  const stepList = useMemo(
    () =>
        computeSteps({
          accountId,
          tidr: account?.tidr ?? null,
          available: account ? BigInt(account.balance.available) : null,
          held: account ? BigInt(account.balance.held) : null,
          policy: account?.policy ?? null,
          delegated: warung.delegated ?? (warung.record?.delegated ?? null),
          demand: warung.record?.demand ?? null,
          apiOnline: status !== null,
        }),
    [accountId, account, warung.delegated, warung.record, status],
  );
  const stateOf = (id: StepId): StepState => stepList.find((s) => s.id === id)?.status ?? "locked";
  const allDone = accountId !== null && isReady(stepList);

  const afterTx = useCallback(() => {
    data.refreshAfterTx();
    warung.refreshAfterTx();
  }, [data, warung]);

  const rounds = overview?.rounds ?? [];
  const pending = accountId && live ? pendingActions(rounds, accountId, now) : [];
  const participations = accountId && live ? myParticipations(rounds, accountId, now) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4 lg:order-1">
        <OfflineNote />
        {data.error && <ErrorNote message={data.error} onRetry={data.refresh} />}
        {allDone && (
          <p role="status" className="rounded-lg border-2 border-pandan bg-pandan-soft/60 p-3 text-sm">
            <strong>You are set.</strong> Your agent now joins every round that fits your policy and standing order. Check back here for results.
          </p>
        )}
        {pending.length > 0 && overview && <PendingActions actions={pending} items={overview.items} nowMs={now} onDone={afterTx} />}
        <LoginStep index="1" />
        {!overview ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <FaucetStep index="2" status={stateOf("faucet")} accountId={accountId} tidr={account?.tidr ?? null} marketAvailable={account ? BigInt(account.balance.available) : null} onDone={afterTx} />
            <DepositStep index="3" status={stateOf("deposit")} accountId={accountId} tidr={account?.tidr ?? null} available={account ? BigInt(account.balance.available) : null} onDone={afterTx} />
            <PolicyStep index="4" status={stateOf("policy")} accountId={accountId} items={overview.items} policy={account?.policy ?? null} onDone={afterTx} />
            <DelegateStep
              index="5"
              status={stateOf("delegate")}
              accountId={accountId}
              servicePublicKey={status?.service_public_key ?? null}
              allowanceNear={status?.service_fc_allowance_near ?? "0.25"}
              delegated={warung.delegated ?? (warung.record?.delegated ?? null)}
              chainError={warung.chainError}
              onDone={afterTx}
            />
            <OrderStep index="6" status={stateOf("order")} accountId={accountId} items={overview.items} record={warung.record} apiOnline={status !== null} onSaved={afterTx} />
            {accountId && (
              <>
                <ActivityPanel actions={warung.record?.last_actions ?? null} apiDown={warung.apiDown || status === null} participations={participations} items={overview.items} />
                <WithdrawPanel available={account ? BigInt(account.balance.available) : 0n} onDone={afterTx} />
              </>
            )}
            <details className="rounded-lg border-2 border-dashed border-rule p-4">
              <summary className="cursor-pointer font-display text-lg font-semibold">Advanced: join or open a round by hand</summary>
              <div className="mt-4 space-y-4">
                <JoinStep accountId={accountId} rounds={overview.rounds} items={overview.items} account={account} clockOffsetMs={data.clockOffsetMs} onDone={afterTx} />
                <OpenStep accountId={accountId} items={overview.items} onDone={afterTx} />
              </div>
            </details>
          </>
        )}
      </div>
      <div className="space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
        <AccountSummary accountId={accountId} account={account} items={overview?.items ?? []} loading={data.loading} />
        <ServiceCard />
        <SecurityNote />
      </div>
    </div>
  );
}
