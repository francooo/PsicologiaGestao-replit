import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Indicator card: icon in a tinted square, uppercase label, big number, supporting text. */
export function MetricCard({
  icon,
  tint,
  label,
  value,
  sub,
  className,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-4 rounded-2xl border border-cp-divider bg-white p-5 shadow-[0_10px_40px_-18px_rgba(36,54,71,0.18)]", className)}>
      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", tint)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cp-muted">{label}</p>
        <p className="mt-1 text-[32px] font-semibold leading-tight text-cp-ink">{value}</p>
        {sub && <p className="mt-1 text-[14px] text-cp-muted">{sub}</p>}
      </div>
    </div>
  );
}
