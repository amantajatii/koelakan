import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { buttonClass } from "@/components/ui/button";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#prices", label: "Prices" },
  { href: "/rounds", label: "Rounds" },
  { href: "/grosir", label: "For grosir" },
] as const;

const linkClass = "rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface hover:text-ink";

/** Landing header: brand, in-page and app links, and the primary action. Phones keep brand and action only. */
export function LandingNav() {
  return (
    <header className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
      <Link href="/" aria-label="Koelakan home" className="flex items-center gap-2.5 rounded-2xl">
        <LogoMark className="size-10" />
        <span className="text-xl font-bold tracking-[-0.02em]">Koelakan</span>
      </Link>
      <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <span className="hidden sm:block">
          <Link href="/overview" className={buttonClass("ghost")}>Dashboard</Link>
        </span>
        <Link href="/warung" className={buttonClass("primary", "whitespace-nowrap px-4 sm:px-5")}>Set up my warung</Link>
      </div>
    </header>
  );
}
