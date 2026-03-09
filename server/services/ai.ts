import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set. AI summarization will not work.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  try {
    let result;

    if (mimeType === "application/pdf") {
      const base64Data = fileBuffer.toString("base64");
      result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf",
          },
        },
        CLINICAL_PROMPT,
      ]);
    } else {
      const textContent = fileBuffer.toString("utf-8");
      result = await model.generateContent([
        `${CLINICAL_PROMPT}\n\n---\n\nDocumento: ${fileName}\n\n${textContent}`,
      ]);
    }

    const text = result.response.text();
    if (!text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }
    return text;
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    console.error("Gemini API error:", error);
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
