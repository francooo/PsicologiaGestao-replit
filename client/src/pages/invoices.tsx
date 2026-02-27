import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Calendar,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invoice {
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
}

export default function Invoices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar nota fiscal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Sucesso!",
        description: "Nota fiscal enviada com sucesso.",
      });
      setIsDialogOpen(false);
      setSelectedFile(null);
      setSelectedMonth("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Sucesso!",
        description: "Nota fiscal excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Apenas arquivos PDF, JPG ou PNG são permitidos.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 5MB.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile || !selectedMonth || !selectedYear) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o mês de referência e o arquivo.",
        variant: "destructive",
      });
      return;
    }

    const referenceMonth = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;
    const formData = new FormData();
    formData.append("invoiceFile", selectedFile);
    formData.append("referenceMonth", referenceMonth);

    uploadMutation.mutate(formData);
  };

  const handleDownload = (id: number) => {
    window.open(`/api/invoices/${id}/download`, "_blank");
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta nota fiscal?")) {
      deleteMutation.mutate(id);
    }
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest" data-testid="text-page-title">
                Minhas Notas Fiscais
              </h1>
              <p className="text-neutral-dark">
                Envie e gerencie suas notas fiscais mensais
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-invoice">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Nota Fiscal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Enviar Nota Fiscal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Mês</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger data-testid="select-month">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Ano</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger data-testid="select-year">
                          <SelectValue placeholder="Selecione" />
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

                  <div className="space-y-2">
                    <Label htmlFor="file">Arquivo (PDF, JPG ou PNG - máx. 5MB)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      data-testid="input-file"
                    />
                    {selectedFile && (
                      <p className="text-sm text-neutral-dark">
                        Arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={uploadMutation.isPending || !selectedFile || !selectedMonth}
                    className="w-full"
                    data-testid="button-submit-invoice"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notas Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="text-center py-8 text-neutral-dark">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota fiscal enviada ainda.</p>
                  <p className="text-sm mt-2">Clique em "Enviar Nota Fiscal" para começar.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês de Referência</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Data de Envio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-dark" />
                            {formatMonth(invoice.referenceMonth)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-neutral-dark" />
                            <span className="truncate max-w-[150px]" title={invoice.originalFilename}>
                              {invoice.originalFilename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(invoice.fileSize)}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownload(invoice.id)}
                              title="Baixar"
                              data-testid={`button-download-${invoice.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(invoice.id)}
                              title="Excluir"
                              data-testid={`button-delete-${invoice.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
