"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { linkClass } from "@/components/ui/panel";
import { StepCard } from "@/components/judge/step-card";
import { TechNote, codeClass } from "@/components/warung/tech-note";
import { accountUrl, config } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

export function LoginStep({ index = "1" }: { index?: string }) {
  const { accountId, walletId, ready, initError, signIn, signOut } = useWallet();
  return (
    <StepCard
      index={index}
      stepId="signin"
      title="Sign in with a wallet"
      state={accountId ? "done" : "ready"}
      intro={<>Sign in with a NEAR wallet. It is free, and there is nothing to remember: the wallet is your login.</>}
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
            Works with MyNearWallet, Meteor, HOT and Intear. Use a testnet account; no real money is involved.
          </p>
        </>
      )}
      <TechNote>
        <p>
          Sign-in asks the wallet to create a restricted browser key: receiver <code className={codeClass}>{config.marketId}</code>, method <code className={codeClass}>join_round</code> only, no deposit. Owner actions still need your full-access key.
        </p>
      </TechNote>
    </StepCard>
  );
}
