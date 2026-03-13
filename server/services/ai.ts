import Groq from "groq-sdk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not set. AI summarization and invoice NFS-e image analysis will not work.");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CLINICAL_PROMPT = `Você é um assistente clínico especializado em psicologia. 
Analise o documento a seguir e forneça:

1. **Resumo objetivo** (máximo 150 palavras)
2. **Pontos de atenção clínica** (liste os principais achados relevantes para o acompanhamento psicológico)
3. **Insights terapêuticos** (observações que possam apoiar o psicólogo no atendimento)
4. **Sugestões de follow-up** (perguntas ou temas a explorar nas próximas sessões)

Seja preciso, empático e use linguagem técnica adequada à psicologia clínica.`;

const SUPPORTED_MIME_TYPES = ["application/pdf", "text/plain", "text/"];

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.some((supported) => mimeType.startsWith(supported));
}

async function extractTextFromBuffer(fileBuffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(fileBuffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new UnsupportedFormatError(
        "Não foi possível extrair texto deste PDF. O arquivo pode ser uma imagem ou estar protegido."
      );
    }
    return data.text;
  }
  return fileBuffer.toString("utf-8");
}

export async function summarizeDocument(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  if (!isSupportedMimeType(mimeType)) {
    throw new UnsupportedFormatError(
      `Formato não suportado: ${mimeType}. Apenas PDF e arquivos de texto são suportados.`
    );
  }

  let textContent: string;
  try {
    textContent = await extractTextFromBuffer(fileBuffer, mimeType);
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    throw new UnsupportedFormatError("Não foi possível processar este documento.");
  }

  const maxChars = 12000;
  if (textContent.length > maxChars) {
    textContent = textContent.slice(0, maxChars) + "\n\n[...documento truncado para análise...]";
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: CLINICAL_PROMPT,
        },
        {
          role: "user",
          content: `Documento: ${fileName}\n\n${textContent}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }
    return text;
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;

    const err = error as any;
    const status = err?.status || err?.statusCode || err?.error?.status;

    if (status === 429) {
      throw new AIQuotaError(
        "Limite de requisições atingido. Aguarde alguns instantes e tente novamente."
      );
    }

    console.error("Groq API error:", error);
    throw new AIServiceError("Erro ao conectar com a IA. Tente novamente.");
  }
}

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFormatError";
  }
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIQuotaError";
  }
}

// --- Invoice (NFS-e) image analysis with vision ---

const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_BASE64_SIZE_BYTES = 4 * 1024 * 1024; // 4MB Groq limit

export interface PsychologistProfileForInvoice {
  nome?: string;
  cnpj_cpf?: string;
  crp?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  email?: string;
  telefone?: string;
}

const NFS_E_EXTRACTION_PROMPT = `Você é um especialista em leitura de Notas Fiscais de Serviços brasileiras (NFS-e), especialmente de profissionais de saúde como psicólogos.

Analise a imagem da nota fiscal e extraia TODOS os campos disponíveis. Para cada campo, informe o valor extraído e um score de confiança de 0 a 1 (0 = não encontrado/ilegível, 1 = certeza total).

Retorne APENAS um JSON válido, sem explicações, sem markdown, sem texto adicional.

Estrutura obrigatória do JSON (cada chave com objeto { "valor": ... | null, "confianca": número 0-1 }):

chave_nfe, numero_nota, serie, data_emissao (YYYY-MM-DD), codigo_verificacao, protocolo_autorizacao, codigo_municipio_ibge,
emitente_nome, emitente_cnpj_cpf, emitente_crp, emitente_ie, emitente_im, emitente_endereco, emitente_bairro, emitente_municipio, emitente_uf, emitente_cep, emitente_telefone, emitente_email, emitente_complemento,
tomador_nome, tomador_cpf_cnpj, tomador_endereco, tomador_bairro, tomador_municipio, tomador_uf, tomador_cep, tomador_email, tomador_telefone, tomador_ie, tomador_im, tomador_complemento,
descricao_servico, codigo_servico, codigo_cnae, nbs, codigo_municipio_servico,
iss_retido (boolean), aliquota_iss (decimal ex: 0.05 para 5%),
valor_servicos, valor_deducoes, base_calculo, valor_iss, valor_pis, valor_cofins, valor_inss, valor_ir, valor_csll, valor_liquido, valor_ibs, valor_cbs, cst, codigo_classificacao_tributaria,
emitente_divergencias (string ou null: descreva divergências entre dados do emitente na nota e os dados cadastrados fornecidos; null se não houver).

Regras: Valores monetários como número decimal (ex: 1200.50). Datas YYYY-MM-DD. CPF/CNPJ/CEP formatados. Campo vazio ou ilegível: valor null.`;

const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";

const NFS_E_TEXT_EXTRACTION_PROMPT = `Você é um especialista em leitura de Notas Fiscais de Serviços brasileiras (NFS-e), especialmente de profissionais de saúde como psicólogos.

Analise o texto da nota fiscal abaixo e extraia TODOS os campos disponíveis. Para cada campo, informe o valor extraído e um score de confiança de 0 a 1 (0 = não encontrado, 1 = certeza total).

Retorne APENAS um JSON válido, sem explicações, sem markdown, sem texto adicional.

Estrutura obrigatória do JSON (cada chave com objeto { "valor": ... | null, "confianca": número 0-1 }):

chave_nfe, numero_nota, serie, data_emissao (YYYY-MM-DD), codigo_verificacao, protocolo_autorizacao, codigo_municipio_ibge,
emitente_nome, emitente_cnpj_cpf, emitente_crp, emitente_ie, emitente_im, emitente_endereco, emitente_bairro, emitente_municipio, emitente_uf, emitente_cep, emitente_telefone, emitente_email, emitente_complemento,
tomador_nome, tomador_cpf_cnpj, tomador_endereco, tomador_bairro, tomador_municipio, tomador_uf, tomador_cep, tomador_email, tomador_telefone, tomador_ie, tomador_im, tomador_complemento,
descricao_servico, codigo_servico, codigo_cnae, nbs, codigo_municipio_servico,
iss_retido (boolean), aliquota_iss (decimal ex: 0.05 para 5%),
valor_servicos, valor_deducoes, base_calculo, valor_iss, valor_pis, valor_cofins, valor_inss, valor_ir, valor_csll, valor_liquido, valor_ibs, valor_cbs, cst, codigo_classificacao_tributaria,
emitente_divergencias (string ou null: descreva divergências entre dados do emitente na nota e os dados cadastrados fornecidos; null se não houver).

Regras: Valores monetários como número decimal (ex: 1200.50). Datas YYYY-MM-DD. CPF/CNPJ/CEP formatados. Campo vazio ou não encontrado: valor null.`;

export async function analyzeInvoicePdf(
  pdfBase64: string,
  psychologistProfile?: PsychologistProfileForInvoice
): Promise<{ data: Record<string, { valor: unknown; confianca: number }>; ai_confidence_score: number }> {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError("GROQ_API_KEY não configurada. Análise de nota fiscal indisponível.");
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  let textContent: string;
  try {
    const parsed = await pdfParse(pdfBuffer);
    textContent = parsed.text ?? "";
    if (!textContent || textContent.trim().length < 20) {
      throw new UnsupportedFormatError(
        "Não foi possível extrair texto deste PDF. O arquivo pode ser digitalizado como imagem ou estar protegido. Tente enviar como JPEG ou PNG."
      );
    }
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    throw new UnsupportedFormatError("Erro ao processar o PDF. Verifique se o arquivo não está corrompido.");
  }

  const maxChars = 12000;
  if (textContent.length > maxChars) {
    textContent = textContent.slice(0, maxChars) + "\n\n[...documento truncado...]";
  }

  const profileText = psychologistProfile
    ? `\nDados cadastrados da psicóloga emitente para referência e comparação (informe divergências em emitente_divergencias):\n${JSON.stringify(psychologistProfile, null, 2)}`
    : "";

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: "system", content: NFS_E_TEXT_EXTRACTION_PROMPT + profileText },
        { role: "user", content: `Texto extraído da nota fiscal:\n\n${textContent}` },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new AIServiceError("A IA não retornou dados. Tente novamente.");
    }

    let parsed: Record<string, { valor: unknown; confianca: number }>;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned) as Record<string, { valor: unknown; confianca: number }>;
    } catch {
      throw new AIServiceError("Não foi possível interpretar a resposta da IA. Tente novamente.");
    }

    const confidences = Object.values(parsed)
      .filter((v) => typeof v === "object" && v !== null && "confianca" in v)
      .map((v) => (v as { confianca: number }).confianca);
    const ai_confidence_score = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    return { data: parsed, ai_confidence_score: Math.round(ai_confidence_score * 1000) / 1000 };
  } catch (error) {
    if (error instanceof UnsupportedFormatError || error instanceof AIServiceError) throw error;
    const err = error as { status?: number; statusCode?: number; error?: { status?: number } };
    const status = err?.status ?? err?.statusCode ?? err?.error?.status;
    if (status === 429) {
      throw new AIQuotaError("Limite de requisições atingido. Aguarde alguns instantes e tente novamente.");
    }
    console.error("Groq PDF analysis error:", error);
    throw new AIServiceError("Erro ao analisar o PDF da nota fiscal. Tente novamente.");
  }
}

export async function analyzeInvoiceImage(
  imageBase64: string,
  imageType: string,
  psychologistProfile?: PsychologistProfileForInvoice
): Promise<{ data: Record<string, { valor: unknown; confianca: number }>; ai_confidence_score: number }> {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError("GROQ_API_KEY não configurada. Análise de nota fiscal indisponível.");
  }

  const base64Length = imageBase64.length;
  const estimatedBytes = (base64Length * 3) / 4;
  if (estimatedBytes > MAX_BASE64_SIZE_BYTES) {
    throw new UnsupportedFormatError(
      "Imagem muito grande. O tamanho máximo para análise é 4MB. Reduza a resolução ou compresse a imagem."
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const mime = imageType.toLowerCase();
  if (!allowedTypes.some((t) => mime.includes(t))) {
    throw new UnsupportedFormatError("Formato de imagem não suportado. Use JPEG, PNG ou WebP.");
  }

  const mediaType = mime.includes("png") ? "image/png" : mime.includes("webp") ? "image/webp" : "image/jpeg";
  const dataUrl = `data:${mediaType};base64,${imageBase64}`;

  const profileText = psychologistProfile
    ? `\nDados cadastrados da psicóloga emitente para referência e comparação (informe divergências em emitente_divergencias):\n${JSON.stringify(psychologistProfile, null, 2)}`
    : "";

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: NFS_E_EXTRACTION_PROMPT + profileText },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new AIServiceError("A IA não retornou dados. Tente outra imagem.");
    }

    let parsed: Record<string, { valor: unknown; confianca: number }>;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned) as Record<string, { valor: unknown; confianca: number }>;
    } catch {
      throw new AIServiceError("Não foi possível interpretar a resposta da IA. Verifique a qualidade da foto e tente novamente.");
    }

    const confidences = Object.values(parsed).filter((v) => typeof v === "object" && v !== null && "confianca" in v).map((v) => (v as { confianca: number }).confianca);
    const ai_confidence_score = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    return { data: parsed, ai_confidence_score: Math.round(ai_confidence_score * 1000) / 1000 };
  } catch (error) {
    if (error instanceof UnsupportedFormatError || error instanceof AIServiceError) throw error;
    const err = error as { status?: number; statusCode?: number; error?: { status?: number } };
    const status = err?.status ?? err?.statusCode ?? err?.error?.status;
    if (status === 429) {
      throw new AIQuotaError("Limite de requisições atingido. Aguarde alguns instantes e tente novamente.");
    }
    if (status === 413) {
      throw new UnsupportedFormatError("Imagem muito grande. Use no máximo 4MB.");
    }
    console.error("Groq vision error:", error);
    throw new AIServiceError("Erro ao analisar a imagem da nota fiscal. Tente novamente.");
  }
}
