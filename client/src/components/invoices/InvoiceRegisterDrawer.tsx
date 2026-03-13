import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Camera, AlertTriangle, FileText } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const PDF_MIME = "application/pdf";

type Step = 1 | 2 | 3;

interface ExtractedField {
  valor: unknown;
  confianca: number;
}

interface AnalyzeResponse {
  success: boolean;
  data: Record<string, ExtractedField>;
  ai_confidence_score: number;
}

function getConfidenceBadge(conf: number) {
  if (conf >= 0.85) return { label: "Alta", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  if (conf >= 0.6) return { label: "Média", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  if (conf > 0) return { label: "Baixa", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  return { label: "Não encontrado", className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" };
}

function val<T>(f: ExtractedField | undefined): T | "" {
  if (!f || f.valor == null || f.valor === "") return "" as T;
  return String(f.valor) as T;
}

interface InvoiceRegisterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceRegisterDrawer({ open, onOpenChange }: InvoiceRegisterDrawerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [extracted, setExtracted] = useState<Record<string, ExtractedField> | null>(null);
  const [aiConfidenceScore, setAiConfidenceScore] = useState(0);
  const [emitenteDivergencias, setEmitenteDivergencias] = useState<string | null>(null);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [confirmedSave, setConfirmedSave] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async (payload: { image: string; image_type: string; psychologist_profile: { nome?: string; email?: string } }) => {
      const res = await fetch("/api/invoices/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao analisar imagem");
      }
      return res.json() as Promise<AnalyzeResponse>;
    },
    onMutate: () => {
      setAnalysisMessage("Enviando imagem...");
    },
    onSuccess: (data) => {
      setAnalysisMessage("Preenchendo os campos!");
      setExtracted(data.data);
      setAiConfidenceScore(data.ai_confidence_score ?? 0);
      const div = data.data?.emitente_divergencias;
      setEmitenteDivergencias(div?.valor && typeof div.valor === "string" ? div.valor : null);
      setStep(2);
    },
    onError: (e: Error) => {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/summary"] });
      toast({ title: "Sucesso", description: "Nota fiscal registrada com sucesso." });
      onOpenChange(false);
      resetState();
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const resetState = useCallback(() => {
    setStep(1);
    setImageFile(null);
    setImageBase64("");
    setExtracted(null);
    setConfirmedReview(false);
    setConfirmedSave(false);
    setEmitenteDivergencias(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === PDF_MIME;
    const isImage = file.type.match(/^image\/(jpeg|png|webp)/);
    if (!isPdf && !isImage) {
      toast({ title: "Formato inválido", description: "Use PDF, JPEG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImageType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (!imageBase64) return;
    setAnalysisMessage("A IA está lendo sua nota...");
    analyzeMutation.mutate({
      image: imageBase64,
      image_type: imageType,
      psychologist_profile: { nome: user?.fullName, email: user?.email },
    });
  };

  const handleSave = () => {
    if (!extracted || !confirmedSave || !imageBase64) return;
    const d = extracted;
    const payload: Record<string, unknown> = {
      image: imageBase64,
      image_type: imageType,
      chave_nfe: val(d.chave_nfe),
      numero_nota: val(d.numero_nota),
      serie: val(d.serie),
      data_emissao: val(d.data_emissao),
      emitente_nome: val(d.emitente_nome) || user?.fullName,
      emitente_cnpj_cpf: val(d.emitente_cnpj_cpf),
      emitente_crp: val(d.emitente_crp),
      emitente_endereco: val(d.emitente_endereco),
      emitente_municipio: val(d.emitente_municipio),
      emitente_uf: val(d.emitente_uf),
      emitente_cep: val(d.emitente_cep),
      emitente_telefone: val(d.emitente_telefone),
      emitente_email: val(d.emitente_email) || user?.email,
      tomador_nome: val(d.tomador_nome),
      tomador_cpf_cnpj: val(d.tomador_cpf_cnpj),
      tomador_endereco: val(d.tomador_endereco),
      tomador_municipio: val(d.tomador_municipio),
      tomador_uf: val(d.tomador_uf),
      tomador_cep: val(d.tomador_cep),
      tomador_email: val(d.tomador_email),
      descricao_servico: val(d.descricao_servico),
      codigo_servico: val(d.codigo_servico) || "8.02",
      codigo_cnae: val(d.codigo_cnae),
      iss_retido: d.iss_retido?.valor === true,
      aliquota_iss: d.aliquota_iss?.valor != null ? Number(d.aliquota_iss.valor) : null,
      valor_servicos: d.valor_servicos?.valor != null ? Number(d.valor_servicos.valor) : null,
      valor_deducoes: d.valor_deducoes?.valor != null ? Number(d.valor_deducoes.valor) : 0,
      base_calculo: d.base_calculo?.valor != null ? Number(d.base_calculo.valor) : null,
      valor_iss: d.valor_iss?.valor != null ? Number(d.valor_iss.valor) : null,
      valor_liquido: d.valor_liquido?.valor != null ? Number(d.valor_liquido.valor) : d.valor_servicos?.valor != null ? Number(d.valor_servicos.valor) : null,
      valor_pis: d.valor_pis?.valor != null ? Number(d.valor_pis.valor) : null,
      valor_cofins: d.valor_cofins?.valor != null ? Number(d.valor_cofins.valor) : null,
      valor_inss: d.valor_inss?.valor != null ? Number(d.valor_inss.valor) : null,
      valor_ir: d.valor_ir?.valor != null ? Number(d.valor_ir.valor) : null,
      valor_csll: d.valor_csll?.valor != null ? Number(d.valor_csll.valor) : null,
      ai_raw_response: extracted,
      ai_confidence_score: aiConfidenceScore,
      ai_extracted_at: new Date().toISOString(),
      revisado_pela_psicologa: true,
      status: "ativa",
    };
    saveMutation.mutate(payload);
  };

  const hasLowConfidence = extracted && Object.values(extracted).some((f) => typeof f === "object" && f !== null && "confianca" in f && (f as ExtractedField).confianca > 0 && (f as ExtractedField).confianca < 0.6);

  return (
    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Registrar Nota Fiscal</SheetTitle>
        <div className="flex gap-2 text-sm text-neutral-dark">
          <span className={step >= 1 ? "font-medium text-primary" : ""}>1. Upload</span>
          <span>→</span>
          <span className={step >= 2 ? "font-medium text-primary" : ""}>2. Revisão</span>
          <span>→</span>
          <span className={step >= 3 ? "font-medium text-primary" : ""}>3. Confirmar</span>
        </div>
      </SheetHeader>

      <div className="py-6 space-y-6">
        {step === 1 && (
          <>
            <p className="text-sm text-neutral-dark">Selecione a nota fiscal em PDF, JPEG, PNG ou WebP — máx. 5MB. Para PDF, o texto será extraído automaticamente. Para imagens, será usada visão computacional.</p>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <input type="file" className="hidden" accept={ACCEPT_TYPES} onChange={handleFileChange} />
              {imageFile?.type === PDF_MIME
                ? <FileText className="w-10 h-10 text-primary mb-2" />
                : <Camera className="w-10 h-10 text-neutral-400 mb-2" />
              }
              <span className="text-sm text-neutral-dark">{imageFile ? imageFile.name : "Clique ou arraste o arquivo (PDF, JPEG, PNG, WebP)"}</span>
            </label>
            {imageFile && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {analysisMessage}
                    </>
                  ) : (
                    "Analisar com IA"
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {step === 2 && extracted && (
          <>
            {emitenteDivergencias && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Divergência nos dados do emitente</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">{emitenteDivergencias}</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label>Chave NF-e</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={val(extracted.chave_nfe)} readOnly className="font-mono text-xs" />
                  <span className={`text-xs px-2 py-0.5 rounded ${getConfidenceBadge(extracted.chave_nfe?.confianca ?? 0).className}`}>
                    {getConfidenceBadge(extracted.chave_nfe?.confianca ?? 0).label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Número</Label>
                  <Input value={val(extracted.numero_nota)} readOnly />
                </div>
                <div>
                  <Label>Série</Label>
                  <Input value={val(extracted.serie)} readOnly />
                </div>
              </div>
              <div>
                <Label>Data Emissão</Label>
                <Input type="date" value={val(extracted.data_emissao)} readOnly />
              </div>
              <p className="text-sm font-medium text-neutral-dark mt-2">Emitente (pré-preenchido com seu perfil)</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={val(extracted.emitente_nome) || user?.fullName || ""} readOnly />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={val(extracted.emitente_email) || user?.email || ""} readOnly />
                </div>
              </div>
              <p className="text-sm font-medium text-neutral-dark mt-2">Tomador</p>
              <div>
                <Label>Tomador (paciente / responsável)</Label>
                <Input value={val(extracted.tomador_nome)} readOnly />
              </div>
              <div>
                <Label>CPF/CNPJ Tomador</Label>
                <Input value={val(extracted.tomador_cpf_cnpj)} readOnly />
              </div>
              <div>
                <Label>Descrição do serviço</Label>
                <Textarea value={val(extracted.descricao_servico)} readOnly rows={2} />
              </div>
              <div>
                <Label>Valor dos serviços</Label>
                <Input value={extracted.valor_servicos?.valor != null ? String(extracted.valor_servicos.valor) : ""} readOnly />
              </div>
              <div>
                <Label>Valor líquido</Label>
                <Input value={extracted.valor_liquido?.valor != null ? String(extracted.valor_liquido.valor) : ""} readOnly className="font-semibold" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="review" checked={confirmedReview} onCheckedChange={(c) => setConfirmedReview(!!c)} />
              <label htmlFor="review" className="text-sm">Revisei os dados acima e confirmo que estão corretos.</label>
            </div>
            {hasLowConfidence && !confirmedReview && (
              <p className="text-xs text-amber-600">Alguns campos tiveram baixa confiança na leitura. Revise e marque a confirmação.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={hasLowConfidence && !confirmedReview}>
                Continuar para confirmação
              </Button>
            </div>
          </>
        )}

        {step === 3 && extracted && (
          <>
            <div className="rounded-lg border p-4 space-y-2">
              <p><strong>Chave NF-e:</strong> {val(extracted.chave_nfe) || "—"}</p>
              <p><strong>Tomador:</strong> {val(extracted.tomador_nome) || "—"}</p>
              <p><strong>Data emissão:</strong> {val(extracted.data_emissao) || "—"}</p>
              <p><strong>Valor líquido:</strong> R$ {extracted.valor_liquido?.valor != null ? Number(extracted.valor_liquido.valor).toFixed(2) : "—"}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="save" checked={confirmedSave} onCheckedChange={(c) => setConfirmedSave(!!c)} />
              <label htmlFor="save" className="text-sm">Revisei os dados acima e confirmo que estão corretos.</label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleSave} disabled={!confirmedSave || saveMutation.isPending}>
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar Nota Fiscal"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SheetContent>
  );
}
