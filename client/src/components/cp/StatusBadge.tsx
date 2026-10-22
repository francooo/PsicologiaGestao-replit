import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "./status";

/** Pill with a colored dot + text (the redesign's status badge). */
export function StatusBadge({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  const t = toneClasses[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", t.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
