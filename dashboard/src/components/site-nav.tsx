"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Gavel, LayoutGrid, MessageCircle, Store, Truck, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/components/ui/cn";

interface NavItem {
  href: string;
  label: string;
  /** Short label for the phone tab bar. */
  short: string;
  icon: LucideIcon;
}

const NAV: readonly NavItem[] = [
  { href: "/", label: "Overview", short: "Home", icon: LayoutGrid },
  { href: "/warung", label: "My warung", short: "Warung", icon: Store },
  { href: "/rounds", label: "Rounds", short: "Rounds", icon: Gavel },
  { href: "/chat", label: "Agent chat", short: "Chat", icon: MessageCircle },
  { href: "/grosir", label: "Wholesalers", short: "Grosir", icon: Truck },
  { href: "/status", label: "Status", short: "Status", icon: Activity },
];

function useActive(): (href: string) => boolean {
  const pathname = usePathname();
  return (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Desktop: fixed icon rail with the brand on top. */
export function SideRail() {
  const active = useActive();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[5.75rem] flex-col items-center border-r border-line bg-surface/90 py-5 backdrop-blur-md lg:flex">
      <Link href="/" aria-label="Koelakan, go to the overview" className="mb-6 rounded-xl">
        <LogoMark className="size-11" />
      </Link>
      <nav aria-label="Main" className="flex w-full flex-1 flex-col items-center gap-1.5 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-center text-[0.72rem] font-semibold leading-tight transition-colors duration-150",
                on ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-ground hover:text-ink",
              )}
            >
              <Icon className="size-[1.4rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Phone: bottom tab bar with labels and the safe-area inset. */
export function TabBar() {
  const active = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6 px-1">
        {NAV.map(({ href, label, short, icon: Icon }) => {
          const on = active(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.68rem] font-semibold transition-colors duration-150",
                  on ? "text-brand-ink" : "text-muted",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150", on && "bg-brand-soft")}>
                  <Icon className="size-[1.25rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                </span>
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
