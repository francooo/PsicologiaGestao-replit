import { getGmailClient, isGoogleTokenExpired } from "../services/google-calendar";

interface CareDispatchQuestion {
  questionText: string;
  questionType: string;
}

interface SendCareEmailParams {
  psychologistUserId: number;
  patientName: string;
  patientEmail: string;
  psychologistName: string;
  psychologistEmail: string;
  subject: string;
  customMessage?: string | null;
  questions: CareDispatchQuestion[];
  responseUrl: string;
  tokenExpiresAt: Date;
}

export async function sendCareFormEmail(params: SendCareEmailParams): Promise<boolean> {
  try {
    const gmail = await getGmailClient(params.psychologistUserId);
    if (!gmail) {
      console.warn("sendCareFormEmail: no Gmail client — user not connected to Google");
      return false;
    }

    const clinicName = process.env.CLINIC_NAME || "ConsultaPsi";
    const firstName = params.patientName.split(" ")[0];

    const expiryStr = params.tokenExpiresAt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });

    const typeLabel: Record<string, string> = {
      text: "texto curto",
      textarea: "texto livre",
      scale: "escala 1-10",
      multiple_choice: "múltipla escolha",
    };

    const questionsHtml = params.questions
      .map(
        (q, i) => `
      <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #f3f4f6;">
        <p style="font-weight: 600; color: #1f2937; margin: 0 0 4px; font-size: 14px;">
          ${i + 1}. ${q.questionText}
        </p>
        <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          ${typeLabel[q.questionType] ?? q.questionType}
        </span>
      </div>`
      )
      .join("");

    const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0D9488, #14B8A6); padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${clinicName}</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">
      Acompanhamento com ${params.psychologistName}
    </p>
  </div>

  <!-- Body -->
  <div style="padding: 36px 40px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">

    <p style="font-size: 16px; color: #374151; margin: 0 0 8px;">
      Olá, <strong>${firstName}</strong>! 👋
    </p>

    ${
      params.customMessage
        ? `<p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 24px;">${params.customMessage}</p>`
        : `<p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
        ${params.psychologistName} preparou um breve formulário para acompanhar como você está.
        Leva apenas alguns minutinhos! 💚
      </p>`
    }

    <!-- Questions preview -->
    <div style="background: white; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.05em;">
        Perguntas do formulário
      </p>
      ${questionsHtml}
    </div>

    <!-- CTA button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.responseUrl}"
         style="display: inline-block; background: #0D9488; color: white;
                padding: 16px 40px; border-radius: 10px; text-decoration: none;
                font-weight: 700; font-size: 16px; letter-spacing: 0.02em;">
        💬 Responder Formulário
      </a>
    </div>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 16px 0 0;">
      Este link expira em ${expiryStr}. Responda com tranquilidade no seu tempo. 🌿
    </p>
  </div>

  <!-- Footer -->
  <div style="padding: 20px 40px; text-align: center;">
    <p style="font-size: 12px; color: #d1d5db; margin: 0;">
      ${clinicName} · Enviado por ${params.psychologistName}
    </p>
  </div>

</body>
</html>`;

    const subjectEncoded = Buffer.from(params.subject).toString("base64");

    const rawMessage = [
      `To: ${params.patientEmail}`,
      `From: ${params.psychologistName} <${params.psychologistEmail}>`,
      `Subject: =?utf-8?B?${subjectEncoded}?=`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      bodyHtml,
    ].join("\r\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return true;
  } catch (error) {
    if (isGoogleTokenExpired(error)) throw error;
    console.error("sendCareFormEmail error:", error);
    return false;
  }
}
