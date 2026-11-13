import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="content" className="px-4 pb-16">
      <section className="mx-auto mt-8 max-w-xl rounded-card bg-surface px-6 py-12 text-center shadow-card sm:mt-14">
        <span aria-hidden className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><SearchX className="size-6" /></span>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">We could not find that page.</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">The link may be old, or the round you are looking for does not exist yet. Rounds are numbered from 1.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/overview" className={buttonClass("primary", "px-5")}>Back to the overview</Link>
          <Link href="/rounds" className={buttonClass("secondary", "px-5")}>See rounds</Link>
        </div>
      </section>
    </main>
  );
}
