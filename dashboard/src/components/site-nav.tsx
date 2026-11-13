"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, Gavel, LayoutGrid, MessageCircle, Store, Truck, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/components/ui/cn";
import { demoHref } from "@/lib/demo";

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

/** Desktop: a navy sidebar card floating on the canvas, lime pill on the current page. */
export function SideRail() {
  const active = useActive();
  return (
    <aside className="on-dark fixed inset-y-4 left-4 z-30 hidden w-60 flex-col rounded-[1.75rem] bg-night p-4 text-white lg:flex">
      <Link href="/" aria-label="Koelakan, go to the overview" className="mb-8 flex items-center gap-3 rounded-2xl px-2 pt-2">
        <LogoMark className="size-10" onDark />
        <span className="text-xl font-bold tracking-[-0.02em]">Koelakan</span>
      </Link>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-full px-4 text-sm transition-colors duration-150",
                on ? "bg-brand font-bold text-ink" : "font-medium text-night-muted hover:bg-night-raised hover:text-white",
              )}
            >
              <Icon className="size-[1.15rem] shrink-0" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <DemoCard />
    </aside>
  );
}

/** The judge's shortcut: a lime card at the foot of the sidebar that opens the seeded demo warung. */
function DemoCard() {
  return (
    <Link
      href={demoHref()}
      className="group mt-6 flex flex-col gap-4 rounded-3xl bg-brand p-4 text-ink transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      <span aria-hidden className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-brand">
          <Store className="size-5" strokeWidth={2} />
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-white/60 transition-transform duration-200 ease-out group-hover:rotate-45">
          <ArrowUpRight className="size-4" strokeWidth={2.4} />
        </span>
      </span>
      <span>
        <span className="block text-[0.95rem] font-bold leading-tight">Open the demo warung</span>
        <span className="mt-1 block text-xs font-medium leading-relaxed text-ink/75">Bu Sri&apos;s shop, read only. No wallet needed.</span>
      </span>
    </Link>
  );
}

/** Phone: navy bottom tab bar with labels, lime pill on the current page, safe-area inset. */
export function TabBar() {
  const active = useActive();
  return (
    <nav
      aria-label="Main"
      className="on-dark fixed inset-x-0 bottom-0 z-30 bg-night pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6 px-1 py-1">
        {NAV.map(({ href, short, icon: Icon }) => {
          const on = active(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs transition-colors duration-150",
                  on ? "font-bold text-brand" : "font-medium text-night-muted hover:text-white",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150", on && "bg-brand text-ink")}>
                  <Icon className="size-[1.2rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
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
