import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title + short subtitle + main action on the right (spec 3.2), optional brand phrase. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  phrase = false,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  /** "ORGANIZAÇÃO TAMBÉM CUIDA" next to the actions (wide screens only) */
  phrase?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-sage-soft">
            <Icon className="h-5 w-5 text-cp-sage-ink" />
          </span>
        )}
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-cp-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-cp-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        {phrase && (
          <div aria-hidden="true" className="ml-4 hidden 2xl:block">
            <p className="text-[11px] uppercase leading-6 tracking-[0.45em] text-cp-subtle">Organização</p>
            <p className="text-[11px] uppercase leading-6 tracking-[0.45em] text-cp-subtle">também cuida</p>
            <div className="mt-2 h-px w-10 bg-cp-sage" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Primary / secondary button classes shared by the redesigned pages (spec 3.3). */
export const cpButton = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-cp-action px-5 h-11 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-cp-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-cp-border bg-white px-5 h-11 text-[15px] font-medium text-cp-ink transition-colors hover:bg-cp-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
  subtle:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-cp-sand-soft px-5 h-11 text-[15px] font-medium text-cp-ink transition-colors hover:bg-cp-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
};
