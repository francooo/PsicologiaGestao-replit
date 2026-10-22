import { forwardRef, type ComponentType, type ReactNode } from "react";
import { CircleAlert, Info, Lock, CircleCheck } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string }>;

/**
 * Field with a leading icon. Wraps an existing Input / SelectTrigger / textarea
 * and pads it so the text never overlaps the icon.
 */
export function IconField({ icon: Icon, children, className }: { icon: IconType; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative [&>button]:pl-10 [&>input]:pl-10 [&>textarea]:pl-10 [&>button]:rounded-xl [&>input]:rounded-xl [&>button]:border-cp-border [&>input]:border-cp-border [&>button]:h-11 [&>input]:h-11",
        // Teal focus (spec 3.3) instead of the near-black shadcn ring
        "[&>button:focus]:ring-cp-action [&>input:focus-visible]:ring-cp-action [&>textarea:focus-visible]:ring-cp-action",
        className,
      )}
    >
      <Icon className="pointer-events-none absolute left-3.5 top-[22px] z-10 h-4 w-4 -translate-y-1/2 text-cp-muted" />
      {children}
    </div>
  );
}

/** Modal header: icon in a soft circle, title, short description (the X comes from DialogContent). */
export function ModalHeader({
  icon: Icon,
  title,
  description,
  tone = "sage",
}: {
  icon: IconType;
  title: string;
  description?: string;
  tone?: "sage" | "action" | "lavender";
}) {
  const bg = tone === "action" ? "bg-cp-action-soft text-cp-action" : tone === "lavender" ? "bg-cp-lavender-soft text-cp-lavender-ink" : "bg-cp-sage-soft text-cp-sage-ink";
  return (
    <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", bg)}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <DialogTitle className="text-[20px] font-bold text-cp-ink">{title}</DialogTitle>
        {description && <DialogDescription className="text-[14px] text-cp-muted">{description}</DialogDescription>}
      </div>
    </DialogHeader>
  );
}

/** Checkbox presented as a tappable tile with an icon (Wi-Fi, Ar-condicionado). */
export function CheckTile({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: IconType;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        checked ? "border-cp-sage bg-cp-sage-soft/60" : "border-cp-border bg-cp-hover hover:bg-cp-sand-soft",
      )}
    >
      <Icon className="h-4 w-4 text-cp-muted" />
      <span className="flex-1 text-[14px] font-medium text-cp-ink">{label}</span>
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="data-[state=checked]:bg-cp-action data-[state=checked]:border-cp-action" />
    </label>
  );
}

/** Textarea with an "n/max" counter; never lets the text exceed max. */
export const CharCountTextarea = forwardRef<HTMLTextAreaElement, TextareaProps & { max?: number; value?: string }>(
  ({ max = 500, value = "", onChange, className, ...props }, ref) => (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        maxLength={max}
        onChange={onChange}
        className={cn("min-h-[96px] resize-none rounded-xl border-cp-border pb-7 focus-visible:ring-cp-action", className)}
        {...props}
      />
      <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-cp-subtle" aria-live="polite">
        {String(value ?? "").length}/{max}
      </span>
    </div>
  ),
);
CharCountTextarea.displayName = "CharCountTextarea";

const bannerStyles = {
  info: { box: "bg-cp-action-soft border-cp-action/20 text-cp-ink", icon: Info, iconCls: "text-cp-action" },
  warning: { box: "bg-cp-warning-soft border-cp-warning/25 text-cp-ink", icon: CircleAlert, iconCls: "text-cp-warning" },
  privacy: { box: "bg-cp-lavender-soft border-cp-lavender text-cp-ink", icon: Lock, iconCls: "text-cp-lavender-ink" },
  success: { box: "bg-cp-sage-soft border-cp-sage/40 text-cp-ink", icon: CircleCheck, iconCls: "text-cp-success" },
};

/** Inline notice (Google not connected, privacy note, availability tip…). */
export function InfoBanner({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof bannerStyles;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const s = bannerStyles[variant];
  const Icon = s.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", s.box, className)} role="note">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.iconCls)} />
      <div className="text-[14px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-cp-muted">{children}</div>}
      </div>
    </div>
  );
}
