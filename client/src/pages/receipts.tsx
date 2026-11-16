import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, FileDown, Loader2, ReceiptText, TriangleAlert, Undo2, Users, Wallet } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { InfoBanner } from "@/components/cp/fields";
import { cpCard } from "@/components/invoices/invoice-ui";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { downloadCsv, formatBRL, parseAmount } from "@/lib/money";
import { formatCpf } from "@/lib/cpf";
import { cn } from "@/lib/utils";

// Receita Saúde: the receipt is issued in the Receita's app or in e-CAC (there's no public API).
// This page lists the month's completed sessions with the data to type there and keeps track of
// which ones were already issued.

type Issue = "patient_not_found" | "ambiguous" | "no_patient_cpf" | "no_payer_cpf" | "no_psychologist_cpf" | "no_crp";

type ReceiptItem = {
  appointmentId: number;
  date: string;
  startTime: string;
  patientName: string;
  patientId: number | null;
  beneficiary: { name: string; cpf: string | null } | null;
  payer: { name: string; cpf: string | null; isGuardian: boolean } | null;
  psychologist: { id: number; name: string; crp: string | null; cpf: string | null };
  suggestedAmount: number | null;
  receipt: { amount: number; payerCpf: string; issuedAt: string } | null;
  issues: Issue[];
};

type ReceiptsResponse = {
  month: string;
  items: ReceiptItem[];
  summary: { total: number; issued: number; pending: number; withIssues: number; issuedAmount: number };
};

type Psychologist = { id: number; user: { fullName: string } | null };

const ECAC_URL = "https://cav.receita.fazenda.gov.br/autenticacao/login";
const STAFF = ["admin", "receptionist"];

const ISSUE_TEXT: Record<Issue, string> = {
  patient_not_found: "Paciente não encontrado no cadastro de pacientes",
  ambiguous: "Mais de um paciente com esse nome",
  no_patient_cpf: "Paciente sem CPF no cadastro",
  no_payer_cpf: "Responsável sem CPF no cadastro",
  no_psychologist_cpf: "Psicóloga sem CPF no perfil",
  no_crp: "Psicóloga sem CRP no perfil",
};
// Missing data on the psychologist is shown once, at the top; the rows only show the patient's
const PSYCH_ISSUES: Issue[] = ["no_psychologist_cpf", "no_crp"];
// Without the payer's CPF the receipt can't be issued at all
const BLOCKING: Issue[] = ["patient_not_found", "ambiguous", "no_patient_cpf", "no_payer_cpf"];

type Filter = "all" | "pending" | "issued" | "issues";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "issued", label: "Emitidas" },
  { value: "issues", label: "Com pendência" },
];

const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";

function previousMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const brDate = (iso: string) => iso.split("-").reverse().join("/");
const monthLabel = (m: string) =>
  new Date(`${m}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const amountText = (n: number) => n.toFixed(2).replace(".", ",");

function receiptText(i: ReceiptItem, amount: number) {
  const lines = [
    `Pagador: ${i.payer?.name ?? i.patientName} — CPF ${formatCpf(i.payer?.cpf) || "não cadastrado"}`,
  ];
  if (i.payer?.isGuardian) lines.push(`Beneficiário (paciente): ${i.beneficiary?.name} — CPF ${formatCpf(i.beneficiary?.cpf) || "não cadastrado"}`);
  lines.push(`Valor: R$ ${amountText(amount)}`, `Data do pagamento: ${brDate(i.date)}`, "Descrição: Sessão de psicoterapia");
  return lines.join("\n");
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStaff = STAFF.includes(user?.role ?? "");
  const [month, setMonth] = useState(previousMonth);
  const [psychologistId, setPsychologistId] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const params = new URLSearchParams({ month });
  if (isStaff && psychologistId !== "all") params.set("psychologistId", psychologistId);
  const queryKey = [`/api/health-receipts?${params}`];
  const { data, isLoading } = useQuery<ReceiptsResponse>({ queryKey, enabled: /^\d{4}-\d{2}$/.test(month) });
  const { data: psychologists } = useQuery<Psychologist[]>({ queryKey: ["/api/psychologists"], enabled: isStaff });

  const items = useMemo(() => data?.items ?? [], [data]);
  const blocking = (i: ReceiptItem) => i.issues.filter((x) => BLOCKING.includes(x));
  const visible = useMemo(
    () =>
      items.filter((i) =>
        filter === "pending" ? !i.receipt : filter === "issued" ? !!i.receipt : filter === "issues" ? !i.receipt && i.issues.length > 0 : true,
      ),
    [items, filter],
  );
  // Psychologists missing CPF/CRP (for the banner at the top)
  const psychMissing = useMemo(() => {
    const map = new Map<number, { name: string; issues: Issue[] }>();
    for (const i of items) {
      const own = i.issues.filter((x) => PSYCH_ISSUES.includes(x));
      if (own.length && !map.has(i.psychologist.id)) map.set(i.psychologist.id, { name: i.psychologist.name, issues: own });
    }
    return Array.from(map.values());
  }, [items]);

  const refresh = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/health-receipts") });

  const mark = useMutation({
    mutationFn: async (v: { appointmentId: number; amount: number }) => (await apiRequest("POST", "/api/health-receipts", v)).json(),
    onSuccess: () => {
      refresh();
      toast({ title: "Recibo marcado como emitido" });
    },
    onError: (e) => toast({ title: "Não foi possível marcar", description: errorMessage(e), variant: "destructive" }),
  });
  const unmark = useMutation({
    mutationFn: (appointmentId: number) => apiRequest("DELETE", `/api/health-receipts/${appointmentId}`),
    onSuccess: () => {
      refresh();
      toast({ title: "Marcação desfeita" });
    },
    onError: (e) => toast({ title: "Não foi possível desfazer", description: errorMessage(e), variant: "destructive" }),
  });

  const amountOf = (i: ReceiptItem) => {
    if (i.receipt) return i.receipt.amount;
    const raw = amounts[i.appointmentId];
    return raw === undefined ? i.suggestedAmount ?? 0 : parseAmount(raw);
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copiado` });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie manualmente.", variant: "destructive" });
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `recibos-receita-saude-${month}.csv`,
      ["Data", "Horário", "Psicóloga", "Paciente", "CPF paciente", "Pagador", "CPF pagador", "Valor", "Situação", "Emitido em"],
      items.map((i) => [
        brDate(i.date),
        i.startTime,
        i.psychologist.name,
        i.patientName,
        formatCpf(i.beneficiary?.cpf),
        i.payer?.name ?? "",
        formatCpf(i.receipt?.payerCpf ?? i.payer?.cpf),
        amountText(amountOf(i)),
        i.receipt ? "Emitido" : "Pendente",
        i.receipt ? new Date(i.receipt.issuedAt).toLocaleDateString("pt-BR") : "",
      ]),
    );

  const s = data?.summary;

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Recibos (Receita Saúde)"
            subtitle="Sessões concluídas do mês com os dados prontos para emitir o recibo"
            actions={
              <>
                <button type="button" className={cpButton.secondary} onClick={exportCsv} disabled={items.length === 0}>
                  <FileDown className="h-4 w-4" />
                  Exportar CSV
                </button>
                <a href={ECAC_URL} target="_blank" rel="noopener noreferrer" className={cpButton.primary} data-testid="link-receita-saude">
                  <ExternalLink className="h-4 w-4" />
                  Abrir Receita Saúde
                </a>
              </>
            }
          />

          <InfoBanner className="mb-6" title="O recibo é emitido no Receita Saúde">
            Entre no app Receita Federal (Receita Saúde) ou no e-CAC com sua conta gov.br, copie os dados de cada sessão daqui e,
            depois de emitir, marque como emitido. O sistema não envia nada para a Receita.
          </InfoBanner>

          {psychMissing.length > 0 && (
            <InfoBanner variant="warning" className="mb-6" title="Complete o perfil para emitir os recibos">
              {psychMissing.map((p) => (
                <span key={p.name} className="block">
                  {isStaff ? `${p.name}: ` : ""}
                  {p.issues.map((x) => ISSUE_TEXT[x].replace("Psicóloga sem ", "falta ")).join(", ")}.
                </span>
              ))}
              {isStaff ? (
                <Link href="/admin/psicologas" className="font-semibold text-cp-action underline">Abrir cadastro das psicólogas</Link>
              ) : (
                <Link href="/perfil" className="font-semibold text-cp-action underline">Abrir Meu perfil</Link>
              )}
            </InfoBanner>
          )}

          {/* Filtros */}
          <div className={cn(cpCard, "mb-6 p-4 sm:p-5")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={fieldLabel} htmlFor="rc-month">Mês das sessões</label>
                <Input id="rc-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="input-month" />
              </div>
              {isStaff && (
                <div>
                  <span className={fieldLabel}>Psicóloga</span>
                  <Select value={psychologistId} onValueChange={setPsychologistId}>
                    <SelectTrigger aria-label="Psicóloga"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {(psychologists ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.user?.fullName ?? `#${p.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <span className={fieldLabel}>Mostrar</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mostrar">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={filter === f.value}
                      onClick={() => setFilter(f.value)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                        filter === f.value ? "border-cp-action bg-cp-action-soft text-cp-action" : "border-cp-border bg-white text-cp-ink hover:bg-cp-hover",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Users className="h-6 w-6 text-cp-action" />} tint="bg-cp-action-soft" label="Sessões concluídas" value={s?.total ?? 0} sub={month ? monthLabel(month) : ""} />
            <MetricCard icon={<CheckCircle2 className="h-6 w-6 text-cp-sage-ink" />} tint="bg-cp-sage-soft" label="Recibos emitidos" value={s?.issued ?? 0} sub={formatBRL(s?.issuedAmount ?? 0)} />
            <MetricCard icon={<ReceiptText className="h-6 w-6 text-cp-lavender-ink" />} tint="bg-cp-lavender-soft" label="Pendentes" value={s?.pending ?? 0} sub="a emitir" />
            <MetricCard icon={<TriangleAlert className="h-6 w-6 text-cp-warning" />} tint="bg-cp-warning-soft" label="Com pendência" value={s?.withIssues ?? 0} sub="faltam dados no cadastro" />
          </div>

          <div className={cn(cpCard, "p-4 sm:p-6")}>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-cp-action" /></div>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-cp-muted">
                {items.length === 0
                  ? "Nenhuma sessão concluída neste mês. Só entram as consultas marcadas como Concluído na agenda."
                  : "Nada neste filtro."}
              </p>
            ) : (
              <ul className="divide-y divide-cp-divider">
                {visible.map((i) => {
                  const rowIssues = i.issues.filter((x) => !PSYCH_ISSUES.includes(x));
                  const blocked = blocking(i).length > 0;
                  const amount = amountOf(i);
                  const amountValid = Number.isFinite(amount) && amount > 0;
                  const busy = (mark.isPending && mark.variables?.appointmentId === i.appointmentId) || (unmark.isPending && unmark.variables === i.appointmentId);
                  return (
                    <li key={i.appointmentId} className="py-4 first:pt-0 last:pb-0" data-testid={`receipt-${i.appointmentId}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-cp-ink">
                            {i.patientName}
                            <span className="ml-2 text-sm font-normal text-cp-muted">{brDate(i.date)} · {i.startTime}</span>
                          </p>
                          {isStaff && <p className="text-xs text-cp-muted">{i.psychologist.name}</p>}
                          {i.payer && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cp-ink">
                              <CopyField label={i.payer.isGuardian ? `Pagador (responsável): ${i.payer.name}` : "CPF do pagador"} value={formatCpf(i.payer.cpf)} onCopy={copy} />
                              {i.payer.isGuardian && <CopyField label="CPF do paciente (beneficiário)" value={formatCpf(i.beneficiary?.cpf)} onCopy={copy} />}
                            </div>
                          )}
                          {rowIssues.length > 0 && !i.receipt && (
                            <p className="flex flex-wrap items-center gap-x-2 text-sm text-cp-warning">
                              <TriangleAlert className="h-4 w-4" />
                              {rowIssues.map((x) => ISSUE_TEXT[x]).join(" · ")}
                              {i.patientId && (
                                <Link href={`/patients/${i.patientId}/record`} className="font-semibold text-cp-action underline">Abrir cadastro</Link>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {i.receipt ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-cp-sage-soft px-3 py-1 text-xs font-semibold text-cp-sage-ink">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Emitido em {new Date(i.receipt.issuedAt).toLocaleDateString("pt-BR")} · {formatBRL(i.receipt.amount)}
                              </span>
                              <button type="button" className={cpButton.secondary} disabled={busy} onClick={() => unmark.mutate(i.appointmentId)}>
                                <Undo2 className="h-4 w-4" />
                                Desfazer
                              </button>
                            </>
                          ) : (
                            <>
                              <label className="flex items-center gap-1 text-sm text-cp-muted">
                                <Wallet className="h-4 w-4" />
                                R$
                                <Input
                                  className="h-9 w-24"
                                  inputMode="decimal"
                                  aria-label="Valor da sessão"
                                  value={amounts[i.appointmentId] ?? (i.suggestedAmount ? amountText(i.suggestedAmount) : "")}
                                  onChange={(e) => setAmounts((a) => ({ ...a, [i.appointmentId]: e.target.value }))}
                                />
                              </label>
                              <button type="button" className={cpButton.secondary} disabled={!i.payer} onClick={() => copy(receiptText(i, amountValid ? amount : 0), "Dados do recibo")}>
                                <Copy className="h-4 w-4" />
                                Copiar dados
                              </button>
                              <button
                                type="button"
                                className={cpButton.primary}
                                disabled={blocked || !amountValid || busy}
                                title={blocked ? "Complete o cadastro antes de marcar" : undefined}
                                onClick={() => mark.mutate({ appointmentId: i.appointmentId, amount })}
                                data-testid={`button-mark-${i.appointmentId}`}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Marcar como emitido
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (text: string, what: string) => void }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-cp-muted">{label}:</span>
      <span className="font-mono">{value || "—"}</span>
      {value && (
        <button type="button" className="rounded p-1 text-cp-muted hover:bg-cp-hover hover:text-cp-ink" aria-label={`Copiar ${label}`} onClick={() => onCopy(value.replace(/\D/g, ""), "CPF")}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
