"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** Native modal dialog: focus trap and Escape come from the browser. */
export function ConfirmDialog({ open, title, confirmLabel, tone = "default", busy, onConfirm, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border-2 border-ink bg-cream p-5 text-ink shadow-[5px_5px_0_0_rgba(42,33,24,0.85)] backdrop:bg-ink/50"
    >
      <h2 id="confirm-title" className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-ink-soft">{children}</div>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={onConfirm} busy={busy} className={tone === "danger" ? "bg-chili hover:bg-ink" : undefined}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
