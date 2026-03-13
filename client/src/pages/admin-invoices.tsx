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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  DollarSign,
  Receipt,
} from "lucide-react";
import { InvoiceDetailModal, type InvoiceDetailRow } from "@/components/invoices/InvoiceDetailModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface InvoiceStatusResponse {
  referenceMonth: string;
  sent: { id: number; fullName: string; email: string; role: string }[];
  pending: { id: number; fullName: string; email: string; role: string }[];
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

export default function AdminInvoices() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [psychologistId, setPsychologistId] = useState<string>("all");
  const [dataEmissaoFrom, setDataEmissaoFrom] = useState("");
  const [dataEmissaoTo, setDataEmissaoTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [statusMonth, setStatusMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [statusYear, setStatusYear] = useState(new Date().getFullYear().toString());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const statusReferenceMonth = `${statusYear}-${statusMonth}`;

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    if (psychologistId && psychologistId !== "all") p.set("psychologist_id", psychologistId);
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [page, psychologistId, dataEmissaoFrom, dataEmissaoTo, status, search]);

  const summaryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (psychologistId && psychologistId !== "all") p.set("psychologist_id", psychologistId);
    if (dataEmissaoFrom) p.set("data_emissao_from", dataEmissaoFrom);
    if (dataEmissaoTo) p.set("data_emissao_to", dataEmissaoTo);
    if (status && status !== "all") p.set("status", status);
    return p.toString();
  }, [psychologistId, dataEmissaoFrom, dataEmissaoTo, status]);

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

  const { data: invoiceStatus } = useQuery<InvoiceStatusResponse>({
    queryKey: ["/api/admin/invoices/status", statusReferenceMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/invoices/status?referenceMonth=${statusReferenceMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar status");
      return res.json();
    },
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" }, { value: "03", label: "Março" },
    { value: "04", label: "Abril" }, { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
    { value: "07", label: "Julho" }, { value: "08", label: "Agosto" }, { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-darkest" data-testid="text-page-title">
              Notas Fiscais — Todas as Psicólogas
            </h1>
            <p className="text-neutral-dark">Visão consolidada das notas fiscais da clínica</p>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-invoices">
                <FileText className="w-4 h-4 mr-2" />
                Todas as Notas
              </TabsTrigger>
              <TabsTrigger value="status" data-testid="tab-status">
                <Users className="w-4 h-4 mr-2" />
                Status por Mês
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-neutral-dark" />
                <Select value={psychologistId} onValueChange={(v) => { setPsychologistId(v); setPage(0); }}>
                  <SelectTrigger className="w-48" data-testid="filter-psychologist">
                    <SelectValue placeholder="Psicóloga" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as psicólogas</SelectItem>
                    {psychologists.map((p) => (
                      <SelectItem key={p.id} value={String(p.userId)}>
                        {p.user?.fullName ?? `Psicóloga ${p.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" className="w-40" placeholder="Data início" value={dataEmissaoFrom} onChange={(e) => { setDataEmissaoFrom(e.target.value); setPage(0); }} />
                <Input type="date" className="w-40" placeholder="Data fim" value={dataEmissaoTo} onChange={(e) => { setDataEmissaoTo(e.target.value); setPage(0); }} />
                <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value || "all"} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Buscar" className="w-40" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
                <Button variant="outline" size="sm" onClick={handleExportCsv}>Exportar CSV</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                        <p className="text-sm text-neutral-dark">Faturamento Bruto</p>
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
                        <p className="text-sm text-neutral-dark">Faturamento Líquido</p>
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
                    Notas Fiscais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !invoices.length ? (
                    <div className="text-center py-8 text-neutral-dark">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma nota fiscal encontrada.</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chave NF-e</TableHead>
                            <TableHead>Nº / Série</TableHead>
                            <TableHead>Data Emissão</TableHead>
                            <TableHead>Psicóloga</TableHead>
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
                              <TableCell className="font-mono text-xs" title={inv.chaveNfe ?? undefined}>{formatChaveNfe(inv.chaveNfe)}</TableCell>
                              <TableCell>{inv.numeroNota ?? "—"} {inv.serie ? `/ ${inv.serie}` : ""}</TableCell>
                              <TableCell>{inv.dataEmissao ? format(new Date(inv.dataEmissao), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                              <TableCell className="font-medium">{inv.user?.fullName ?? "—"}</TableCell>
                              <TableCell className="max-w-[140px] truncate" title={inv.tomadorNome ?? undefined}>{inv.tomadorNome ?? "—"}</TableCell>
                              <TableCell>{formatCurrency(inv.valorLiquido)}</TableCell>
                              <TableCell>{getStatusBadge(inv.status)}</TableCell>
                              <TableCell>{inv.dataUpload ? format(new Date(inv.dataUpload), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" onClick={() => handleDownload(inv.id)} title="Baixar" data-testid={`button-download-${inv.id}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
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
                            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
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
                isAdmin={true}
                onDownload={handleDownload}
                onStatusChange={(id, newStatus) => statusMutation.mutate({ id, status: newStatus })}
              />
            </TabsContent>

            <TabsContent value="status">
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Selecione o mês de referência</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Select value={statusMonth} onValueChange={setStatusMonth}>
                      <SelectTrigger className="w-32" data-testid="status-month"><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>
                        {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={statusYear} onValueChange={setStatusYear}>
                      <SelectTrigger className="w-24" data-testid="status-year"><SelectValue placeholder="Ano" /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              {invoiceStatus && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-dark">Total de Usuários</p>
                            <p className="text-2xl font-bold">{invoiceStatus.totalUsers}</p>
                          </div>
                          <Users className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-dark">Já enviaram</p>
                            <p className="text-2xl font-bold text-green-600">{invoiceStatus.totalSent}</p>
                          </div>
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-dark">Pendentes</p>
                            <p className="text-2xl font-bold text-amber-600">{invoiceStatus.totalPending}</p>
                          </div>
                          <XCircle className="w-8 h-8 text-amber-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-5 h-5" />
                          Já enviaram ({invoiceStatus.totalSent})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {invoiceStatus.sent.length === 0 ? (
                          <p className="text-neutral-dark text-center py-4">Nenhum usuário enviou nota para este mês.</p>
                        ) : (
                          <div className="space-y-2">
                            {invoiceStatus.sent.map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md" data-testid={`user-sent-${user.id}`}>
                                <div>
                                  <p className="font-medium">{user.fullName}</p>
                                  <p className="text-sm text-neutral-dark">{user.email}</p>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-600">{user.role}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                          <XCircle className="w-5 h-5" />
                          Ainda não enviaram ({invoiceStatus.totalPending})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {invoiceStatus.pending.length === 0 ? (
                          <p className="text-neutral-dark text-center py-4">Todos já enviaram.</p>
                        ) : (
                          <div className="space-y-2">
                            {invoiceStatus.pending.map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md" data-testid={`user-pending-${user.id}`}>
                                <div>
                                  <p className="font-medium">{user.fullName}</p>
                                  <p className="text-sm text-neutral-dark">{user.email}</p>
                                </div>
                                <Badge variant="outline" className="text-amber-600 border-amber-600">{user.role}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
