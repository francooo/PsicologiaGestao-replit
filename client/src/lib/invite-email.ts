/** Tail of the "admin added" toasts: whether the server could send the invite e-mail (server/lib/admin-invite-email.ts). */
export const inviteEmailNote = (emailSent?: boolean) =>
  emailSent === undefined ? "" : emailSent ? " Enviamos um e-mail de convite." : " Não foi possível enviar o e-mail de convite: avise a pessoa.";
