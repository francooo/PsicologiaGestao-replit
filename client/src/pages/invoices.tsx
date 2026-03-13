import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { InvoiceRegisterDrawer } from "@/components/invoices/InvoiceRegisterDrawer";
import { InvoiceDetailModal, type InvoiceDetailRow } from "@/components/invoices/InvoiceDetailModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  DollarSign,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "ativa", label: "Ativa" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelada", label: "Cancelada" },
];

function formatChaveNfe(chave: string | null): string {
  if (!chave) return "—";
  if (chave.length <= 20) return chave;
  return `${chave.slice(0, 8)}...${chave.slice(-8)}`;
}

function formatCurrency(value: string | null): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export default function Invoices() {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [dataEmissaoFrom, setDataEmissaoFrom] = useState("");
  const [dataEmissaoTo, setDataEmissaoTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [page, dataEmissaoFrom, dataEmissaoTo, status, search]);

  const summaryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    return p.toString();
  }, [dataEmissaoFrom, dataEmissaoTo, status]);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/summary"] });
      toast({ title: "Sucesso", description: "Nota fiscal excluída com sucesso." });
      setSelectedInvoiceId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/invoices/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/summary"] });
      toast({ title: "Sucesso", description: "Status atualizado." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDownload = (id: number) => {
    window.open(`/api/invoices/${id}/download`, "_blank");
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta nota fiscal?")) deleteMutation.mutate(id);
  };

  const handleCancelNote = (id: number) => {
    if (confirm("Tem certeza que deseja cancelar esta nota fiscal?")) statusMutation.mutate({ id, status: "cancelada" });
  };

  const handleExportCsv = () => {
    const headers = ["Chave NF-e", "Número", "Série", "Data Emissão", "Tomador", "Valor Líquido", "Status", "Registrada em"];
    const rows = invoices.map((inv) => [
      inv.chaveNfe ?? "",
      inv.numeroNota ?? "",
      inv.serie ?? "",
      inv.dataEmissao ?? "",
      inv.tomadorNome ?? "",
      inv.valorLiquido ?? "",
      inv.status ?? "",
      inv.dataUpload ? format(new Date(inv.dataUpload), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "minhas-notas-fiscais.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "Exportado", description: "CSV baixado com sucesso." });
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ativa: { label: "Ativa", variant: "default" },
      pendente: { label: "Pendente", variant: "secondary" },
      cancelada: { label: "Cancelada", variant: "destructive" },
    };
    const { label, variant } = map[s] ?? { label: s, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const selectedInvoice = selectedInvoiceId != null ? invoices.find((i) => i.id === selectedInvoiceId) : null;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest" data-testid="text-page-title">
                Minhas Notas Fiscais
              </h1>
              <p className="text-neutral-dark">Registre e gerencie suas notas fiscais de serviços</p>
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button data-testid="button-register-invoice">
                  <Upload className="w-4 h-4 mr-2" />
                  Registrar Nota
                </Button>
              </SheetTrigger>
              <InvoiceRegisterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
            </Sheet>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Input
              type="date"
              placeholder="Data início"
              className="w-40"
              value={dataEmissaoFrom}
              onChange={(e) => { setDataEmissaoFrom(e.target.value); setPage(0); }}
            />
            <Input
              type="date"
              placeholder="Data fim"
              className="w-40"
              value={dataEmissaoTo}
              onChange={(e) => { setDataEmissaoTo(e.target.value); setPage(0); }}
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar paciente/tomador"
              className="w-48"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={invoices.length === 0}>
              Exportar CSV
            </Button>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-dark">Total de Notas</p>
                    <p className="text-2xl font-bold">{summary?.totalCount ?? 0}</p>
                  </div>
                  <Receipt className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-dark">Receita Bruta</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary?.sumValorServicos ?? null)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-dark">Receita Líquida</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary?.sumValorLiquido ?? null)}</p>
                  </div>
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Listagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !invoices.length ? (
                <div className="text-center py-8 text-neutral-dark">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota fiscal registrada.</p>
                  <p className="text-sm mt-2">Clique em &quot;Registrar Nota&quot; para começar.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chave NF-e</TableHead>
                        <TableHead>Nº / Série</TableHead>
                        <TableHead>Data Emissão</TableHead>
                        <TableHead>Paciente / Tomador</TableHead>
                        <TableHead>Valor Líquido</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registrada em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          data-testid={`row-invoice-${inv.id}`}
                        >
                          <TableCell className="font-mono text-xs" title={inv.chaveNfe ?? undefined}>
                            {formatChaveNfe(inv.chaveNfe)}
                          </TableCell>
                          <TableCell>{inv.numeroNota ?? "—"} {inv.serie ? `/ ${inv.serie}` : ""}</TableCell>
                          <TableCell>{inv.dataEmissao ? format(new Date(inv.dataEmissao), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate" title={inv.tomadorNome ?? undefined}>
                            {inv.tomadorNome ?? "—"}
                          </TableCell>
                          <TableCell>{formatCurrency(inv.valorLiquido)}</TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell>{inv.dataUpload ? format(new Date(inv.dataUpload), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => handleDownload(inv.id)} title="Baixar imagem">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(inv.id)} title="Excluir" data-testid={`button-delete-${inv.id}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-neutral-dark">
                        Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total} notas
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                          Anterior
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <InvoiceDetailModal
            open={selectedInvoice != null}
            onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
            invoice={selectedInvoice as InvoiceDetailRow | null}
            isAdmin={false}
            onDownload={handleDownload}
            onEdit={() => toast({ title: "Em breve", description: "Edição de nota fiscal em desenvolvimento." })}
            onCancel={handleCancelNote}
          />
        </main>
      </div>
    </div>
  );
}
