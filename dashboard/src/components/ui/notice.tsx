import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export type NoticeTone = "ok" | "error" | "warn" | "info";

const STYLE: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  ok: { box: "bg-brand-soft ring-brand-ink/15", icon: "text-brand-ink", Icon: CircleCheck },
  error: { box: "bg-danger-soft ring-danger/20", icon: "text-danger", Icon: CircleAlert },
  warn: { box: "bg-warn-soft ring-warn/20", icon: "text-warn", Icon: TriangleAlert },
  info: { box: "bg-info-soft ring-info/20", icon: "text-info", Icon: Info },
};

interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  role?: "status" | "alert" | "none";
  className?: string;
}

/** Inline message with a drawn icon. Colour never carries the meaning alone. */
export function Notice({ tone, children, role = "status", className }: NoticeProps) {
  const { box, icon, Icon } = STYLE[tone];
  return (
    <div role={role === "none" ? undefined : role} className={cn("flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset", box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
