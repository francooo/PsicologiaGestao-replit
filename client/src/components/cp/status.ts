// Single source of status colors/labels for the redesign (color is never the only cue: badges carry text + dot).

export type Tone = "success" | "warning" | "info" | "lavender" | "sage" | "sand" | "neutral" | "danger";

export const toneClasses: Record<Tone, { badge: string; dot: string; row: string }> = {
  success: { badge: "bg-cp-sage-soft text-cp-sage-ink", dot: "bg-cp-success", row: "bg-cp-sage-soft/60" },
  sage: { badge: "bg-cp-sage-soft text-cp-sage-ink", dot: "bg-cp-sage", row: "bg-cp-sage-soft/60" },
  warning: { badge: "bg-cp-warning-soft text-cp-warning", dot: "bg-cp-warning", row: "bg-cp-sand-soft" },
  sand: { badge: "bg-cp-sand-soft text-cp-sand-ink", dot: "bg-cp-sand-ink", row: "bg-cp-sand-soft" },
  info: { badge: "bg-cp-action-soft text-cp-action", dot: "bg-cp-action", row: "bg-cp-action-soft/70" },
  lavender: { badge: "bg-cp-lavender-soft text-cp-lavender-ink", dot: "bg-cp-lavender-ink", row: "bg-cp-lavender-soft" },
  neutral: { badge: "bg-cp-hover text-cp-muted", dot: "bg-cp-subtle", row: "bg-cp-hover" },
  danger: { badge: "bg-cp-danger-soft text-cp-danger", dot: "bg-cp-danger", row: "bg-cp-danger-soft/60" },
};

type StatusDef = { label: string; tone: Tone };

/** Appointment status (legend of the weekly calendar). */
export const appointmentStatus: Record<string, StatusDef> = {
  confirmed: { label: "Confirmado", tone: "info" },
  scheduled: { label: "Aguardando", tone: "warning" },
  "pending-confirmation": { label: "Aguardando", tone: "warning" },
  completed: { label: "Concluído", tone: "success" },
  canceled: { label: "Cancelado", tone: "neutral" },
  "first-session": { label: "Primeira sessão", tone: "lavender" },
};

export const meetingStatus: Record<string, StatusDef> = {
  scheduled: { label: "Agendada", tone: "info" },
  active: { label: "Em andamento", tone: "success" },
  ended: { label: "Realizada", tone: "sage" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export const patientStatus: Record<string, StatusDef> = {
  active: { label: "Ativo", tone: "success" },
  inactive: { label: "Inativo", tone: "neutral" },
  discharged: { label: "Alta", tone: "lavender" },
};

export const dispatchStatus: Record<string, StatusDef> = {
  sent: { label: "Enviado", tone: "info" },
  opened: { label: "Aberto", tone: "warning" },
  answered: { label: "Respondido", tone: "success" },
  expired: { label: "Expirado", tone: "neutral" },
};

export const invoiceStatus: Record<string, StatusDef> = {
  ativa: { label: "Ativa", tone: "success" },
  pendente: { label: "Pendente", tone: "warning" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

export const commissionStatus: Record<string, StatusDef> = {
  pending: { label: "Pendente", tone: "warning" },
  paid: { label: "Pago", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const userStatus: Record<string, StatusDef> = {
  active: { label: "Ativo", tone: "success" },
  inactive: { label: "Inativo", tone: "neutral" },
  pending: { label: "Pendente", tone: "warning" },
};

export const transactionType: Record<string, StatusDef> = {
  income: { label: "Receita", tone: "success" },
  expense: { label: "Despesa", tone: "danger" },
};

/** Role values stored in the DB -> Portuguese label. */
export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  psychologist: "Psicóloga",
  receptionist: "Recepcionista",
  manager: "Gestor",
  staff: "Equipe",
};

export function roleName(role?: string | null) {
  return (role && roleLabel[role]) || role || "—";
}

export function statusOf(map: Record<string, StatusDef>, value?: string | null): StatusDef {
  return (value && map[value]) || { label: value || "—", tone: "neutral" };
}
