import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-10 text-center">
      <p className="mb-3 inline-block -rotate-2 rounded-sm border-2 border-chili px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-chili">404 · out of stock</p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">We could not find that page.</h1>
      <p className="mt-3 text-ink-soft">The link may be old, or the round you are looking for does not exist yet. Rounds are numbered from 1.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-cream hover:bg-chili">Back to the overview</Link>
        <Link href="/rounds" className="inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-cream px-5 text-sm font-semibold hover:bg-kunyit-soft">See rounds</Link>
      </div>
    </section>
  );
}
