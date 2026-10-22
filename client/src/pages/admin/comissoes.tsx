import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  HandCoins,
  Plus,
  Eye,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Settings,
  Loader2,
  Clock,
  Users,
  DoorOpen,
  Calendar,
  User as UserIcon,
  Wallet,
  Percent,
  Calculator,
  Ban,
  Pencil,
} from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { CharCountTextarea, IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { commissionStatus, statusOf } from "@/components/cp/status";
import { formatBRL } from "@/lib/money";
import { toDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

type Psychologist = { id: number; userId: number };
type User = { id: number; fullName: string };
type PsychWithUser = Psychologist & { user?: User };

type Commission = {
  id: number;
  psychologistId: number;
  psychologistName: string | null;
  periodStart: string;
  periodEnd: string;
  totalBookings: number;
  totalRoomsValue: string;
  totalRepasse: string;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
  createdAt: string;
};

type CommissionItem = {
  id: number;
  commissionId: number;
  bookingId: number;
  bookingDate: string;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  bookingValue: string;
  repasseValue: string;
};

type PayoutConfig = {
  id: number;
  psychologistId: number;
  psychologistName: string | null;
  payoutType: string;
  payoutValue: string;
  validFrom: string;
  validUntil: string | null;
};

type DashboardData = {
  totalPendente: string;
  totalPago: string;
  numPsicologas: number;
  numLocacoes: number;
};

type PreviewData = {
  items: Array<{
    bookingId: number;
    bookingDate: string;
    roomName: string | null;
    startTime: string;
    endTime: string;
    bookingValue: number;
    repasseValue: number;
  }>;
  totalRoomsValue: number;
  totalRepasse: number;
  totalBookings: number;
};

const PAYMENT_METHODS: Record<string, string> = {
  pix: "PIX",
  transferencia: "Transferência Bancária",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "cancelled", label: "Cancelado" },
];

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";
const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const thRow = "bg-cp-sand-soft text-left text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl";
const tdRow = "transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl";

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

/** Local yyyy-MM (toISOString() is UTC and flips the month on the last evening of it). */
function currentMonth() {
  return toDateKey().slice(0, 7);
}

function monthStart(m: string) {
  return `${m}-01`;
}

function monthEnd(m: string) {
  const [y, mo] = m.split("-");
  const last = new Date(parseInt(y), parseInt(mo), 0).getDate();
  return `${m}-${last.toString().padStart(2, "0")}`;
}

function CommissionBadge({ status }: { status: string }) {
  const st = statusOf(commissionStatus, status === "paid" || status === "cancelled" ? status : "pending");
  return (
    <span data-testid={`badge-status-${status === "paid" || status === "cancelled" ? status : "pending"}`}>
      <StatusBadge label={st.label} tone={st.tone} />
    </span>
  );
}

/** Psychologist / period / amount summary shown at the top of the pay and cancel dialogs. */
function CommissionSummary({ c }: { c: Commission }) {
  return (
    <div className="rounded-xl bg-cp-hover p-4 text-sm">
      <p className="font-semibold text-cp-ink">{c.psychologistName ?? `Psicóloga #${c.psychologistId}`}</p>
      <p className="text-xs text-cp-muted">{fmtDate(c.periodStart)} – {fmtDate(c.periodEnd)}</p>
      <p className="mt-1 text-lg font-bold text-cp-action">{formatBRL(c.totalRepasse)}</p>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">{label}</p>
      <div className="mt-0.5 text-[15px] text-cp-ink">{children}</div>
    </div>
  );
}

function PsychSelect({ value, onChange, psychologists, disabled, testId }: {
  value: string;
  onChange: (v: string) => void;
  psychologists: Array<{ id: number; user?: { fullName: string } }>;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <IconField icon={UserIcon}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger data-testid={testId} aria-label="Psicóloga">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {psychologists.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.user?.fullName ?? `Psicóloga #${p.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </IconField>
  );
}

export default function AdminComissoes() {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [filterPsych, setFilterPsych] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [showGenerate, setShowGenerate] = useState(false);
  const [showPay, setShowPay] = useState<Commission | null>(null);
  const [showDetail, setShowDetail] = useState<Commission | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showCancel, setShowCancel] = useState<Commission | null>(null);

  const [genPsychId, setGenPsychId] = useState<string>("");
  const [genPeriodStart, setGenPeriodStart] = useState(monthStart(currentMonth()));
  const [genPeriodEnd, setGenPeriodEnd] = useState(monthEnd(currentMonth()));
  const [genPreview, setGenPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [payDate, setPayDate] = useState(toDateKey());
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [cfgPsychId, setCfgPsychId] = useState<string>("");
  const [cfgType, setCfgType] = useState<"percentual" | "fixed">("percentual");
  const [cfgValue, setCfgValue] = useState("");
  const [cfgFrom, setCfgFrom] = useState(monthStart(currentMonth()));
  const [cfgUntil, setCfgUntil] = useState("");
  const [editingCfgId, setEditingCfgId] = useState<number | null>(null);

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/admin/commissions/dashboard", month],
    queryFn: async () => {
      const res = await fetch(`/api/admin/commissions/dashboard?month=${month}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const buildFilters = () => {
    const params = new URLSearchParams();
    if (filterPsych !== "all") params.set("psychologistId", filterPsych);
    if (filterStatus !== "all") params.set("status", filterStatus);
    params.set("periodStart", monthStart(month));
    params.set("periodEnd", monthEnd(month));
    return params.toString();
  };

  const { data: commissions = [], isLoading: loadingComm } = useQuery<Commission[]>({
    queryKey: ["/api/admin/commissions", filterPsych, filterStatus, month],
    queryFn: async () => {
      const res = await fetch(`/api/admin/commissions?${buildFilters()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: psychologists = [] } = useQuery<PsychWithUser[]>({
    queryKey: ["/api/psychologists"],
  });

  const { data: configs = [] } = useQuery<PayoutConfig[]>({
    queryKey: ["/api/admin/commission-configs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/commission-configs", { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: showConfig,
  });

  const { data: detailItems = [], isLoading: loadingItems } = useQuery<CommissionItem[]>({
    queryKey: ["/api/admin/commissions", showDetail?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/commissions/${showDetail!.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!showDetail,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions/dashboard"] });
  };

  const generateMutation = useMutation({
    mutationFn: (data: { psychologistId: number; periodStart: string; periodEnd: string }) =>
      apiRequest("POST", "/api/admin/commissions/generate", data),
    onSuccess: () => {
      toast({ title: "Comissionamento gerado com sucesso!" });
      setShowGenerate(false);
      setGenPreview(null);
      setGenPsychId("");
      refresh();
    },
    onError: async (err: any) => {
      const msg = err?.message || "Erro ao gerar comissionamento";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: (data: { id: number; paymentDate: string; paymentMethod: string; paymentNotes: string }) =>
      apiRequest("PATCH", `/api/admin/commissions/${data.id}/pay`, {
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        paymentNotes: data.paymentNotes,
      }),
    onSuccess: () => {
      toast({ title: "Pagamento registrado!" });
      setShowPay(null);
      refresh();
    },
    onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" }),
  });

  // The dialog stays open until the request finishes, so the spinner is actually visible
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/commissions/${id}/cancel`, {}),
    onSuccess: () => {
      toast({ title: "Comissionamento cancelado." });
      setShowCancel(null);
      refresh();
    },
    onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
  });

  const resetConfigForm = () => {
    setCfgPsychId(""); setCfgType("percentual"); setCfgValue(""); setCfgFrom(monthStart(currentMonth())); setCfgUntil(""); setEditingCfgId(null);
  };

  const createConfigMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCfgId) {
        return apiRequest("PUT", `/api/admin/commission-configs/${editingCfgId}`, data);
      }
      return apiRequest("POST", "/api/admin/commission-configs", data);
    },
    onSuccess: () => {
      toast({ title: editingCfgId ? "Configuração atualizada!" : "Configuração criada!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-configs"] });
      resetConfigForm();
    },
    onError: () => toast({ title: "Erro ao salvar configuração", variant: "destructive" }),
  });

  async function loadPreview() {
    if (!genPsychId || !genPeriodStart || !genPeriodEnd) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(
        `/api/admin/commissions/preview?psychologistId=${genPsychId}&periodStart=${genPeriodStart}&periodEnd=${genPeriodEnd}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Erro ao carregar preview");
      setGenPreview(data);
    } catch (e) {
      setGenPreview(null);
      toast({ title: e instanceof Error ? e.message : "Erro ao carregar preview", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  }

  function startEditConfig(cfg: PayoutConfig) {
    setEditingCfgId(cfg.id);
    setCfgPsychId(String(cfg.psychologistId));
    setCfgType(cfg.payoutType as "percentual" | "fixed");
    setCfgValue(cfg.payoutValue);
    setCfgFrom(cfg.validFrom);
    setCfgUntil(cfg.validUntil ?? "");
  }

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Comissões"
            icon={HandCoins}
            subtitle="Gestão de repasses financeiros das psicólogas"
            phrase
            actions={
              <>
                <button type="button" className={cpButton.secondary} onClick={() => setShowConfig(true)} data-testid="button-open-config">
                  <Settings className="h-4 w-4" />
                  Configurar Repasses
                </button>
                <button type="button" className={cpButton.primary} onClick={() => setShowGenerate(true)} data-testid="button-generate-commission">
                  <Plus className="h-4 w-4" />
                  Gerar Comissionamento
                </button>
              </>
            }
          />

          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Clock className="h-6 w-6 text-cp-warning" />} tint="bg-cp-warning-soft" label="Total pendente"
              value={<span data-testid="kpi-pendente">{formatBRL(dashboard?.totalPendente ?? "0")}</span>} sub="a repassar" />
            <MetricCard icon={<CheckCircle2 className="h-6 w-6 text-cp-success" />} tint="bg-cp-sage-soft" label="Total pago"
              value={<span data-testid="kpi-pago">{formatBRL(dashboard?.totalPago ?? "0")}</span>} sub="no mês" />
            <MetricCard icon={<Users className="h-6 w-6 text-cp-lavender-ink" />} tint="bg-cp-lavender-soft" label="Psicólogas"
              value={<span data-testid="kpi-psicologas">{dashboard?.numPsicologas ?? 0}</span>} sub="com repasse" />
            <MetricCard icon={<DoorOpen className="h-6 w-6 text-cp-sand-ink" />} tint="bg-cp-sand-soft" label="Locações"
              value={<span data-testid="kpi-locacoes">{dashboard?.numLocacoes ?? 0}</span>} sub="no período" />
          </div>

          {/* Filters */}
          <div className={cn(card, "mb-6 flex flex-wrap items-end gap-3 p-4 sm:p-5")}>
            <div className="w-full sm:w-48">
              <label className={fieldLabel} htmlFor="cm-month">Mês</label>
              <IconField icon={Calendar}>
                <Input id="cm-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="input-month-filter" />
              </IconField>
            </div>
            <div className="w-full sm:w-60">
              <span className={fieldLabel}>Psicóloga</span>
              <IconField icon={UserIcon}>
                <Select value={filterPsych} onValueChange={setFilterPsych}>
                  <SelectTrigger data-testid="select-psych-filter" aria-label="Psicóloga">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as psicólogas</SelectItem>
                    {psychologists.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} data-testid={`option-psych-${p.id}`}>
                        {p.user?.fullName ?? `Psicóloga #${p.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </IconField>
            </div>
            <div className="flex flex-wrap gap-1.5 pb-1" role="group" aria-label="Status" data-testid="status-filter-group">
              {STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={filterStatus === opt.value}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                    filterStatus === opt.value ? "bg-cp-action text-white" : "border border-cp-border bg-white text-cp-muted hover:text-cp-ink",
                  )}
                  onClick={() => setFilterStatus(opt.value)}
                  data-testid={`status-btn-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className={cn(card, "p-4 sm:p-6")}>
            {loadingComm ? (
              <div className="flex items-center justify-center py-12 text-cp-muted">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-cp-action" />
                Carregando...
              </div>
            ) : commissions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <HandCoins className="mb-3 h-10 w-10 text-cp-sage" />
                <p className="text-sm font-medium text-cp-ink">Nenhum comissionamento no período</p>
                <p className="mt-1 text-xs text-cp-muted">Use "Gerar Comissionamento" para calcular os repasses do mês.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                  <thead>
                    <tr className={thRow}>
                      <th className="px-4 py-3 font-medium">Psicóloga</th>
                      <th className="px-4 py-3 font-medium">Período</th>
                      <th className="px-4 py-3 text-right font-medium">Locações</th>
                      <th className="px-4 py-3 text-right font-medium">Valor total</th>
                      <th className="px-4 py-3 text-right font-medium">Repasse</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Pagamento</th>
                      <th className="px-4 py-3 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className={tdRow} data-testid={`row-commission-${c.id}`}>
                        <td className="px-4 py-3 font-medium text-cp-ink">{c.psychologistName ?? `Psicóloga #${c.psychologistId}`}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-cp-muted">{fmtDate(c.periodStart)} – {fmtDate(c.periodEnd)}</td>
                        <td className="px-4 py-3 text-right text-cp-ink">{c.totalBookings}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-cp-ink">{formatBRL(c.totalRoomsValue)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-cp-action">{formatBRL(c.totalRepasse)}</td>
                        <td className="px-4 py-3"><CommissionBadge status={c.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-cp-muted" data-testid={`text-paydate-${c.id}`}>{c.paymentDate ? fmtDate(c.paymentDate) : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-cp-muted hover:bg-cp-action-soft hover:text-cp-action" onClick={() => setShowDetail(c)} aria-label="Ver detalhes" data-testid={`button-detail-${c.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {c.status === "pending" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-cp-success hover:bg-cp-success-soft hover:text-cp-success"
                                  onClick={() => { setShowPay(c); setPayDate(toDateKey()); setPayMethod(""); setPayNotes(""); }}
                                  aria-label="Registrar pagamento"
                                  data-testid={`button-pay-${c.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-cp-danger hover:bg-cp-danger-soft hover:text-cp-danger" onClick={() => setShowCancel(c)} aria-label="Cancelar comissionamento" data-testid={`button-cancel-${c.id}`}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Generate Modal */}
      <Dialog open={showGenerate} onOpenChange={(o) => { setShowGenerate(o); if (!o) { setGenPreview(null); setGenPsychId(""); } }}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
          <ModalHeader icon={Calculator} title="Gerar Comissionamento" description="Calcule o repasse das locações de sala no período." />
          <div className="mt-2 space-y-4">
            <div>
              <span className={fieldLabel}>Psicóloga <span className="text-cp-danger">*</span></span>
              <PsychSelect value={genPsychId} onChange={setGenPsychId} psychologists={psychologists} testId="select-gen-psych" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="gen-start">Início do período</label>
                <IconField icon={Calendar}>
                  <Input id="gen-start" type="date" value={genPeriodStart} onChange={(e) => setGenPeriodStart(e.target.value)} data-testid="input-gen-period-start" />
                </IconField>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="gen-end">Fim do período</label>
                <IconField icon={Calendar}>
                  <Input id="gen-end" type="date" value={genPeriodEnd} onChange={(e) => setGenPeriodEnd(e.target.value)} data-testid="input-gen-period-end" />
                </IconField>
              </div>
            </div>
            <button type="button" className={cpButton.secondary} onClick={loadPreview} disabled={!genPsychId || loadingPreview} data-testid="button-load-preview">
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calcular prévia
            </button>

            {genPreview && (
              <div className="space-y-2 rounded-xl bg-cp-hover p-4 text-sm">
                <p className="font-semibold text-cp-ink">Prévia do comissionamento</p>
                <div className="flex justify-between"><span className="text-cp-muted">Locações encontradas</span><span className="font-medium text-cp-ink">{genPreview.totalBookings}</span></div>
                <div className="flex justify-between"><span className="text-cp-muted">Valor total das locações</span><span className="font-medium text-cp-ink">{formatBRL(genPreview.totalRoomsValue)}</span></div>
                <div className="flex justify-between"><span className="text-cp-muted">Repasse calculado</span><span className="font-bold text-cp-action">{formatBRL(genPreview.totalRepasse)}</span></div>
                {genPreview.totalBookings > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-cp-muted">
                          <th className="px-2 py-1.5 text-left font-medium">Data</th>
                          <th className="px-2 py-1.5 text-left font-medium">Sala</th>
                          <th className="px-2 py-1.5 text-right font-medium">Valor</th>
                          <th className="px-2 py-1.5 text-right font-medium">Repasse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genPreview.items.map((item, i) => (
                          <tr key={i} className="border-t border-cp-divider text-cp-ink">
                            <td className="px-2 py-1.5">{fmtDate(item.bookingDate)}</td>
                            <td className="px-2 py-1.5">{item.roomName ?? "—"}</td>
                            <td className="px-2 py-1.5 text-right">{formatBRL(item.bookingValue)}</td>
                            <td className="px-2 py-1.5 text-right font-medium text-cp-action">{formatBRL(item.repasseValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
            <button type="button" className={cpButton.subtle} onClick={() => setShowGenerate(false)}>Cancelar</button>
            <button
              type="button"
              className={cpButton.primary}
              onClick={() => generateMutation.mutate({
                psychologistId: parseInt(genPsychId),
                periodStart: genPeriodStart,
                periodEnd: genPeriodEnd,
              })}
              disabled={!genPsychId || generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Gerar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Modal */}
      <Dialog open={!!showPay} onOpenChange={(o) => !o && setShowPay(null)}>
        <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto rounded-2xl">
          <ModalHeader icon={Wallet} title="Registrar Pagamento" description="Informe como e quando o repasse foi pago." />
          {showPay && (
            <div className="mt-2 space-y-4">
              <CommissionSummary c={showPay} />
              <div>
                <label className={fieldLabel} htmlFor="pay-date">Data do pagamento <span className="text-cp-danger">*</span></label>
                <IconField icon={Calendar}>
                  <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} data-testid="input-pay-date" />
                </IconField>
              </div>
              <div>
                <span className={fieldLabel}>Método de pagamento <span className="text-cp-danger">*</span></span>
                <IconField icon={Wallet}>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger data-testid="select-pay-method" aria-label="Método de pagamento">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHODS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </IconField>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="pay-notes">Observações (opcional)</label>
                <CharCountTextarea
                  id="pay-notes"
                  max={500}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex.: comprovante enviado por e-mail"
                  data-testid="textarea-pay-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
            <button type="button" className={cpButton.subtle} onClick={() => setShowPay(null)}>Cancelar</button>
            <button
              type="button"
              className={cn(cpButton.primary, "bg-cp-success hover:bg-cp-success/90")}
              onClick={() => payMutation.mutate({
                id: showPay!.id,
                paymentDate: payDate,
                paymentMethod: payMethod,
                paymentNotes: payNotes,
              })}
              disabled={payMutation.isPending || !payDate || !payMethod}
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Pagamento
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!showDetail} onOpenChange={(o) => !o && setShowDetail(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
          <ModalHeader icon={Eye} title="Detalhes do Comissionamento" description={showDetail?.psychologistName ?? undefined} />
          {showDetail && (
            <div className="mt-2 space-y-5">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-cp-hover p-4">
                <Info label="Psicóloga">{showDetail.psychologistName ?? `#${showDetail.psychologistId}`}</Info>
                <Info label="Status"><CommissionBadge status={showDetail.status} /></Info>
                <Info label="Período">{fmtDate(showDetail.periodStart)} – {fmtDate(showDetail.periodEnd)}</Info>
                <Info label="Repasse total"><span className="font-bold text-cp-action">{formatBRL(showDetail.totalRepasse)}</span></Info>
                {showDetail.status === "paid" && (
                  <>
                    <Info label="Data de pagamento">{fmtDate(showDetail.paymentDate)}</Info>
                    <Info label="Método">{showDetail.paymentMethod ? PAYMENT_METHODS[showDetail.paymentMethod] ?? showDetail.paymentMethod : "—"}</Info>
                    {showDetail.paymentNotes && (
                      <div className="col-span-2"><Info label="Observações">{showDetail.paymentNotes}</Info></div>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Locações do período</p>
                {loadingItems ? (
                  <div className="py-4 text-center"><Loader2 className="inline h-4 w-4 animate-spin text-cp-action" /></div>
                ) : detailItems.length === 0 ? (
                  <p className="text-sm text-cp-muted">Nenhuma locação registrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-xs">
                      <thead>
                        <tr className={thRow}>
                          <th className="px-3 py-2 font-medium">Data</th>
                          <th className="px-3 py-2 font-medium">Sala</th>
                          <th className="px-3 py-2 font-medium">Horário</th>
                          <th className="px-3 py-2 text-right font-medium">Valor</th>
                          <th className="px-3 py-2 text-right font-medium">Repasse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className={cn(tdRow, "text-cp-ink")} data-testid={`row-item-${item.id}`}>
                            <td className="px-3 py-2">{fmtDate(item.bookingDate)}</td>
                            <td className="px-3 py-2">{item.roomName ?? "—"}</td>
                            <td className="px-3 py-2">{item.startTime && item.endTime ? `${item.startTime.slice(0, 5)} – ${item.endTime.slice(0, 5)}` : "—"}</td>
                            <td className="px-3 py-2 text-right">{formatBRL(item.bookingValue)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-cp-action">{formatBRL(item.repasseValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <button type="button" className={cpButton.secondary} onClick={() => setShowDetail(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={!!showCancel} onOpenChange={(o) => { if (!o && !cancelMutation.isPending) setShowCancel(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <ModalHeader icon={Ban} tone="lavender" title="Cancelar Comissionamento" description="Confirme o cancelamento deste repasse." />
          {showCancel && (
            <div className="mt-2 space-y-3">
              <CommissionSummary c={showCancel} />
              <InfoBanner variant="warning" title="Esta ação não pode ser desfeita." />
            </div>
          )}
          <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
            <button type="button" className={cpButton.subtle} onClick={() => setShowCancel(null)} disabled={cancelMutation.isPending} data-testid="button-cancel-dismiss">Não, manter</button>
            <button
              type="button"
              className={cn(cpButton.primary, "bg-cp-danger hover:bg-cp-danger/90")}
              onClick={() => showCancel && cancelMutation.mutate(showCancel.id)}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-confirm"
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Sim, cancelar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Modal */}
      <Dialog open={showConfig} onOpenChange={(o) => { setShowConfig(o); if (!o) resetConfigForm(); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
          <ModalHeader icon={Settings} title="Configurar Repasses" description="Defina quanto cada psicóloga repassa pelas locações de sala." />
          <div className="mt-2 space-y-5">
            <div className="space-y-3 rounded-xl bg-cp-hover p-4">
              <p className="text-sm font-semibold text-cp-ink">{editingCfgId ? "Editar configuração" : "Nova configuração"}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className={fieldLabel}>Psicóloga</span>
                  <PsychSelect value={cfgPsychId} onChange={setCfgPsychId} psychologists={psychologists} disabled={!!editingCfgId} testId="select-cfg-psych" />
                </div>
                <div>
                  <span className={fieldLabel}>Tipo de repasse</span>
                  <IconField icon={Percent}>
                    <Select value={cfgType} onValueChange={(v) => setCfgType(v as "percentual" | "fixed")}>
                      <SelectTrigger data-testid="select-cfg-type" aria-label="Tipo de repasse"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </IconField>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="cfg-value">{cfgType === "percentual" ? "Percentual (%)" : "Valor (R$)"}</label>
                  <IconField icon={cfgType === "percentual" ? Percent : Wallet}>
                    <Input id="cfg-value" type="number" step="0.01" min="0" value={cfgValue} onChange={(e) => setCfgValue(e.target.value)} placeholder={cfgType === "percentual" ? "Ex: 40" : "Ex: 150.00"} data-testid="input-cfg-value" />
                  </IconField>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="cfg-from">Válido a partir de</label>
                  <IconField icon={Calendar}>
                    <Input id="cfg-from" type="date" value={cfgFrom} onChange={(e) => setCfgFrom(e.target.value)} data-testid="input-cfg-from" />
                  </IconField>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="cfg-until">Válido até (opcional)</label>
                  <IconField icon={Calendar}>
                    <Input id="cfg-until" type="date" value={cfgUntil} onChange={(e) => setCfgUntil(e.target.value)} data-testid="input-cfg-until" />
                  </IconField>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingCfgId && (
                  <button type="button" className={cpButton.subtle} onClick={resetConfigForm}>Cancelar edição</button>
                )}
                <button
                  type="button"
                  className={cpButton.primary}
                  onClick={() => createConfigMutation.mutate({
                    psychologistId: parseInt(cfgPsychId),
                    payoutType: cfgType,
                    payoutValue: parseFloat(cfgValue),
                    validFrom: cfgFrom,
                    validUntil: cfgUntil || null,
                  })}
                  disabled={!cfgPsychId || !cfgValue || createConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {createConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCfgId ? "Salvar Alterações" : "Criar Configuração"}
                </button>
              </div>
            </div>

            {configs.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Configurações cadastradas</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-1 text-xs">
                    <thead>
                      <tr className={thRow}>
                        <th className="px-3 py-2 font-medium">Psicóloga</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                        <th className="px-3 py-2 font-medium">Vigência</th>
                        <th className="px-3 py-2"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((cfg) => (
                        <tr key={cfg.id} className={cn(tdRow, "text-cp-ink")} data-testid={`row-config-${cfg.id}`}>
                          <td className="px-3 py-2 font-medium">{cfg.psychologistName ?? `#${cfg.psychologistId}`}</td>
                          <td className="px-3 py-2">{cfg.payoutType === "percentual" ? "Percentual" : "Fixo"}</td>
                          <td className="px-3 py-2 text-right">{cfg.payoutType === "percentual" ? `${cfg.payoutValue}%` : formatBRL(cfg.payoutValue)}</td>
                          <td className="px-3 py-2">{fmtDate(cfg.validFrom)} – {cfg.validUntil ? fmtDate(cfg.validUntil) : "Atual"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-cp-action hover:bg-cp-action-soft" onClick={() => startEditConfig(cfg)} data-testid={`button-edit-config-${cfg.id}`}>
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <button type="button" className={cpButton.secondary} onClick={() => setShowConfig(false)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
