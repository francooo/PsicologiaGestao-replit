import Groq from "groq-sdk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not set. AI summarization will not work.");
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
