import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InvoiceRegisterDrawer } from "@/components/invoices/InvoiceRegisterDrawer";
import { InvoiceDetailModal, type InvoiceDetailRow } from "@/components/invoices/InvoiceDetailModal";
import {
  INVOICE_STATUS_OPTIONS,
  InvoiceTable,
  Pagination,
  cpCard,
  emissionDate,
  uploadDate,
  useDebouncedValue,
} from "@/components/invoices/invoice-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Receipt, DollarSign, Wallet, Search, Calendar, FileDown, Filter, Loader2 } from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { MetricCard } from "@/components/cp/MetricCard";
import { IconField } from "@/components/cp/fields";
import { downloadCsv, formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface InvoiceRow {
  id: number;
  psychologistId: number;
  chaveNfe: string | null;
  numeroNota: string | null;
  serie: string | null;
  dataEmissao: string | null;
  dataUpload: string | null;
  tomadorNome: string | null;
  tomadorCpfCnpj: string | null;
  valorLiquido: string | null;
  valorServicos: string | null;
  status: string;
  imagePath: string | null;
  imageUrl: string | null;
  [key: string]: unknown;
}

interface InvoicesResponse {
  invoices: InvoiceRow[];
  total: number;
}

interface SummaryResponse {
  totalCount: number;
  sumValorServicos: string;
  sumValorLiquido: string;
}

const PAGE_SIZE = 20;
const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";

type PendingAction = { kind: "delete" | "cancel"; id: number } | null;

export default function Invoices() {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [dataEmissaoFrom, setDataEmissaoFrom] = useState("");
  const [dataEmissaoTo, setDataEmissaoTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    return p;
  }, [dataEmissaoFrom, dataEmissaoTo, status]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [filterParams, page, debouncedSearch]);
  const summaryParams = filterParams.toString();

  const { data, isLoading } = useQuery<InvoicesResponse>({
    queryKey: ["/api/invoices", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar notas");
      return res.json();
    },
  });

  const { data: summary } = useQuery<SummaryResponse>({
    queryKey: ["/api/invoices/summary", summaryParams],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/summary?${summaryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar resumo");
      return res.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices/summary"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      refresh();
      toast({ title: "Sucesso", description: "Nota fiscal excluída com sucesso." });
      setSelectedInvoiceId(null);
      setPending(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/invoices/${id}/status`, { status }),
    onSuccess: () => {
      refresh();
      toast({ title: "Sucesso", description: "Status atualizado." });
      setPending(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const handleDownload = (id: number) => {
    window.open(`/api/invoices/${id}/download`, "_blank");
  };

  // Exports every page of the current filter (the API caps each page at 100)
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const all: InvoiceRow[] = [];
      for (let offset = 0; ; offset += 100) {
        const p = new URLSearchParams(filterParams);
        p.set("limit", "100");
        p.set("offset", String(offset));
        if (debouncedSearch) p.set("search", debouncedSearch);
        const res = await fetch(`/api/invoices?${p}`, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao exportar");
        const page: InvoicesResponse = await res.json();
        all.push(...page.invoices);
        if (all.length >= page.total || page.invoices.length === 0) break;
      }
      downloadCsv(
        "minhas-notas-fiscais.csv",
        ["Chave NF-e", "Número", "Série", "Data Emissão", "Tomador", "Valor Líquido", "Status", "Registrada em"],
        all.map((inv) => [
          inv.chaveNfe ?? "",
          inv.numeroNota ?? "",
          inv.serie ?? "",
          emissionDate(inv.dataEmissao),
          inv.tomadorNome ?? "",
          inv.valorLiquido ? Number(inv.valorLiquido).toFixed(2).replace(".", ",") : "",
          inv.status ?? "",
          uploadDate(inv.dataUpload),
        ]),
      );
      toast({ title: "Exportado", description: `${all.length} nota(s) no CSV.` });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha ao exportar", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedInvoice = selectedInvoiceId != null ? invoices.find((i) => i.id === selectedInvoiceId) : null;
  const resetPage = () => setPage(0);

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Minhas Notas Fiscais"
            subtitle="Registre e gerencie suas notas fiscais de serviços"
            phrase
            actions={
              <>
                <button type="button" className={cpButton.secondary} onClick={handleExportCsv} disabled={total === 0 || isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Exportar CSV
                </button>
                <button type="button" className={cpButton.primary} onClick={() => setDrawerOpen(true)} data-testid="button-register-invoice">
                  <Upload className="h-4 w-4" />
                  Registrar Nota
                </button>
              </>
            }
          />
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <InvoiceRegisterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
          </Sheet>

          {/* Filtros */}
          <div className={cn(cpCard, "mb-6 p-4 sm:p-5")}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className={fieldLabel} htmlFor="inv-from">Emissão de</label>
                <IconField icon={Calendar}>
                  <Input id="inv-from" type="date" value={dataEmissaoFrom} onChange={(e) => { setDataEmissaoFrom(e.target.value); resetPage(); }} />
                </IconField>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="inv-to">Até</label>
                <IconField icon={Calendar}>
                  <Input id="inv-to" type="date" value={dataEmissaoTo} onChange={(e) => { setDataEmissaoTo(e.target.value); resetPage(); }} />
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
                <label className={fieldLabel} htmlFor="inv-search">Buscar</label>
                <IconField icon={Search}>
                  <Input id="inv-search" placeholder="Paciente ou tomador" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} />
                </IconField>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard icon={<Receipt className="h-6 w-6 text-cp-action" />} tint="bg-cp-action-soft" label="Total de notas" value={summary?.totalCount ?? 0} sub="no filtro atual" />
            <MetricCard icon={<DollarSign className="h-6 w-6 text-cp-sage-ink" />} tint="bg-cp-sage-soft" label="Receita bruta" value={formatBRL(summary?.sumValorServicos ?? 0)} sub="valor dos serviços" />
            <MetricCard icon={<Wallet className="h-6 w-6 text-cp-lavender-ink" />} tint="bg-cp-lavender-soft" label="Receita líquida" value={formatBRL(summary?.sumValorLiquido ?? 0)} sub="após deduções" />
          </div>

          <div className={cn(cpCard, "p-4 sm:p-6")}>
            <h3 className="mb-4 flex items-center gap-2 text-[20px] font-semibold text-cp-ink">
              <FileText className="h-5 w-5 text-cp-muted" />
              Notas registradas
            </h3>
            <InvoiceTable
              rows={invoices}
              isLoading={isLoading}
              onOpen={setSelectedInvoiceId}
              onDownload={handleDownload}
              onDelete={(id) => setPending({ kind: "delete", id })}
              empty={
                <>
                  <p className="text-sm font-medium text-cp-ink">Nenhuma nota fiscal encontrada</p>
                  <p className="mt-1 text-xs text-cp-muted">Clique em "Registrar Nota" para começar.</p>
                </>
              }
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          </div>

          <InvoiceDetailModal
            open={selectedInvoice != null}
            onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
            invoice={selectedInvoice as InvoiceDetailRow | null}
            isAdmin={false}
            onDownload={handleDownload}
            onCancel={(id) => setPending({ kind: "cancel", id })}
          />

          <AlertDialog open={pending !== null} onOpenChange={(o) => { if (!o) setPending(null); }}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-cp-ink">
                  {pending?.kind === "delete" ? "Excluir nota fiscal?" : "Cancelar nota fiscal?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pending?.kind === "delete"
                    ? "A nota e a imagem serão removidas definitivamente."
                    : "A nota ficará marcada como cancelada e deixa de contar no faturamento."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-cp-danger hover:bg-cp-danger/90"
                  disabled={deleteMutation.isPending || statusMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!pending) return;
                    if (pending.kind === "delete") deleteMutation.mutate(pending.id);
                    else statusMutation.mutate({ id: pending.id, status: "cancelada" });
                  }}
                >
                  {(deleteMutation.isPending || statusMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {pending?.kind === "delete" ? "Excluir" : "Cancelar nota"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
