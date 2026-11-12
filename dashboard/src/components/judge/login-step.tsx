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
      title="Masuk"
      state={accountId ? "done" : "ready"}
      intro={
        <>
          Dompet NEAR membuat <strong className="text-ink">kunci terbatas</strong> di browser Anda: hanya boleh memanggil{" "}
          <code className="num">join_round</code> di <code className="num">{config.marketId}</code>, tanpa deposit.
        </>
      }
    >
      {initError && <p role="alert" className="rounded-md border-2 border-chili bg-chili-soft/60 px-3 py-2 text-sm">Dompet gagal dimuat: {initError}</p>}
      {accountId ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Masuk sebagai{" "}
            <a className="num font-semibold underline decoration-rule underline-offset-4" target="_blank" rel="noreferrer" href={accountUrl(accountId)}>{accountId}</a>
            {walletId && <span className="text-ink-soft"> lewat {walletId}</span>}
          </p>
          <Button variant="ghost" onClick={() => void signOut()}>Keluar</Button>
        </div>
      ) : (
        <>
          <Button onClick={signIn} disabled={!ready} busy={!ready && !initError}>
            {ready ? "Masuk dengan dompet NEAR" : "Memuat dompet"}
          </Button>
          <p className="text-xs text-ink-soft">
            Pilihan: MyNearWallet, Meteor, HOT, Intear. Pakai akun testnet; tidak perlu uang sungguhan.
          </p>
        </>
      )}
    </StepCard>
  );
}
