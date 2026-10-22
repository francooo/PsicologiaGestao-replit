import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  Wallet,
  Search,
  Calendar,
  Filter,
  User as UserIcon,
  FileDown,
} from "lucide-react";
import { InvoiceDetailModal, type InvoiceDetailRow } from "@/components/invoices/InvoiceDetailModal";
import { INVOICE_STATUS_OPTIONS, InvoiceTable, Pagination, cpCard, useDebouncedValue } from "@/components/invoices/invoice-ui";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { IconField } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { roleName } from "@/components/cp/status";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

interface InvoiceWithUser {
  id: number;
  psychologistId: number;
  chaveNfe: string | null;
  numeroNota: string | null;
  serie: string | null;
  dataEmissao: string | null;
  dataUpload: string | null;
  tomadorNome: string | null;
  valorLiquido: string | null;
  status: string;
  user: { id: number; fullName: string; email: string; role: string };
  [key: string]: unknown;
}

interface AdminInvoicesResponse {
  invoices: InvoiceWithUser[];
  total: number;
}

interface SummaryAdminResponse {
  totalCount: number;
  sumValorServicos: string;
  sumValorLiquido: string;
}

type StatusUser = { id: number; fullName: string; email: string; role: string };

interface InvoiceStatusResponse {
  referenceMonth: string;
  sent: StatusUser[];
  pending: StatusUser[];
  totalUsers: number;
  totalSent: number;
  totalPending: number;
}

interface PsychologistOption {
  id: number;
  userId: number;
  user?: { id: number; fullName: string; email: string };
}

const PAGE_SIZE = 20;
const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  .map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

// Same underline tabs as the patient record
const tabTrigger = [
  "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-all",
  "text-cp-ink hover:bg-cp-hover data-[state=active]:bg-cp-sage-soft data-[state=active]:text-cp-sage-ink data-[state=active]:shadow-none",
  "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-cp-sage-ink after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform",
].join(" ");

function UserList({ title, icon, users, tone, empty, testPrefix }: {
  title: string;
  icon: React.ReactNode;
  users: StatusUser[];
  tone: "success" | "warning";
  empty: string;
  testPrefix: string;
}) {
  return (
    <div className={cn(cpCard, "p-4 sm:p-6")}>
      <h3 className="mb-4 flex items-center gap-2 text-[18px] font-semibold text-cp-ink">{icon}{title} ({users.length})</h3>
      {users.length === 0 ? (
        <p className="py-6 text-center text-sm text-cp-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl bg-cp-hover px-3 py-2.5" data-testid={`${testPrefix}-${u.id}`}>
              <div className="min-w-0">
                <p className="truncate font-medium text-cp-ink">{u.fullName}</p>
                <p className="truncate text-sm text-cp-muted">{u.email}</p>
              </div>
              <StatusBadge label={roleName(u.role)} tone={tone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminInvoices() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [psychologistId, setPsychologistId] = useState<string>("all");
  const [dataEmissaoFrom, setDataEmissaoFrom] = useState("");
  const [dataEmissaoTo, setDataEmissaoTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [statusMonth, setStatusMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [statusYear, setStatusYear] = useState(new Date().getFullYear().toString());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const statusReferenceMonth = `${statusYear}-${statusMonth}`;

  const summaryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (psychologistId && psychologistId !== "all") p.set("psychologist_id", psychologistId);
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    return p.toString();
  }, [psychologistId, dataEmissaoFrom, dataEmissaoTo, status]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams(summaryParams);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [summaryParams, page, debouncedSearch]);

  const { data: psychologistsData } = useQuery<PsychologistOption[]>({
    queryKey: ["/api/psychologists"],
  });

  const { data, isLoading } = useQuery<AdminInvoicesResponse>({
    queryKey: ["/api/admin/invoices", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/invoices?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar notas fiscais");
      return res.json();
    },
  });

  const { data: summary } = useQuery<SummaryAdminResponse>({
    queryKey: ["/api/admin/invoices/summary", summaryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/invoices/summary?${summaryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar resumo");
      return res.json();
    },
  });

  const { data: invoiceStatus, isLoading: isLoadingStatus, isError: isStatusError } = useQuery<InvoiceStatusResponse>({
    queryKey: ["/api/admin/invoices/status", statusReferenceMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/invoices/status?referenceMonth=${statusReferenceMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar status");
      return res.json();
    },
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const psychologists = psychologistsData ?? [];

  const handleDownload = (id: number) => {
    window.open(`/api/invoices/${id}/download`, "_blank");
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices/summary"] });
      toast({ title: "Sucesso", description: "Status atualizado." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const handleExportCsv = () => {
    window.open(`/api/admin/invoices/export?${summaryParams}`, "_blank");
  };

  const selectedInvoice = selectedInvoiceId != null ? invoices.find((i) => i.id === selectedInvoiceId) : null;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const resetPage = () => setPage(0);

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Gestão de Notas"
            subtitle="Visão consolidada das notas fiscais de todas as psicólogas"
            phrase
          />

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-cp-divider bg-white p-1.5 shadow-[0_10px_40px_-22px_rgba(36,54,71,0.2)]">
              <TabsTrigger value="all" className={tabTrigger} data-testid="tab-all-invoices">
                <FileText className="h-4 w-4" />
                Todas as Notas
              </TabsTrigger>
              <TabsTrigger value="status" className={tabTrigger} data-testid="tab-status">
                <Users className="h-4 w-4" />
                Status por Mês
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0 space-y-6">
              <div className={cn(cpCard, "p-4 sm:p-5")}>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <div className="col-span-2 lg:col-span-1">
                    <span className={fieldLabel}>Psicóloga</span>
                    <IconField icon={UserIcon}>
                      <Select value={psychologistId} onValueChange={(v) => { setPsychologistId(v); resetPage(); }}>
                        <SelectTrigger data-testid="filter-psychologist" aria-label="Psicóloga"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {psychologists.map((p) => (
                            <SelectItem key={p.id} value={String(p.userId)}>
                              {p.user?.fullName ?? `Psicóloga ${p.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </IconField>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="ai-from">Emissão de</label>
                    <IconField icon={Calendar}>
                      <Input id="ai-from" type="date" value={dataEmissaoFrom} onChange={(e) => { setDataEmissaoFrom(e.target.value); resetPage(); }} />
                    </IconField>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="ai-to">Até</label>
                    <IconField icon={Calendar}>
                      <Input id="ai-to" type="date" value={dataEmissaoTo} onChange={(e) => { setDataEmissaoTo(e.target.value); resetPage(); }} />
                    </IconField>
                  </div>
                  <div>
                    <span className={fieldLabel}>Status</span>
                    <IconField icon={Filter}>
                      <Select value={status} onValueChange={(v) => { setStatus(v); resetPage(); }}>
                        <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INVOICE_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </IconField>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="ai-search">Buscar</label>
                    <IconField icon={Search}>
                      <Input id="ai-search" placeholder="Tomador, nº…" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} />
                    </IconField>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard icon={<Receipt className="h-6 w-6 text-cp-action" />} tint="bg-cp-action-soft" label="Total de notas" value={summary?.totalCount ?? 0} sub="no filtro atual" />
                <MetricCard icon={<DollarSign className="h-6 w-6 text-cp-sage-ink" />} tint="bg-cp-sage-soft" label="Faturamento bruto" value={formatBRL(summary?.sumValorServicos ?? 0)} sub="valor dos serviços" />
                <MetricCard icon={<Wallet className="h-6 w-6 text-cp-lavender-ink" />} tint="bg-cp-lavender-soft" label="Faturamento líquido" value={formatBRL(summary?.sumValorLiquido ?? 0)} sub="após deduções" />
              </div>

              <div className={cn(cpCard, "p-4 sm:p-6")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[20px] font-semibold text-cp-ink">
                    <FileText className="h-5 w-5 text-cp-muted" />
                    Notas fiscais
                  </h3>
                  <button type="button" className={cpButton.secondary} onClick={handleExportCsv}>
                    <FileDown className="h-4 w-4" />
                    Exportar CSV
                  </button>
                </div>
                <InvoiceTable
                  rows={invoices}
                  isLoading={isLoading}
                  showPsychologist
                  onOpen={setSelectedInvoiceId}
                  onDownload={handleDownload}
                  empty={<p className="text-sm font-medium text-cp-ink">Nenhuma nota fiscal encontrada</p>}
                />
                <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
              </div>

              <InvoiceDetailModal
                open={selectedInvoice != null}
                onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
                invoice={selectedInvoice as InvoiceDetailRow | null}
                isAdmin={true}
                onDownload={handleDownload}
                onStatusChange={(id, newStatus) => statusMutation.mutate({ id, status: newStatus })}
              />
            </TabsContent>

            <TabsContent value="status" className="mt-0 space-y-6">
              <div className={cn(cpCard, "flex flex-wrap items-end gap-3 p-4 sm:p-5")}>
                <div>
                  <span className={fieldLabel}>Mês de referência</span>
                  <div className="flex gap-2">
                    <IconField icon={Calendar} className="w-44">
                      <Select value={statusMonth} onValueChange={setStatusMonth}>
                        <SelectTrigger data-testid="status-month" aria-label="Mês"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </IconField>
                    <Select value={statusYear} onValueChange={setStatusYear}>
                      <SelectTrigger className="h-11 w-28 rounded-xl border-cp-border" data-testid="status-year" aria-label="Ano"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {isLoadingStatus ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-cp-action" /></div>
              ) : isStatusError || !invoiceStatus ? (
                <p className="py-12 text-center text-sm text-cp-muted">Não foi possível carregar o status deste mês.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard icon={<Users className="h-6 w-6 text-cp-action" />} tint="bg-cp-action-soft" label="Total de usuários" value={invoiceStatus.totalUsers} sub="que emitem nota" />
                    <MetricCard icon={<CheckCircle2 className="h-6 w-6 text-cp-success" />} tint="bg-cp-sage-soft" label="Já enviaram" value={invoiceStatus.totalSent} sub="no mês" />
                    <MetricCard icon={<Clock className="h-6 w-6 text-cp-warning" />} tint="bg-cp-warning-soft" label="Pendentes" value={invoiceStatus.totalPending} sub="ainda não enviaram" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <UserList
                      title="Já enviaram"
                      icon={<CheckCircle2 className="h-5 w-5 text-cp-success" />}
                      users={invoiceStatus.sent}
                      tone="success"
                      empty="Ninguém enviou nota para este mês ainda."
                      testPrefix="user-sent"
                    />
                    <UserList
                      title="Ainda não enviaram"
                      icon={<Clock className="h-5 w-5 text-cp-warning" />}
                      users={invoiceStatus.pending}
                      tone="warning"
                      empty="Todos já enviaram."
                      testPrefix="user-pending"
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
