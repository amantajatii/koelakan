"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/components/ui/cn";
import { shortAccount } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

/** Top bar: brand on phones, a quiet utility area (agent status, account) everywhere. */
export function SiteHeader() {
  const { accountId, ready, signIn } = useWallet();
  return (
    <header className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
      <Link href="/" className="flex items-center gap-2.5 rounded-xl lg:hidden" aria-label="Koelakan home">
        <LogoMark className="size-9" />
        <span className="text-lg font-bold tracking-[-0.02em]">Koelakan</span>
      </Link>
      <p className="hidden rounded-full bg-surface px-4 py-2 text-sm font-medium text-muted shadow-card lg:block">NEAR testnet · test rupiah (tIDR)</p>
      <div className="ml-auto flex items-center gap-2">
        <StatusBadge compact />
        <button
          type="button"
          onClick={signIn}
          disabled={!ready}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border text-sm font-semibold transition-[background-color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-60",
            accountId ? "border-transparent bg-surface py-1 pl-1 pr-4 shadow-card hover:border-line-strong" : "border-transparent bg-brand px-5 text-ink hover:bg-brand-hover",
          )}
        >
          {accountId ? (
            <>
              <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-night text-brand"><UserRound className="size-4" /></span>
              <span className="num max-w-[6.5rem] truncate sm:max-w-[11rem]">{shortAccount(accountId)}</span>
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </div>
    </header>
  );
}
