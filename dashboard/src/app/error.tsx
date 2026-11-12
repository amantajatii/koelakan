"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="mx-auto mt-8 max-w-xl rounded-card border border-line bg-surface px-6 py-12 text-center shadow-card sm:mt-14">
      <span aria-hidden className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn"><TriangleAlert className="size-6" /></span>
      <h1 className="text-3xl font-extrabold tracking-[-0.02em]">This page hit a snag.</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">Nothing on-chain was changed by this error. Try again, and if it keeps happening the public NEAR node may be rate-limiting us for a minute.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="px-5">Try again</Button>
        <Link href="/" className={buttonClass("secondary", "px-5")}>Back to the overview</Link>
      </div>
    </section>
  );
}
