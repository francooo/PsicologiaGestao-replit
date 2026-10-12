export interface Invoice {
  id: number;
  psychologistId: number;
  chaveNfe: string | null;
  numeroNota: string | null;
  serie: string | null;
  dataEmissao: string | null;
  dataUpload: string | null;
  codigoVerificacao: string | null;
  protocoloAutorizacao: string | null;
  emitenteNome: string | null;
  emitenteCnpjCpf: string | null;
  emitenteCrp: string | null;
  emitenteEndereco: string | null;
  emitenteBairro: string | null;
  emitenteMunicipio: string | null;
  emitenteUf: string | null;
  emitenteCep: string | null;
  emitenteTelefone: string | null;
  emitenteEmail: string | null;
  tomadorNome: string | null;
  tomadorCpfCnpj: string | null;
  tomadorEndereco: string | null;
  tomadorBairro: string | null;
  tomadorMunicipio: string | null;
  tomadorUf: string | null;
  tomadorCep: string | null;
  tomadorEmail: string | null;
  tomadorTelefone: string | null;
  descricaoServico: string | null;
  codigoServico: string | null;
  codigoCnae: string | null;
  valorServicos: string | null;
  valorDeducoes: string | null;
  baseCalculo: string | null;
  valorIss: string | null;
  valorPis: string | null;
  valorCofins: string | null;
  valorInss: string | null;
  valorIr: string | null;
  valorCsll: string | null;
  valorLiquido: string | null;
  imageMimeType: string | null;
  observacoes: string | null;
  status: 'ativa' | 'pendente' | 'cancelada' | string;
  user?: { id: number; fullName: string; email: string } | null;
}

export interface InvoiceSummary {
  totalCount: number;
  sumValorServicos: string;
  sumValorLiquido: string;
}

export type AiField = { valor: unknown; confianca: number };
export type AiExtraction = Record<string, AiField>;
