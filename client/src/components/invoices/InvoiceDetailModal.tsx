import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ZoomIn, ZoomOut, Image as ImageIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface InvoiceDetailRow {
  id: number;
  psychologistId: number;
  chaveNfe: string | null;
  numeroNota: string | null;
  serie: string | null;
  dataEmissao: string | null;
  dataUpload: string | null;
  codigoVerificacao?: string | null;
  protocoloAutorizacao?: string | null;
  emitenteNome?: string | null;
  emitenteCnpjCpf?: string | null;
  emitenteCrp?: string | null;
  emitenteEndereco?: string | null;
  emitenteBairro?: string | null;
  emitenteMunicipio?: string | null;
  emitenteUf?: string | null;
  emitenteCep?: string | null;
  emitenteTelefone?: string | null;
  emitenteEmail?: string | null;
  tomadorNome: string | null;
  tomadorCpfCnpj?: string | null;
  tomadorEndereco?: string | null;
  tomadorBairro?: string | null;
  tomadorMunicipio?: string | null;
  tomadorUf?: string | null;
  tomadorCep?: string | null;
  tomadorEmail?: string | null;
  tomadorTelefone?: string | null;
  patientId?: number | null;
  descricaoServico?: string | null;
  codigoServico?: string | null;
  codigoCnae?: string | null;
  valorServicos?: string | null;
  valorDeducoes?: string | null;
  baseCalculo?: string | null;
  valorIss?: string | null;
  valorPis?: string | null;
  valorCofins?: string | null;
  valorInss?: string | null;
  valorIr?: string | null;
  valorCsll?: string | null;
  valorLiquido: string | null;
  observacoes?: string | null;
  status: string;
  imagePath?: string | null;
  user?: { fullName: string };
  [key: string]: unknown;
}

function formatCurrency(value: string | null): string {
  if (value == null || value === "") return "—";
  const n = parseFloat(value);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function field(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

interface InvoiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDetailRow | null;
  isAdmin: boolean;
  onDownload: (id: number) => void;
  onEdit?: (id: number) => void;
  onCancel?: (id: number) => void;
  onStatusChange?: (id: number, status: string) => void;
}

export function InvoiceDetailModal({
  open,
  onOpenChange,
  invoice,
  isAdmin,
  onDownload,
  onEdit,
  onCancel,
  onStatusChange,
}: InvoiceDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !invoice?.id || !invoice.imagePath) {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/invoices/${invoice.id}/image`, { credentials: "include" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
        const url = URL.createObjectURL(blob);
        imageUrlRef.current = url;
        setImageUrl(url);
      })
      .catch(() => setImageUrl(null));
    return () => {
      cancelled = true;
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
      setImageUrl(null);
    };
  }, [open, invoice?.id, invoice?.imagePath]);

  useEffect(() => {
    if (!open) setZoom(1);
  }, [open]);

  if (!invoice) return null;

  const getStatusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ativa: { label: "Ativa", variant: "default" },
      pendente: { label: "Pendente", variant: "secondary" },
      cancelada: { label: "Cancelada", variant: "destructive" },
    };
    const { label, variant } = map[s] ?? { label: s, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-neutral-dark mb-2">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string }) =>
    value === "—" ? null : (
      <div className="flex gap-2">
        <dt className="text-neutral-dark shrink-0 w-36">{label}</dt>
        <dd className="break-words">{value}</dd>
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nota Fiscal Nº {invoice.numeroNota ?? invoice.id}
            {invoice.serie != null && invoice.serie !== "" && (
              <span className="text-muted-foreground font-normal">Série {invoice.serie}</span>
            )}
            {getStatusBadge(invoice.status)}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Emissão: {invoice.dataEmissao ? format(new Date(invoice.dataEmissao), "dd/MM/yyyy", { locale: ptBR }) : "—"}
            {invoice.dataUpload && ` · Registrada em ${format(new Date(invoice.dataUpload), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
            {isAdmin && invoice.user?.fullName && ` · ${invoice.user.fullName}`}
          </p>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList>
            <TabsTrigger value="dados" className="gap-1">
              <FileText className="w-4 h-4" />
              Dados da Nota
            </TabsTrigger>
            <TabsTrigger value="imagem" className="gap-1">
              <ImageIcon className="w-4 h-4" />
              Imagem Original
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="flex-1 overflow-y-auto mt-3 pr-2 space-y-2">
            <Section title="Identificação">
              <Row label="Chave NF-e" value={field(invoice.chaveNfe)} />
              <Row label="Número" value={field(invoice.numeroNota)} />
              <Row label="Série" value={field(invoice.serie)} />
              <Row label="Data emissão" value={invoice.dataEmissao ? format(new Date(invoice.dataEmissao), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
              <Row label="Cód. verificação" value={field(invoice.codigoVerificacao)} />
              <Row label="Protocolo" value={field(invoice.protocoloAutorizacao)} />
            </Section>
            <Section title="Emitente (prestador)">
              <Row label="Nome" value={field(invoice.emitenteNome)} />
              <Row label="CPF/CNPJ" value={field(invoice.emitenteCnpjCpf)} />
              <Row label="CRP" value={field(invoice.emitenteCrp)} />
              <Row label="Endereço" value={field(invoice.emitenteEndereco)} />
              <Row label="Bairro" value={field(invoice.emitenteBairro)} />
              <Row label="Município" value={field(invoice.emitenteMunicipio)} />
              <Row label="UF" value={field(invoice.emitenteUf)} />
              <Row label="CEP" value={field(invoice.emitenteCep)} />
              <Row label="Telefone" value={field(invoice.emitenteTelefone)} />
              <Row label="E-mail" value={field(invoice.emitenteEmail)} />
            </Section>
            <Section title="Tomador (cliente/paciente)">
              <Row label="Nome" value={field(invoice.tomadorNome)} />
              <Row label="CPF/CNPJ" value={field(invoice.tomadorCpfCnpj)} />
              <Row label="Endereço" value={field(invoice.tomadorEndereco)} />
              <Row label="Bairro" value={field(invoice.tomadorBairro)} />
              <Row label="Município" value={field(invoice.tomadorMunicipio)} />
              <Row label="UF" value={field(invoice.tomadorUf)} />
              <Row label="CEP" value={field(invoice.tomadorCep)} />
              <Row label="E-mail" value={field(invoice.tomadorEmail)} />
              <Row label="Telefone" value={field(invoice.tomadorTelefone)} />
            </Section>
            <Section title="Serviço">
              <Row label="Descrição" value={field(invoice.descricaoServico)} />
              <Row label="Código serviço" value={field(invoice.codigoServico)} />
              <Row label="CNAE" value={field(invoice.codigoCnae)} />
            </Section>
            <Section title="Tributos e valores">
              <Row label="Valor serviços" value={formatCurrency(invoice.valorServicos ?? null)} />
              <Row label="Deduções" value={formatCurrency(invoice.valorDeducoes ?? null)} />
              <Row label="Base de cálculo" value={formatCurrency(invoice.baseCalculo ?? null)} />
              <Row label="Valor ISS" value={formatCurrency(invoice.valorIss ?? null)} />
              <Row label="PIS" value={formatCurrency(invoice.valorPis ?? null)} />
              <Row label="COFINS" value={formatCurrency(invoice.valorCofins ?? null)} />
              <Row label="INSS" value={formatCurrency(invoice.valorInss ?? null)} />
              <Row label="IR" value={formatCurrency(invoice.valorIr ?? null)} />
              <Row label="CSLL" value={formatCurrency(invoice.valorCsll ?? null)} />
              <Row label="Valor líquido" value={formatCurrency(invoice.valorLiquido)} />
            </Section>
            {field(invoice.observacoes) !== "—" && (
              <Section title="Observações">
                <p className="whitespace-pre-wrap">{invoice.observacoes}</p>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="imagem" className="flex-1 overflow-hidden mt-3 min-h-[200px]">
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDownload(invoice.id)}>
                  <Download className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
              </div>
              <div className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 flex items-center justify-center min-h-[240px]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Nota fiscal"
                    className="max-w-full object-contain transition-transform"
                    style={{ transform: `scale(${zoom})` }}
                  />
                ) : invoice.imagePath ? (
                  <p className="text-sm text-muted-foreground">Carregando imagem…</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Imagem não disponível.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload(invoice.id)}>
            <Download className="w-4 h-4 mr-1" />
            Baixar imagem
          </Button>
          {!isAdmin && onEdit && (
            <Button size="sm" onClick={() => onEdit(invoice.id)}>
              Editar
            </Button>
          )}
          {!isAdmin && onCancel && invoice.status !== "cancelada" && (
            <Button size="sm" variant="destructive" onClick={() => onCancel(invoice.id)}>
              Cancelar Nota
            </Button>
          )}
          {isAdmin && onStatusChange && (
            <Select
              value={invoice.status}
              onValueChange={(value) => onStatusChange(invoice.id, value)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
