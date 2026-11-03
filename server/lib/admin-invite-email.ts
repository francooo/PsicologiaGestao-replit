import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies, users } from "@shared/schema";
import { getAppUrl, sendAppEmail } from "../services/email";

// E-mail to someone made administrator of a clinic (new company, or added in Administradores).
// Layout from asset/email-admin-1b (proposta 1b, Editorial); logo served from client/public/email.

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const B = 'style="color:#1f3344;"';

// Hidden copy of every invite for the platform owner; ADMIN_INVITE_BCC overrides it ("" turns it off).
const INVITE_BCC = process.env.ADMIN_INVITE_BCC ?? "andrewsfranco93@gmail.com";

export function adminInviteEmailHtml(p: { clinicName: string; invitedBy?: string | null; email: string; hasAccount: boolean; appUrl: string }) {
  const clinic = escapeHtml(p.clinicName);
  const email = escapeHtml(p.email);
  const by = p.invitedBy ? escapeHtml(p.invitedBy) : null;
  const accessUrl = `${p.appUrl}/auth`;
  const preheader = by
    ? `${by} deu a você acesso de administrador(a) da clínica ${clinic}.`
    : `Você recebeu acesso de administrador(a) da clínica ${clinic}.`;
  const intro = by ? `<strong ${B}>${by}</strong> deu a você` : "Você recebeu";
  const howTo = p.hasAccount
    ? `Entre com a sua conta de sempre (<strong ${B}>${email}</strong>). Se você participa de mais de uma clínica, escolha <strong ${B}>${clinic}</strong> em “Trocar”, no menu.`
    : `Na tela de entrada, use <strong ${B}>Continuar com Google</strong> com a conta <strong ${B}>${email}</strong>, ou toque em <strong ${B}>Criar conta</strong> usando esse mesmo e-mail. No primeiro acesso você já entra como administrador(a) da clínica.`;
  const cell = "padding:14px 0;";
  const items = [
    "Agenda, consultas, reuniões e reservas de salas",
    "Pacientes, psicólogas e salas da clínica",
    "Financeiro, notas fiscais e repasses",
    "Permissões da equipe e dados da clínica",
  ]
    .map((t, i, all) => {
      const border = `border-top:1px solid #e6e2d8;${i === all.length - 1 ? "border-bottom:1px solid #e6e2d8;" : ""}`;
      return `<tr><td width="38" style="${border}${cell}font-family:Georgia,serif;font-size:15px;color:#a99bc8;">0${i + 1}</td><td style="${border}${cell}font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:21px;color:#1f3344;">${t}</td></tr>`;
    })
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Seu acesso ao ConsultaPsi está pronto</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body{margin:0;padding:0;width:100%!important;background:#faf8f3;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block}
  a{color:#2a7fa6}
  @media only screen and (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:28px!important;line-height:34px!important}
    .outer{padding-left:12px!important;padding-right:12px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#faf8f3;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#faf8f3;">${preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f3;">
<tr><td align="center" class="outer" style="padding:40px 24px 32px;">

  <table role="presentation" class="container" width="552" cellpadding="0" cellspacing="0" border="0" style="width:552px;max-width:552px;background:#ffffff;border-top:6px solid #1f3344;border-radius:4px;">

    <tr><td class="px" style="padding:32px 48px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="left" valign="middle"><img src="${p.appUrl}/email/consultapsi-logo.png" width="134" height="30" alt="ConsultaPsi" style="width:134px;height:30px;"></td>
        <td align="right" valign="middle" style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;font-weight:bold;color:#6b747c;">NOTIFICAÇÃO</td>
      </tr></table>
    </td></tr>

    <tr><td class="px" style="padding:44px 48px 0;">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;font-weight:bold;color:#5d7a62;">ACESSO DE ADMINISTRAÇÃO</p>
      <h1 class="h1" style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:43px;font-weight:normal;color:#1f3344;">Seu acesso ao ConsultaPsi está <em style="color:#2a7fa6;">pronto</em>.</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td width="48" height="2" style="width:48px;height:2px;background:#a99bc8;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <p style="margin:24px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:27px;color:#4a5560;">${intro} acesso de <strong ${B}>administrador(a)</strong> da clínica <strong ${B}>${clinic}</strong> no ConsultaPsi. A partir de agora você já pode acessar o sistema.</p>
    </td></tr>

    <tr><td class="px" style="padding:36px 48px 0;">
      <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1f3344;">O que você pode fazer</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${items}
      </table>
    </td></tr>

    <tr><td class="px" style="padding:36px 48px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#1f3344" style="border-radius:6px;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${accessUrl}" style="height:56px;v-text-anchor:middle;width:456px;" arcsize="11%" stroke="f" fillcolor="#1f3344"><w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;">Acessar o ConsultaPsi</center></v:roundrect><![endif]-->
        <!--[if !mso]><!--><a href="${accessUrl}" target="_blank" style="display:block;padding:18px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Acessar o ConsultaPsi</a><!--<![endif]-->
      </td></tr></table>
    </td></tr>

    <tr><td class="px" style="padding:28px 48px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="4" style="width:4px;background:#8fa88f;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding-left:16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:23px;color:#3d4752;"><strong ${B}>Como entrar:</strong> ${howTo}</td>
      </tr></table>
    </td></tr>

    <tr><td class="px" style="padding:24px 48px 40px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;color:#6b747c;">
      Se o botão não funcionar, copie e cole no navegador:<br>
      <a href="${accessUrl}" target="_blank" style="color:#2a7fa6;word-break:break-all;">${accessUrl}</a>
    </td></tr>

  </table>

  <table role="presentation" class="container" width="552" cellpadding="0" cellspacing="0" border="0" style="width:552px;max-width:552px;">
    <tr><td align="center" class="px" style="padding:24px 24px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:20px;color:#6b747c;">
      Você recebeu este e-mail porque foi definido(a) como administrador(a) de uma clínica no ConsultaPsi. Se não esperava por isso, pode ignorar esta mensagem.<br>
      <a href="${p.appUrl}/privacidade" style="color:#6b747c;">Política de Privacidade</a> · <a href="${p.appUrl}/termos" style="color:#6b747c;">Termos de Uso</a>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

/** Sends the "you are now an administrator of <clinic>" e-mail; false when it could not be sent. */
export async function sendAdminInviteEmail(p: { companyId: number; email: string; hasAccount: boolean; invitedByUserId: number }) {
  try {
    const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, p.companyId));
    const [inviter] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p.invitedByUserId));
    const clinicName = company?.name ?? "sua clínica";
    return await sendAppEmail({
      to: p.email,
      bcc: INVITE_BCC && INVITE_BCC.toLowerCase() !== p.email.toLowerCase() ? INVITE_BCC : undefined,
      subject: `Seu acesso de administração à ${clinicName} no ConsultaPsi`,
      html: adminInviteEmailHtml({ clinicName, invitedBy: inviter?.fullName, email: p.email, hasAccount: p.hasAccount, appUrl: getAppUrl() }),
    });
  } catch (error) {
    console.error("sendAdminInviteEmail error:", error);
    return false;
  }
}
