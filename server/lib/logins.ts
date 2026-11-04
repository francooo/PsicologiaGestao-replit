import { storage } from "../storage";

/**
 * Why a new account can't use this username or e-mail, as {field, message} for the form, or null.
 * Staff adding someone who already has access to their clinic (themselves included) also get
 * that member's userId, so the screen can attach the profile to the existing user instead.
 */
export async function takenLogin(username: string, email: string, caller?: { id: number; companyId: number }) {
  const byEmail = email ? await storage.getUserByEmail(email) : undefined;
  const byUsername = !byEmail && username ? await storage.getUserByUsername(username) : undefined;
  const existing = byEmail ?? byUsername;
  if (!existing) return null;

  const field = byEmail ? "email" : "username";
  const what = byEmail ? "e-mail" : "usuário";
  if (caller) {
    if (existing.id === caller.id) {
      return { field, userId: existing.id, message: `Este é o seu próprio ${what} de acesso. Se você também atende, use o seu acesso em vez de criar outro.` };
    }
    const member = (await storage.getAllUsers(caller.companyId)).some((u) => u.id === existing.id);
    if (member) {
      return { field, userId: existing.id, message: `Este ${what} já pertence a ${existing.fullName}, que já tem acesso à clínica. Use o usuário dela em vez de criar outro.` };
    }
  }
  return { field, message: byEmail ? "Este e-mail já está cadastrado no sistema. Use outro e-mail." : "Este usuário já está em uso. Escolha outro." };
}
