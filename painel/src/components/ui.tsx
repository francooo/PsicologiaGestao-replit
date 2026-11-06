import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from "lucide-react";
import { planLabel, validity, type Validity } from "../lib/format";
import type { CompanyStatus, Plan } from "../lib/types";

export function Badge({ tone, children, plain }: { tone: Validity["tone"] | "plan"; children: ReactNode; plain?: boolean }) {
  return <span className={`badge badge--${tone}${plain ? " badge--plain" : ""}`}>{children}</span>;
}

export function ValidityBadge(props: { status?: CompanyStatus; accessValidUntil: string | null; accessExpired?: boolean }) {
  const v = validity(props);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function PlanBadge({ plan }: { plan: Plan | null }) {
  if (!plan) return <span className="muted">Sem plano</span>;
  return <Badge tone="plan">{planLabel(plan)}</Badge>;
}

export function Kpi({ label, value, note, icon, tone }: { label: string; value: ReactNode; note?: ReactNode; icon?: ReactNode; tone?: "warning" | "danger" }) {
  return (
    <div className={`card kpi${tone ? ` kpi--${tone}` : ""}`}>
      <div className="kpi__label">
        {icon}
        {label}
      </div>
      <div className="kpi__value">{value}</div>
      {note ? <div className="kpi__note">{note}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Inbox aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="empty" role="status">
      <Loader2 className="spin" aria-hidden="true" />
      <div>{label}</div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Erro inesperado.";
  return (
    <div className="alert alert--danger" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div style={{ flex: 1 }}>
        {msg}
        {onRetry ? (
          <div style={{ marginTop: 8 }}>
            <button className="btn btn--secondary btn--sm" onClick={onRetry}>
              Tentar de novo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.dialog__close)");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog${size ? ` dialog--${size}` : ""}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <div className="dialog__head">
          <h2 className="dialog__title" id="dialog-title">
            {title}
          </h2>
          <button className="btn btn--ghost btn--icon btn--sm dialog__close" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer ? <div className="dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className={`btn ${danger ? "btn--danger" : "btn--primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="spin" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {error ? <div className="field-error">{error}</div> : null}
    </Dialog>
  );
}

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          {msg}
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
