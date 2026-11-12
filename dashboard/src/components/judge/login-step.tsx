"use client";

import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/judge/step-card";
import { accountUrl, config } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

export function LoginStep() {
  const { accountId, walletId, ready, initError, signIn, signOut } = useWallet();
  return (
    <StepCard
      index="1"
      title="Sign in"
      state={accountId ? "done" : "ready"}
      intro={
        <>
          Your NEAR wallet creates a <strong className="text-ink">restricted key</strong> in your browser: it can only call{" "}
          <code className="num">join_round</code> on <code className="num">{config.marketId}</code>, with no deposit.
        </>
      }
    >
      {initError && <p role="alert" className="rounded-md border-2 border-chili bg-chili-soft/60 px-3 py-2 text-sm">The wallet failed to load: {initError}</p>}
      {accountId ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Signed in as{" "}
            <a className="num font-semibold underline decoration-rule underline-offset-4" target="_blank" rel="noreferrer" href={accountUrl(accountId)}>{accountId}</a>
            {walletId && <span className="text-ink-soft"> via {walletId}</span>}
          </p>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      ) : (
        <>
          <Button onClick={signIn} disabled={!ready} busy={!ready && !initError}>
            {ready ? "Sign in with a NEAR wallet" : "Loading wallet"}
          </Button>
          <p className="text-xs text-ink-soft">
            Options: MyNearWallet, Meteor, HOT, Intear. Use a testnet account; no real money needed.
          </p>
        </>
      )}
    </StepCard>
  );
}
