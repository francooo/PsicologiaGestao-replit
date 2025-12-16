import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvoiceWithUser {
  id: number;
  userId: number;
  referenceMonth: string;
  filePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    profileImage: string | null;
  };
}

interface InvoiceStatus {
  referenceMonth: string;
  sent: { id: number; fullName: string; email: string; role: string }[];
  pending: { id: number; fullName: string; email: string; role: string }[];
  totalUsers: number;
  totalSent: number;
  totalPending: number;
}

export default function AdminInvoices() {
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [statusMonth, setStatusMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [statusYear, setStatusYear] = useState(new Date().getFullYear().toString());

  const referenceMonthFilter = filterMonth && filterYear ? `${filterYear}-${filterMonth}` : undefined;
  const statusReferenceMonth = `${statusYear}-${statusMonth}`;

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<InvoiceWithUser[]>({
    queryKey: ["/api/admin/invoices", referenceMonthFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (referenceMonthFilter) params.append("referenceMonth", referenceMonthFilter);
      const response = await fetch(`/api/admin/invoices?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar notas fiscais");
      return response.json();
    },
  });

  const { data: invoiceStatus, isLoading: isLoadingStatus } = useQuery<InvoiceStatus>({
    queryKey: ["/api/admin/invoices/status", statusReferenceMonth],
    queryFn: async () => {
      const response = await fetch(`/api/admin/invoices/status?referenceMonth=${statusReferenceMonth}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar status");
      return response.json();
    },
  });

  const handleDownload = (id: number) => {
    window.open(`/api/invoices/${id}/download`, "_blank");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatMonth = (referenceMonth: string) => {
    const [year, month] = referenceMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      enviada: { label: "Enviada", variant: "default" },
      pendente: { label: "Pendente", variant: "secondary" },
      aprovada: { label: "Aprovada", variant: "outline" },
    };
    const { label, variant } = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-darkest" data-testid="text-page-title">
              Gestão de Notas Fiscais
            </h1>
            <p className="text-neutral-dark">
              Visualize e gerencie as notas fiscais de todos os usuários
            </p>
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
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Notas Fiscais Enviadas
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-4 h-4 text-neutral-dark" />
                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="w-32" data-testid="filter-month">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-24" data-testid="filter-year">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !invoices || invoices.length === 0 ? (
                    <div className="text-center py-8 text-neutral-dark">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma nota fiscal encontrada.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Mês de Referência</TableHead>
                          <TableHead>Arquivo</TableHead>
                          <TableHead>Data de Envio</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                            <TableCell className="font-medium">
                              {invoice.user.fullName}
                            </TableCell>
                            <TableCell className="text-neutral-dark">
                              {invoice.user.email}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-neutral-dark" />
                                {formatMonth(invoice.referenceMonth)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-neutral-dark" />
                                <span className="truncate max-w-[120px]" title={invoice.originalFilename}>
                                  {invoice.originalFilename}
                                </span>
                                <span className="text-xs text-neutral-dark">
                                  ({formatFileSize(invoice.fileSize)})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDownload(invoice.id)}
                                title="Baixar"
                                data-testid={`button-download-${invoice.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <CardTitle>Selecione o Mês de Referência</CardTitle>
                      <div className="flex items-center gap-2">
                        <Select value={statusMonth} onValueChange={setStatusMonth}>
                          <SelectTrigger className="w-32" data-testid="status-month">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={statusYear} onValueChange={setStatusYear}>
                          <SelectTrigger className="w-24" data-testid="status-year">
                            <SelectValue placeholder="Ano" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y.toString()}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {isLoadingStatus ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : invoiceStatus && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              <p className="text-sm text-neutral-dark">Já Enviaram</p>
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
                            Já Enviaram ({invoiceStatus.totalSent})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {invoiceStatus.sent.length === 0 ? (
                            <p className="text-neutral-dark text-center py-4">
                              Nenhum usuário enviou nota para este mês ainda.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {invoiceStatus.sent.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                                  data-testid={`user-sent-${user.id}`}
                                >
                                  <div>
                                    <p className="font-medium">{user.fullName}</p>
                                    <p className="text-sm text-neutral-dark">{user.email}</p>
                                  </div>
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    {user.role}
                                  </Badge>
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
                            Ainda Não Enviaram ({invoiceStatus.totalPending})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {invoiceStatus.pending.length === 0 ? (
                            <p className="text-neutral-dark text-center py-4">
                              Todos os usuários já enviaram suas notas.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {invoiceStatus.pending.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md"
                                  data-testid={`user-pending-${user.id}`}
                                >
                                  <div>
                                    <p className="font-medium">{user.fullName}</p>
                                    <p className="text-sm text-neutral-dark">{user.email}</p>
                                  </div>
                                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                                    {user.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
