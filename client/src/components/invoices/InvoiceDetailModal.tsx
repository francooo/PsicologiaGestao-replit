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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ZoomIn, ZoomOut, Image as ImageIcon, FileText, Receipt, Ban } from "lucide-react";
import { cpButton } from "@/components/cp/PageHeader";
import { InvoiceStatusBadge, emissionDate, money, uploadDate } from "./invoice-ui";

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
  onCancel?: (id: number) => void;
  onStatusChange?: (id: number, status: string) => void;
}

export function InvoiceDetailModal({
  open,
  onOpenChange,
  invoice,
  isAdmin,
  onDownload,
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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3 rounded-xl border border-cp-divider bg-white p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">{title}</h3>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string }) =>
    value === "—" ? null : (
      <div className="flex gap-2">
        <dt className="w-36 shrink-0 text-cp-muted">{label}</dt>
        <dd className="break-words text-cp-ink">{value}</dd>
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-2xl bg-cp-bg">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cp-sage-soft text-cp-sage-ink">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-[20px] font-bold text-cp-ink">
              Nota Fiscal Nº {invoice.numeroNota ?? invoice.id}
              {invoice.serie != null && invoice.serie !== "" && (
                <span className="text-base font-normal text-cp-muted">Série {invoice.serie}</span>
              )}
              <InvoiceStatusBadge status={invoice.status} />
            </DialogTitle>
            <p className="text-sm text-cp-muted">
              Emissão: {emissionDate(invoice.dataEmissao)}
              {invoice.dataUpload && ` · Registrada em ${uploadDate(invoice.dataUpload)}`}
              {isAdmin && invoice.user?.fullName && ` · ${invoice.user.fullName}`}
            </p>
          </div>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="h-auto justify-start gap-1 rounded-xl bg-white p-1">
            <TabsTrigger value="dados" className="gap-1.5 rounded-lg data-[state=active]:bg-cp-sage-soft data-[state=active]:text-cp-sage-ink data-[state=active]:shadow-none">
              <FileText className="w-4 h-4" />
              Dados da Nota
            </TabsTrigger>
            <TabsTrigger value="imagem" className="gap-1.5 rounded-lg data-[state=active]:bg-cp-sage-soft data-[state=active]:text-cp-sage-ink data-[state=active]:shadow-none">
              <ImageIcon className="w-4 h-4" />
              Imagem Original
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="rounded-xl focus-visible:ring-1 focus-visible:ring-cp-action/40 focus-visible:ring-offset-0 flex-1 overflow-y-auto mt-3 pr-2 space-y-2">
            <Section title="Identificação">
              <Row label="Chave NF-e" value={field(invoice.chaveNfe)} />
              <Row label="Número" value={field(invoice.numeroNota)} />
              <Row label="Série" value={field(invoice.serie)} />
              <Row label="Data emissão" value={emissionDate(invoice.dataEmissao)} />
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
              <Row label="Valor serviços" value={money(invoice.valorServicos ?? null)} />
              <Row label="Deduções" value={money(invoice.valorDeducoes ?? null)} />
              <Row label="Base de cálculo" value={money(invoice.baseCalculo ?? null)} />
              <Row label="Valor ISS" value={money(invoice.valorIss ?? null)} />
              <Row label="PIS" value={money(invoice.valorPis ?? null)} />
              <Row label="COFINS" value={money(invoice.valorCofins ?? null)} />
              <Row label="INSS" value={money(invoice.valorInss ?? null)} />
              <Row label="IR" value={money(invoice.valorIr ?? null)} />
              <Row label="CSLL" value={money(invoice.valorCsll ?? null)} />
              <Row label="Valor líquido" value={money(invoice.valorLiquido)} />
            </Section>
            {field(invoice.observacoes) !== "—" && (
              <Section title="Observações">
                <p className="whitespace-pre-wrap text-cp-ink">{invoice.observacoes}</p>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="imagem" className="rounded-xl focus-visible:ring-1 focus-visible:ring-cp-action/40 focus-visible:ring-offset-0 flex-1 overflow-hidden mt-3 min-h-[200px]">
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" size="sm" className="rounded-lg border-cp-border" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-cp-border" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-cp-border" onClick={() => onDownload(invoice.id)}>
                  <Download className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
              </div>
              <div className="flex-1 overflow-auto rounded-xl border border-dashed border-cp-border bg-white p-4 flex items-center justify-center min-h-[240px]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Nota fiscal"
                    className="max-w-full object-contain transition-transform"
                    style={{ transform: `scale(${zoom})` }}
                  />
                ) : invoice.imagePath ? (
                  <p className="text-sm text-cp-muted">Carregando imagem…</p>
                ) : (
                  <p className="text-sm text-cp-muted">Imagem não disponível.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-wrap gap-2 border-t border-cp-divider pt-4 sm:justify-between">
          <button type="button" className={cpButton.secondary} onClick={() => onOpenChange(false)}>
            Fechar
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={cpButton.secondary} onClick={() => onDownload(invoice.id)}>
              <Download className="h-4 w-4" />
              Baixar imagem
            </button>
            {!isAdmin && onCancel && invoice.status !== "cancelada" && (
              <button type="button" className={`${cpButton.secondary} border-cp-danger/30 text-cp-danger hover:bg-cp-danger-soft`} onClick={() => onCancel(invoice.id)}>
                <Ban className="h-4 w-4" />
                Cancelar Nota
              </button>
            )}
            {isAdmin && onStatusChange && (
              <Select
                value={invoice.status}
                onValueChange={(value) => onStatusChange(invoice.id, value)}
              >
                <SelectTrigger className="h-11 w-40 rounded-xl border-cp-border" aria-label="Alterar status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
