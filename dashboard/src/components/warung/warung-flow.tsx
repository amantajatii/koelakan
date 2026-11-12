"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ArrowRight, ChevronDown, LogIn } from "lucide-react";
import { AccountSummary } from "@/components/judge/account-summary";
import { DepositStep } from "@/components/judge/deposit-step";
import { FaucetStep } from "@/components/judge/faucet-step";
import { JoinStep } from "@/components/judge/join-step";
import { LoginStep } from "@/components/judge/login-step";
import { OpenStep } from "@/components/judge/open-step";
import { PolicyStep } from "@/components/judge/policy-step";
import { SecurityNote } from "@/components/judge/security-note";
import { StepCard, Stepper, type StepState } from "@/components/judge/step-card";
import { BannerLine, HeroBanner } from "@/components/hero-banner";
import { ItemCard } from "@/components/item-card";
import { OfflineNote } from "@/components/offline-note";
import { ServicePulse } from "@/components/service-pulse";
import { Button, buttonClass } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ErrorNote, Skeleton } from "@/components/ui/states";
import { ActivityPanel } from "@/components/warung/activity-panel";
import { DelegateStep } from "@/components/warung/delegate-step";
import { PendingActions } from "@/components/warung/pending-actions";
import { StandingOrderCard } from "@/components/warung/standing-order-card";
import { WithdrawPanel } from "@/components/warung/withdraw-panel";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useJudge } from "@/hooks/use-judge";
import { useNow } from "@/hooks/use-now";
import { useWarung } from "@/hooks/use-warung";
import { rupiah, shortAccount } from "@/lib/format";
import { ownerSnapshots, weeklySaving } from "@/lib/item-summary";
import { myParticipations, pendingActions } from "@/lib/owner-actions";
import { computeSteps, isReady, nextStep, type StepId } from "@/lib/steps";
import { useWallet } from "@/lib/wallet";

const SETUP_STEP_LABEL: Record<StepId, string> = {
  signin: "Sign in",
  faucet: "Get test rupiah",
  deposit: "Deposit to market",
  policy: "Set your policy",
  delegate: "Delegate to the agent",
  order: "Save your standing order",
};

export function WarungFlow() {
  const { accountId, ready, signIn } = useWallet();
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
  const next = nextStep(stepList);
  const doneCount = stepList.filter((s) => s.status === "done").length;

  const afterTx = useCallback(() => {
    data.refreshAfterTx();
    warung.refreshAfterTx();
  }, [data, warung]);

  const rounds = overview?.rounds ?? [];
  const pending = accountId && live ? pendingActions(rounds, accountId, now) : [];
  const participations = accountId && live ? myParticipations(rounds, accountId, now) : [];
  const week = weeklySaving(participations, now);

  const banner = accountId ? (
    <HeroBanner
      title={week.rounds > 0 ? `You saved ${rupiah(week.saving)} this week.` : `Welcome back, ${shortAccount(accountId)}.`}
      actions={
        allDone ? (
          <a href="#standing-order" className={buttonClass("onBrand", "gap-2 px-5")}>Edit standing order</a>
        ) : (
          <a href={next ? `#step-${next}` : "#setup"} className={buttonClass("onBrand", "gap-2 px-5")}>
            {next ? SETUP_STEP_LABEL[next] : "Continue setup"} <ArrowRight className="size-4" aria-hidden />
          </a>
        )
      }
    >
      <BannerLine loading={!overview}>
        {week.rounds > 0
          ? <>Against the PIHPS market price, across {week.rounds} {week.rounds === 1 ? "round" : "rounds"} your agent bought in.</>
          : allDone
            ? <>You are set. Your agent joins every round that fits your policy and standing order. Once a round settles, your saving against the PIHPS market price shows up here.</>
            : <>Finish the setup below and your agent starts buying with you. Your saving against the PIHPS market price shows up here after your first settled round.</>}
      </BannerLine>
    </HeroBanner>
  ) : (
    <HeroBanner
      title="Run your warung."
      actions={
        <>
          <Button variant="onBrand" onClick={signIn} disabled={!ready} busy={!ready} className="gap-2 px-5">
            <LogIn className="size-4" aria-hidden /> Sign in with a NEAR wallet
          </Button>
          <Link href="/#how-it-works" className={buttonClass("ghost", "bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white")}>How it works</Link>
        </>
      }
    >
      <p>
        Set it up once: your wallet, your limits, a standing order. The Koelakan agent then joins group-buying rounds for you around the clock, and the contract keeps it inside your price limits and budget. Every transaction is verifiable on nearblocks.
      </p>
    </HeroBanner>
  );

  const setup = (
    <Panel aria-labelledby="setup-heading" id="setup" className="scroll-mt-6">
      <SectionTitle aside={<span className="num text-sm font-medium text-muted">{doneCount} of {stepList.length} done</span>}>
        <span id="setup-heading">{accountId ? "Setup and delegation" : "Set up in six steps"}</span>
      </SectionTitle>
      <Stepper label="Setup steps" nextId={next}>
        <LoginStep index="1" />
        {!overview ? (
          <li aria-hidden className="py-3"><Skeleton className="h-40" /></li>
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
            <StepCard
              index="6"
              stepId="order"
              title="Standing order"
              state={stateOf("order")}
              intro={<>Pick what your agent buys each round and how many kg. You sign it with your wallet; no transaction, no fee.</>}
            >
              <a href="#standing-order" className={buttonClass("secondary", "w-fit")}>Go to the standing order</a>
            </StepCard>
          </>
        )}
      </Stepper>
    </Panel>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {banner}
      <OfflineNote />
      {data.error && <ErrorNote message={data.error} onRetry={data.refresh} />}

      {!accountId ? (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {setup}
          <div className="space-y-6">
            <ServicePulse heading="Next round" />
            <SecurityNote />
          </div>
        </div>
      ) : (
        <>
          {!allDone && setup}
          <section aria-labelledby="my-staples">
            <SectionTitle><span id="my-staples">Your four staples</span></SectionTitle>
            {!overview ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading your staples"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {ownerSnapshots(overview.items, participations, warung.record?.demand ?? null).map((s) => (
                  <ItemCard key={s.item.id} snapshot={s} qtyLabel="in your last order" qtyEmpty="No order yet" />
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              {overview ? <PendingActions actions={pending} items={overview.items} nowMs={now} onDone={afterTx} /> : <Skeleton className="h-40" />}
              <ServicePulse heading="Next round" />
              <ActivityPanel actions={warung.record?.last_actions ?? null} apiDown={warung.apiDown || status === null} participations={participations} items={overview?.items ?? []} />
            </div>
            <div className="space-y-6">
              {overview ? (
                <StandingOrderCard status={stateOf("order")} accountId={accountId} items={overview.items} record={warung.record} apiOnline={status !== null} onSaved={afterTx} />
              ) : (
                <Skeleton className="h-96" />
              )}
              <AccountSummary accountId={accountId} account={account} items={overview?.items ?? []} loading={data.loading} />
              <WithdrawPanel available={account ? BigInt(account.balance.available) : 0n} onDone={afterTx} />
            </div>
          </div>

          {allDone && setup}
          <SecurityNote />
        </>
      )}

      {overview && (
        <details className="group rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
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
