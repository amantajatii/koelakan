"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="mx-auto max-w-xl py-10 text-center">
      <p className="mb-3 inline-block rotate-1 rounded-sm border-2 border-chili px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-chili">Something broke</p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">This page hit a snag.</h1>
      <p className="mt-3 text-ink-soft">Nothing on-chain was changed by this error. Try again, and if it keeps happening the public NEAR node may be rate-limiting us for a minute.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-5 text-sm font-semibold hover:bg-kunyit-soft">Back to the overview</Link>
      </div>
    </section>
  );
}
