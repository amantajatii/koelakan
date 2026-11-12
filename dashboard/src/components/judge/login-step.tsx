"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { linkClass } from "@/components/ui/panel";
import { StepCard } from "@/components/judge/step-card";
import { accountUrl, config } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

export function LoginStep({ index = "1" }: { index?: string }) {
  const { accountId, walletId, ready, initError, signIn, signOut } = useWallet();
  return (
    <StepCard
      index={index}
      stepId="signin"
      title="Sign in"
      state={accountId ? "done" : "ready"}
      intro={
        <>
          Your NEAR wallet creates a <strong className="text-ink">restricted key</strong> in your browser: it can only call{" "}
          <code className="font-mono text-xs text-ink">join_round</code> on <code className="font-mono text-xs text-ink">{config.marketId}</code>, with no deposit.
        </>
      }
    >
      {initError && <Notice tone="error" role="alert">The wallet failed to load: {initError}</Notice>}
      {accountId ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Signed in as{" "}
            <a className={`num ${linkClass}`} target="_blank" rel="noreferrer" href={accountUrl(accountId)}>{accountId}</a>
            {walletId && <span className="text-muted"> via {walletId}</span>}
          </p>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      ) : (
        <>
          <Button onClick={signIn} disabled={!ready} busy={!ready && !initError}>
            {ready ? "Sign in with a NEAR wallet" : "Loading wallet"}
          </Button>
          <p className="text-xs text-muted">
            Options: MyNearWallet, Meteor, HOT, Intear. Use a testnet account; no real money needed.
          </p>
        </>
      )}
    </StepCard>
  );
}
