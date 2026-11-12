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
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <h2 id="confirm-title" className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted">{children}</div>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} busy={busy}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
