"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { AccountSummary } from "@/components/judge/account-summary";
import { JoinStep } from "@/components/judge/join-step";
import { OpenStep } from "@/components/judge/open-step";
import { SecurityNote } from "@/components/judge/security-note";
import { ItemCard } from "@/components/warung/item-card";
import { OfflineNote } from "@/components/shared/offline-note";
import { ServicePulse } from "@/components/warung/service-pulse";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/components/ui/cn";
import { SectionTitle, panelClass } from "@/components/ui/panel";
import { ErrorNote, LoadingRegion, Skeleton } from "@/components/ui/states";
import { ActivityPanel } from "@/components/warung/activity-panel";
import { AgentFeed } from "@/components/warung/agent-feed";
import { PendingActions } from "@/components/warung/pending-actions";
import { SetupComplete } from "@/components/warung/setup-complete";
import { SetupStepper } from "@/components/warung/setup-stepper";
import { StandingOrderCard } from "@/components/warung/standing-order-card";
import { WarungBanner } from "@/components/warung/warung-banner";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useJudge } from "@/hooks/use-judge";
import { useNow } from "@/hooks/use-now";
import { useWarung } from "@/hooks/use-warung";
import { latestAgentMessages } from "@/lib/agent-feed";
import { parseDemoParam } from "@/lib/demo";
import { ownerName } from "@/lib/format";
import { ownerSnapshots, weeklySaving } from "@/lib/item-summary";
import { myParticipations, pendingActions } from "@/lib/owner-actions";
import { computeSteps, isReady, nextStep } from "@/lib/steps";
import { useWallet } from "@/lib/wallet";

export function WarungFlow() {
  const { accountId: walletAccount, ready, signIn } = useWallet();
  const params = useSearchParams();
  const demo = parseDemoParam(params.get("demo"));
  const readOnly = demo !== null;
  const accountId = demo ?? walletAccount;

  const data = useJudge(accountId);
  const { status } = useAgentStatus();
  const warung = useWarung(accountId, status?.service_public_key ?? null);
  const { overview, account } = data;
  const now = useNow(0) + data.clockOffsetMs;
  const live = now > data.clockOffsetMs + 1;

  const delegated = warung.delegated ?? (warung.record?.delegated ?? null);
  const stepList = useMemo(
    () =>
      computeSteps({
        accountId,
        tidr: account?.tidr ?? null,
        available: account ? BigInt(account.balance.available) : null,
        held: account ? BigInt(account.balance.held) : null,
        policy: account?.policy ?? null,
        delegated,
        demand: warung.record?.demand ?? null,
        apiOnline: status !== null,
      }),
    [accountId, account, delegated, warung.record, status],
  );
  const loaded = account !== null && (warung.record !== null || warung.apiDown || status === null || warung.delegated !== null);
  // Demo accounts are shown as they are; setup only matters for the signed-in owner.
  const allDone = accountId !== null && (readOnly ? true : isReady(stepList));
  const next = nextStep(stepList);
  const showSetupDone = readOnly ? loaded : allDone;

  const afterTx = useCallback(() => {
    data.refreshAfterTx();
    warung.refreshAfterTx();
  }, [data, warung]);

  const rounds = overview?.rounds ?? [];
  const pending = accountId && live ? pendingActions(rounds, accountId, now) : [];
  const participations = accountId && live ? myParticipations(rounds, accountId, now) : [];
  const week = weeklySaving(participations, now);
  const feed = accountId && live && overview ? latestAgentMessages(rounds, overview.items, accountId, now) : { messages: [], latestRoundId: null };
  const roundEveryMin = status?.cadence.round_every_min ?? null;
  const spent = account?.spent ?? 0n;
  const stateOrder = stepList.find((s) => s.id === "order")?.status ?? "locked";

  const banner = (
    <WarungBanner
      demo={demo}
      accountId={accountId}
      week={week}
      loading={!overview}
      allDone={allDone}
      next={next}
      ready={ready}
      signIn={signIn}
    />
  );

  const setup = (
    <SetupStepper
      steps={stepList}
      next={next}
      accountId={accountId}
      overview={overview}
      account={account}
      record={warung.record}
      delegated={delegated}
      servicePublicKey={status?.service_public_key ?? null}
      allowanceNear={status?.service_fc_allowance_near ?? "0.25"}
      roundEveryMin={roundEveryMin}
      apiOnline={status !== null}
      onDone={afterTx}
    />
  );

  const pendingPanel = overview ? <PendingActions actions={pending} items={overview.items} nowMs={now} onDone={afterTx} readOnly={readOnly} /> : <Skeleton className="h-40" />;
  const hasPending = pending.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {readOnly && (
        <Notice tone="info" className="items-center">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p>You&apos;re viewing {ownerName(demo)}&apos;s demo warung (test data). Sign in to run your own.</p>
            {walletAccount && <Link href="/warung" className="font-semibold text-brand-ink underline underline-offset-4">Back to my warung</Link>}
          </div>
        </Notice>
      )}
      {banner}
      <OfflineNote />
      {data.error && <ErrorNote message={data.error} onRetry={data.refresh} />}

      {!accountId ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {setup}
          <div className="space-y-6">
            <ServicePulse heading="Next round" showBadge={false} />
            <SecurityNote />
          </div>
        </div>
      ) : (
        <>
          {!readOnly && !allDone && setup}
          {hasPending && pendingPanel}
          <section aria-labelledby="my-staples">
            <SectionTitle><span id="my-staples">Your four staples</span></SectionTitle>
            {!overview ? (
              <LoadingRegion label="Loading your staples" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></LoadingRegion>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {ownerSnapshots(overview.items, participations, warung.record?.demand ?? null).map((s) => (
                  <ItemCard key={s.item.id} snapshot={s} qtyLabel="in your last order" standingLabel="on your standing order" qtyEmpty="No order yet" />
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-6">
              {!hasPending && pendingPanel}
              {overview && <AgentFeed account={accountId} feed={feed} />}
              <ActivityPanel actions={warung.record?.last_actions ?? null} apiDown={warung.apiDown || status === null} participations={participations} items={overview?.items ?? []} rounds={rounds} />
            </div>
            <div className="space-y-6">
              {allDone && (overview ? (
                <StandingOrderCard status={stateOrder} accountId={accountId} items={overview.items} record={warung.record} apiOnline={status !== null} onSaved={afterTx} policy={account?.policy ?? null} spent={spent} roundEveryMin={roundEveryMin} readOnly={readOnly} />
              ) : (
                <Skeleton className="h-96" />
              ))}
              <AccountSummary accountId={accountId} account={account} items={overview?.items ?? []} loading={data.loading} onDone={afterTx} readOnly={readOnly} />
              <SecurityNote />
            </div>
          </div>

          {showSetupDone && overview && (
            <SetupComplete
              accountId={accountId}
              items={overview.items}
              policy={account?.policy ?? null}
              servicePublicKey={status?.service_public_key ?? null}
              allowanceNear={status?.service_fc_allowance_near ?? "0.25"}
              demand={warung.record?.demand ?? null}
              spent={spent}
              roundEveryMin={roundEveryMin}
              readOnly={readOnly}
              onDone={afterTx}
            />
          )}
        </>
      )}

      {overview && !readOnly && (
        <details className={cn("group", panelClass)}>
          <summary className="flex list-none min-h-11 cursor-pointer items-center justify-between gap-3 text-lg font-bold tracking-tight">
            Advanced: join or open a round by hand
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-4 divide-y divide-line">
            <div className="pb-5">
              <JoinStep accountId={accountId} rounds={overview.rounds} items={overview.items} account={account} clockOffsetMs={data.clockOffsetMs} onDone={afterTx} />
            </div>
            <div className="pt-5">
              <OpenStep accountId={accountId} items={overview.items} onDone={afterTx} />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
