import { Building2, CalendarCheck, CalendarX, Clock, Loader2, UserRound } from "lucide-react";
import { cpButton } from "@/components/cp/PageHeader";
import { StatusBadge } from "@/components/cp/StatusBadge";
import type { Tone } from "@/components/cp/status";
import { cn } from "@/lib/utils";
import type { AgentAction } from "./types";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "Feito", tone: "success" },
  cancelled: { label: "Cancelado", tone: "neutral" },
  expired: { label: "Expirado", tone: "neutral" },
  failed: { label: "Não concluído", tone: "danger" },
  processing: { label: "Processando", tone: "info" },
};

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

/** The assistant's proposal: nothing is written until the user clicks Confirmar. */
export function ActionCard({
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  action: AgentAction;
  busy: "confirm" | "cancel" | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isCancel = action.type === "room_booking.cancel";
  const p = action.payload;
  const Icon = isCancel ? CalendarX : CalendarCheck;
  const status = STATUS[action.status];

  return (
    <div className="mt-2 rounded-2xl border border-cp-divider bg-white p-3.5 shadow-sm" data-testid={`agent-action-${action.id}`}>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", isCancel ? "bg-cp-danger-soft text-cp-danger" : "bg-cp-sage-soft text-cp-sage-ink")}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <p className="flex-1 text-sm font-semibold text-cp-ink">{isCancel ? "Cancelar reserva de sala" : "Reserva de sala"}</p>
        {status && <StatusBadge label={status.label} tone={status.tone} />}
      </div>

      <dl className="mt-3 space-y-1.5 text-[13px]">
        <Row icon={Building2} label="Sala" value={p.roomName} />
        <Row icon={UserRound} label="Psicóloga" value={p.psychologistName} />
        <Row icon={Clock} label="Quando" value={`${longDate(p.date)}, ${p.startTime.slice(0, 5)}–${p.endTime.slice(0, 5)}`} />
        {p.purpose && <Row icon={CalendarCheck} label="Finalidade" value={p.purpose} />}
      </dl>

      {action.status === "failed" && action.result?.error && <p className="mt-2 text-xs text-cp-danger">{action.result.error}</p>}

      {action.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button type="button" className={cn(cpButton.secondary, "h-9 flex-1 px-3 text-[13px]")} onClick={onCancel} disabled={!!busy}>
            {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCancel ? "Manter" : "Cancelar"}
          </button>
          <button
            type="button"
            className={cn(cpButton.primary, "h-9 flex-1 px-3 text-[13px]", isCancel && "bg-cp-danger hover:bg-cp-danger/90")}
            onClick={onConfirm}
            disabled={!!busy}
          >
            {busy === "confirm" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCancel ? "Cancelar reserva" : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-muted" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="text-cp-ink">{value}</dd>
    </div>
  );
}
