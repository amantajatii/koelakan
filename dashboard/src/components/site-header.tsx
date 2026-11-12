"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { StatusBadge } from "@/components/status-badge";
import { shortAccount } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/warung", label: "Run your warung" },
  { href: "/rounds", label: "Rounds" },
  { href: "/chat", label: "Agent chat" },
  { href: "/grosir", label: "For wholesalers" },
  { href: "/status", label: "Status" },
] as const;

function Crate() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <rect x="3" y="9" width="26" height="19" rx="2" fill="#c98a12" stroke="#2a2118" strokeWidth="2" />
      <path d="M3 15h26M3 21h26M11 9v19M21 9v19" stroke="#2a2118" strokeWidth="1.5" opacity=".55" />
      <path d="M8 9c0-4 3-6 8-6s8 2 8 6" fill="none" stroke="#2a2118" strokeWidth="2" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { accountId, ready, signIn } = useWallet();
  const active = (href: string): boolean => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="border-b-2 border-ink bg-paper-deep/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Koelakan, go to the overview">
          <Crate />
          <span className="font-display text-2xl font-bold leading-none tracking-tight">Koelakan</span>
        </Link>
        <div className="order-2 ml-auto flex items-center gap-3 sm:order-3 sm:ml-0">
        <StatusBadge compact className="hidden min-[420px]:inline-flex" />
        <button
          type="button"
          onClick={signIn}
          disabled={!ready}
          className="min-h-10 rounded-md border-2 border-ink bg-cream px-3 text-sm font-semibold hover:bg-kunyit-soft disabled:opacity-50"
        >
          {accountId ? <span className="num">{shortAccount(accountId).slice(0, 18)}</span> : "Sign in"}
        </button>
        </div>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold",
                active(item.href) ? "bg-ink text-cream" : "text-ink-soft hover:bg-kunyit-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
