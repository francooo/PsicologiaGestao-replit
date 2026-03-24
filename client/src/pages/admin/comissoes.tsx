import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HandCoins,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Settings,
  ChevronDown,
  Loader2,
} from "lucide-react";

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

function fmtBRL(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthStart(m: string) {
  return `${m}-01`;
}

function monthEnd(m: string) {
  const [y, mo] = m.split("-");
  const last = new Date(parseInt(y), parseInt(mo), 0).getDate();
  return `${m}-${last.toString().padStart(2, "0")}`;
}

function statusBadge(status: string) {
  if (status === "paid")
    return <Badge className="bg-green-100 text-green-800 border-green-200" data-testid="badge-status-paid">Pago</Badge>;
  if (status === "cancelled")
    return <Badge className="bg-red-100 text-red-800 border-red-200" data-testid="badge-status-cancelled">Cancelado</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" data-testid="badge-status-pending">Pendente</Badge>;
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

  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
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

  const { data: psychologists = [] } = useQuery<Array<{ id: number; userId: number; user?: { fullName: string } }>>({
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

  const generateMutation = useMutation({
    mutationFn: (data: { psychologistId: number; periodStart: string; periodEnd: string }) =>
      apiRequest("POST", "/api/admin/commissions/generate", data),
    onSuccess: () => {
      toast({ title: "Comissionamento gerado com sucesso!" });
      setShowGenerate(false);
      setGenPreview(null);
      setGenPsychId("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions/dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions/dashboard"] });
    },
    onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/commissions/${id}/cancel`, {}),
    onSuccess: () => {
      toast({ title: "Comissionamento cancelado." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions/dashboard"] });
    },
    onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
  });

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
      setCfgPsychId(""); setCfgType("percentual"); setCfgValue(""); setCfgFrom(monthStart(currentMonth())); setCfgUntil(""); setEditingCfgId(null);
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
      const data = await res.json();
      setGenPreview(data);
    } catch {
      toast({ title: "Erro ao carregar preview", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  }

  function getPsychName(id: number) {
    const p = psychologists.find((x) => x.id === id);
    return p?.user?.fullName ?? `Psicóloga #${id}`;
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
    <div className="flex h-screen bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <HandCoins className="w-6 h-6 text-primary" />
                Comissões
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestão de repasses financeiros das psicólogas</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(true)}
                data-testid="button-open-config"
              >
                <Settings className="w-4 h-4 mr-1.5" />
                Configurar Repasses
              </Button>
              <Button
                size="sm"
                onClick={() => setShowGenerate(true)}
                data-testid="button-generate-commission"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Gerar Comissionamento
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-slate-500 mb-1">Total Pendente</p>
                <p className="text-xl font-bold text-yellow-600" data-testid="kpi-pendente">
                  {fmtBRL(dashboard?.totalPendente ?? "0")}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-slate-500 mb-1">Total Pago</p>
                <p className="text-xl font-bold text-green-600" data-testid="kpi-pago">
                  {fmtBRL(dashboard?.totalPago ?? "0")}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-slate-500 mb-1">Psicólogas</p>
                <p className="text-xl font-bold text-slate-800" data-testid="kpi-psicologas">
                  {dashboard?.numPsicologas ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-slate-500 mb-1">Locações no Período</p>
                <p className="text-xl font-bold text-slate-800" data-testid="kpi-locacoes">
                  {dashboard?.numLocacoes ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44 text-sm"
                data-testid="input-month-filter"
              />
            </div>
            <Select value={filterPsych} onValueChange={setFilterPsych}>
              <SelectTrigger className="w-52 text-sm" data-testid="select-psych-filter">
                <SelectValue placeholder="Todas as psicólogas" />
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
            <div className="flex gap-1" data-testid="status-filter-group">
              {[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Pendente" },
                { value: "paid", label: "Pago" },
                { value: "cancelled", label: "Cancelado" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={filterStatus === opt.value ? "default" : "outline"}
                  className="h-9 text-xs"
                  onClick={() => setFilterStatus(opt.value)}
                  data-testid={`status-btn-${opt.value}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card className="border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-600">Psicóloga</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Período</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Locações</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Valor Total</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Repasse</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Dt. Pagamento</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingComm ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                      Nenhum comissionamento encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((c) => (
                    <TableRow key={c.id} data-testid={`row-commission-${c.id}`}>
                      <TableCell className="font-medium text-sm text-slate-800">
                        {c.psychologistName ?? `Psicóloga #${c.psychologistId}`}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {fmtDate(c.periodStart)} – {fmtDate(c.periodEnd)}
                      </TableCell>
                      <TableCell className="text-sm text-right">{c.totalBookings}</TableCell>
                      <TableCell className="text-sm text-right">{fmtBRL(c.totalRoomsValue)}</TableCell>
                      <TableCell className="text-sm text-right font-semibold text-primary">
                        {fmtBRL(c.totalRepasse)}
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600" data-testid={`text-paydate-${c.id}`}>
                        {c.paymentDate ? fmtDate(c.paymentDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setShowDetail(c)}
                            data-testid={`button-detail-${c.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {c.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:text-green-700"
                                onClick={() => { setShowPay(c); setPayDate(new Date().toISOString().split("T")[0]); setPayMethod(""); setPayNotes(""); }}
                                data-testid={`button-pay-${c.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-500 hover:text-red-600"
                                onClick={() => setShowCancel(c)}
                                data-testid={`button-cancel-${c.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      {/* Generate Modal */}
      <Dialog open={showGenerate} onOpenChange={(o) => { setShowGenerate(o); if (!o) { setGenPreview(null); setGenPsychId(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Comissionamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Psicóloga</Label>
              <Select value={genPsychId} onValueChange={setGenPsychId}>
                <SelectTrigger data-testid="select-gen-psych">
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início do Período</Label>
                <Input
                  type="date"
                  value={genPeriodStart}
                  onChange={(e) => setGenPeriodStart(e.target.value)}
                  data-testid="input-gen-period-start"
                />
              </div>
              <div>
                <Label>Fim do Período</Label>
                <Input
                  type="date"
                  value={genPeriodEnd}
                  onChange={(e) => setGenPeriodEnd(e.target.value)}
                  data-testid="input-gen-period-end"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPreview}
              disabled={!genPsychId || loadingPreview}
              data-testid="button-load-preview"
            >
              {loadingPreview && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Calcular Preview
            </Button>

            {genPreview && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm space-y-2">
                <p className="font-semibold text-slate-700">Preview do Comissionamento</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Locações encontradas:</span>
                  <span className="font-medium">{genPreview.totalBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor total das locações:</span>
                  <span className="font-medium">{fmtBRL(genPreview.totalRoomsValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Repasse calculado:</span>
                  <span className="font-bold text-primary">{fmtBRL(genPreview.totalRepasse)}</span>
                </div>
                {genPreview.totalBookings > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left py-1">Data</th>
                          <th className="text-left py-1">Sala</th>
                          <th className="text-right py-1">Valor</th>
                          <th className="text-right py-1">Repasse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genPreview.items.map((item, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1">{fmtDate(item.bookingDate)}</td>
                            <td className="py-1">{item.roomName ?? "—"}</td>
                            <td className="py-1 text-right">{fmtBRL(item.bookingValue)}</td>
                            <td className="py-1 text-right font-medium text-primary">{fmtBRL(item.repasseValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancelar</Button>
            <Button
              onClick={() => generateMutation.mutate({
                psychologistId: parseInt(genPsychId),
                periodStart: genPeriodStart,
                periodEnd: genPeriodEnd,
              })}
              disabled={!genPsychId || generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Gerar Comissionamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Modal */}
      <Dialog open={!!showPay} onOpenChange={(o) => !o && setShowPay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {showPay && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-slate-700">{showPay.psychologistName}</p>
                <p className="text-slate-500 text-xs">{fmtDate(showPay.periodStart)} – {fmtDate(showPay.periodEnd)}</p>
                <p className="text-primary font-bold mt-1">{fmtBRL(showPay.totalRepasse)}</p>
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  data-testid="input-pay-date"
                />
              </div>
              <div>
                <Label>Método de Pagamento</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger data-testid="select-pay-method">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex.: comprovante enviado por e-mail"
                  data-testid="textarea-pay-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPay(null)}>Cancelar</Button>
            <Button
              onClick={() => payMutation.mutate({
                id: showPay!.id,
                paymentDate: payDate,
                paymentMethod: payMethod,
                paymentNotes: payNotes,
              })}
              disabled={payMutation.isPending || !payDate || !payMethod}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!showDetail} onOpenChange={(o) => !o && setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Comissionamento</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Psicóloga</p>
                  <p className="font-semibold">{showDetail.psychologistName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  {statusBadge(showDetail.status)}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Período</p>
                  <p className="font-medium">{fmtDate(showDetail.periodStart)} – {fmtDate(showDetail.periodEnd)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Repasse Total</p>
                  <p className="font-bold text-primary">{fmtBRL(showDetail.totalRepasse)}</p>
                </div>
                {showDetail.status === "paid" && (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Data de Pagamento</p>
                      <p className="font-medium">{fmtDate(showDetail.paymentDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Método</p>
                      <p className="font-medium">{showDetail.paymentMethod ?? "—"}</p>
                    </div>
                    {showDetail.paymentNotes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500">Observações</p>
                        <p className="text-sm">{showDetail.paymentNotes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Locações do Período</p>
                {loadingItems ? (
                  <div className="text-center py-4 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </div>
                ) : detailItems.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma locação registrada.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Sala</TableHead>
                          <TableHead className="text-xs">Horário</TableHead>
                          <TableHead className="text-xs text-right">Valor</TableHead>
                          <TableHead className="text-xs text-right">Repasse</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.map((item) => (
                          <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                            <TableCell className="text-xs">{fmtDate(item.bookingDate)}</TableCell>
                            <TableCell className="text-xs">{item.roomName ?? "—"}</TableCell>
                            <TableCell className="text-xs">
                              {item.startTime && item.endTime ? `${item.startTime.slice(0,5)} – ${item.endTime.slice(0,5)}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-right">{fmtBRL(item.bookingValue)}</TableCell>
                            <TableCell className="text-xs text-right font-semibold text-primary">{fmtBRL(item.repasseValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={!!showCancel} onOpenChange={(o) => !o && setShowCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar Comissionamento</DialogTitle>
          </DialogHeader>
          {showCancel && (
            <div className="text-sm text-slate-600 space-y-2">
              <p>Tem certeza que deseja cancelar o comissionamento de:</p>
              <p className="font-semibold text-slate-800">{showCancel.psychologistName}</p>
              <p className="text-slate-500">{fmtDate(showCancel.periodStart)} – {fmtDate(showCancel.periodEnd)}</p>
              <p className="text-slate-500">Repasse: <span className="font-medium text-primary">{fmtBRL(showCancel.totalRepasse)}</span></p>
              <p className="text-red-600 text-xs mt-2">Esta ação não pode ser desfeita.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(null)} data-testid="button-cancel-dismiss">Não, manter</Button>
            <Button
              variant="destructive"
              onClick={() => { cancelMutation.mutate(showCancel!.id); setShowCancel(null); }}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-confirm"
            >
              {cancelMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Sim, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Modal */}
      <Dialog open={showConfig} onOpenChange={(o) => { setShowConfig(o); if (!o) { setEditingCfgId(null); setCfgPsychId(""); setCfgValue(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Repasses</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Form */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">
                {editingCfgId ? "Editar Configuração" : "Nova Configuração"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Psicóloga</Label>
                  <Select value={cfgPsychId} onValueChange={setCfgPsychId} disabled={!!editingCfgId}>
                    <SelectTrigger data-testid="select-cfg-psych">
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
                </div>
                <div>
                  <Label>Tipo de Repasse</Label>
                  <Select value={cfgType} onValueChange={(v) => setCfgType(v as "percentual" | "fixed")}>
                    <SelectTrigger data-testid="select-cfg-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{cfgType === "percentual" ? "Percentual (%)" : "Valor (R$)"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cfgValue}
                    onChange={(e) => setCfgValue(e.target.value)}
                    placeholder={cfgType === "percentual" ? "Ex: 40" : "Ex: 150.00"}
                    data-testid="input-cfg-value"
                  />
                </div>
                <div>
                  <Label>Válido a partir de</Label>
                  <Input
                    type="date"
                    value={cfgFrom}
                    onChange={(e) => setCfgFrom(e.target.value)}
                    data-testid="input-cfg-from"
                  />
                </div>
                <div>
                  <Label>Válido até (opcional)</Label>
                  <Input
                    type="date"
                    value={cfgUntil}
                    onChange={(e) => setCfgUntil(e.target.value)}
                    data-testid="input-cfg-until"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editingCfgId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingCfgId(null); setCfgPsychId(""); setCfgValue(""); }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
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
                  {createConfigMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {editingCfgId ? "Salvar Alterações" : "Criar Configuração"}
                </Button>
              </div>
            </div>

            {/* Config list */}
            {configs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Configurações Cadastradas</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Psicóloga</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs">Vigência</TableHead>
                        <TableHead className="text-xs"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((cfg) => (
                        <TableRow key={cfg.id} data-testid={`row-config-${cfg.id}`}>
                          <TableCell className="text-xs font-medium">{cfg.psychologistName ?? `#${cfg.psychologistId}`}</TableCell>
                          <TableCell className="text-xs">
                            {cfg.payoutType === "percentual" ? "Percentual" : "Fixo"}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {cfg.payoutType === "percentual" ? `${cfg.payoutValue}%` : fmtBRL(cfg.payoutValue)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {fmtDate(cfg.validFrom)} – {cfg.validUntil ? fmtDate(cfg.validUntil) : "Atual"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => startEditConfig(cfg)}
                              data-testid={`button-edit-config-${cfg.id}`}
                            >
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
