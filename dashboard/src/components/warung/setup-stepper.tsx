"use client";

import { LoginStep } from "@/components/judge/login-step";
import { StepCard, Stepper, type StepState } from "@/components/judge/step-card";
import { FundsStep } from "@/components/warung/funds-step";
import { LimitsForm } from "@/components/warung/limits-form";
import { StandingOrderCard } from "@/components/warung/standing-order-card";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/states";
import type { AccountSnapshot } from "@/hooks/use-judge";
import type { WarungRecord } from "@/lib/agent-types";
import type { Overview } from "@/lib/overview";
import type { FlowStep, StepId } from "@/lib/steps";

interface Props {
  steps: FlowStep[];
  next: StepId | null;
  accountId: string | null;
  overview: Overview | null;
  account: AccountSnapshot | null;
  record: WarungRecord | null;
  delegated: boolean | null;
  servicePublicKey: string | null;
  allowanceNear: string;
  roundEveryMin: number | null;
  apiOnline: boolean;
  onDone: () => void;
}

/** Four steps, about three wallet approvals. Only the current step is open. */
export function SetupStepper({ steps, next, accountId, overview, account, record, delegated, servicePublicKey, allowanceNear, roundEveryMin, apiOnline, onDone }: Props) {
  const stateOf = (id: StepId): StepState => steps.find((s) => s.id === id)?.status ?? "locked";
  const doneCount = steps.filter((s) => s.status === "done").length;
  return (
    <Panel aria-labelledby="setup-heading" id="setup" className="scroll-mt-6">
      <SectionTitle aside={<span className="num text-sm font-medium text-muted">{doneCount} of {steps.length} done</span>}>
        <span id="setup-heading">{accountId ? "Get your warung ready" : "Set up in four steps"}</span>
      </SectionTitle>
      <Stepper label="Setup steps" nextId={next}>
        <LoginStep index="1" />
        {!overview ? (
          <li aria-hidden className="py-3"><Skeleton className="h-40" /></li>
        ) : (
          <>
            <StepCard index="2" stepId="funds" title="Add test money" state={stateOf("funds")} intro={<>Top up your warung&apos;s balance with free test rupiah.</>}>
              {accountId && <FundsStep accountId={accountId} tidr={account?.tidr ?? null} onDone={onDone} />}
            </StepCard>
            <StepCard index="3" stepId="limits" title="Set your limits and let the agent shop" state={stateOf("limits")} intro={<>You decide the most you spend and the highest price you accept. The agent can only act inside that.</>}>
              {accountId && (
                <LimitsForm
                  mode="setup"
                  accountId={accountId}
                  items={overview.items}
                  policy={account?.policy ?? null}
                  delegated={delegated}
                  servicePublicKey={servicePublicKey}
                  allowanceNear={allowanceNear}
                  demand={record?.demand ?? null}
                  spent={account?.spent ?? 0n}
                  roundEveryMin={roundEveryMin}
                  onDone={onDone}
                />
              )}
            </StepCard>
            <StepCard index="4" stepId="order" title="Your standing order" state={stateOf("order")} intro={<>Choose what your agent buys every round and how many kg. Change it whenever you like.</>}>
              {accountId && (
                <StandingOrderCard embedded status={stateOf("order")} accountId={accountId} items={overview.items} record={record} apiOnline={apiOnline} onSaved={onDone} policy={account?.policy ?? null} spent={account?.spent ?? 0n} roundEveryMin={roundEveryMin} />
              )}
            </StepCard>
          </>
        )}
      </Stepper>
    </Panel>
  );
}
