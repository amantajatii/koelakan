import Link from "next/link";
import { Check, Eye, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { demoHref } from "@/lib/demo";

const CAN = ["Join a round for you, up to your max price per item", "Stay inside the weekly budget you set", "Tell you what it bought and what came back"] as const;
const CANNOT = ["Withdraw or move your money", "Raise your limits or buy above your max price", "Act after you remove its key"] as const;

/** Closing card: what the agent key can and cannot do, then the two actions again. */
export function ControlCard() {
  return (
    <section aria-labelledby="control-title" className="mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-8 lg:pb-24">
      <div className="on-dark rounded-[2rem] bg-night p-6 text-white sm:p-10 lg:p-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <h2 id="control-title" className="text-3xl font-extrabold tracking-[-0.03em] sm:text-[2.6rem] sm:leading-[1.1]">You stay in control of the money.</h2>
            <p className="mt-4 max-w-md text-lg text-[#d4d4de]">
              The agent shops with a key that can only join rounds. Your limits live in the contract, which checks them on every join.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/warung" className={buttonClass("primary", "min-h-12 px-6 text-base")}>Set up my warung</Link>
              <Link href={demoHref()} className={buttonClass("onBrand", "min-h-12 px-6 text-base")}>
                <Eye aria-hidden className="size-4" />
                See a warung in action
              </Link>
            </div>
            <p className="mt-6 text-sm text-night-muted">This is a NEAR testnet contract and it has not been audited.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-night-raised p-5">
              <h3 className="font-bold">The agent key can</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#d4d4de]">
                {CAN.map((t) => (
                  <li key={t} className="flex gap-2.5"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-night-raised p-5">
              <h3 className="font-bold">It cannot</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#d4d4de]">
                {CANNOT.map((t) => (
                  <li key={t} className="flex gap-2.5"><X aria-hidden className="mt-0.5 size-4 shrink-0 text-night-muted" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
