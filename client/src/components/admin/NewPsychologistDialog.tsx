import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus, User as UserIcon, Mail, AtSign, Lock, Phone, FileText, Wallet, Camera, Users } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cpButton } from "@/components/cp/PageHeader";
import { CheckTile, IconField, ModalHeader } from "@/components/cp/fields";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseAmount } from "@/lib/money";

type UserOption = { id: number; fullName: string; email: string; role: string };

const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const empty = { fullName: "", email: "", username: "", password: "", phone: "", crpNumber: "", hourlyRate: "" };

/**
 * Creates the login (POST /api/register) and the psychologist profile (POST /api/psychologists),
 * or attaches the profile to an existing user. Moved here from the retired /psychologists page.
 */
export function NewPsychologistDialog({
  open,
  onOpenChange,
  existingPsychUserIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPsychUserIds: number[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [useExisting, setUseExisting] = useState(false);
  const [existingUserId, setExistingUserId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: users = [] } = useQuery<UserOption[]>({ queryKey: ["/api/users"], enabled: open && useExisting });
  const candidates = users.filter((u) => !existingPsychUserIds.includes(u.id));

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm(empty);
    setUseExisting(false);
    setExistingUserId("");
    setPhoto(null);
    setPreview(null);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) reset();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let userId: number;
      if (useExisting) {
        userId = Number(existingUserId);
      } else {
        const res = await apiRequest("POST", "/api/register", {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          role: "psychologist",
          status: "active",
        });
        userId = (await res.json()).id;
      }
      const res = await apiRequest("POST", "/api/psychologists", {
        userId,
        phone: form.phone || null,
        crpNumber: form.crpNumber || null,
        hourlyRate: form.hourlyRate ? parseAmount(form.hourlyRate) : 0,
      });
      const psych = await res.json();
      if (photo) {
        const fd = new FormData();
        fd.append("profileImageFile", photo);
        // The profile already exists; a failed photo upload is reported but does not undo it
        const up = await fetch(`/api/psychologists/${psych.id}/photo`, { method: "POST", body: fd, credentials: "include" });
        if (!up.ok) toast({ title: "Psicóloga criada, mas a foto não foi enviada", variant: "destructive" });
      }
      return psych;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologists"] });
      toast({ title: "Psicóloga cadastrada com sucesso!" });
      close(false);
    },
    onError: (e: Error) => toast({ title: "Erro no cadastro", description: e.message, variant: "destructive" }),
  });

  const amountOk = !form.hourlyRate || !isNaN(parseAmount(form.hourlyRate));
  const valid = useExisting
    ? !!existingUserId && amountOk
    : form.fullName.trim() && /\S+@\S+\.\S+/.test(form.email) && form.username.trim().length >= 3 && form.password.length >= 6 && amountOk;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <ModalHeader icon={UserPlus} title="Nova Psicóloga" description="Crie o acesso e o perfil profissional." />

        <div className="mt-2 space-y-4">
          <CheckTile icon={Users} label="Usar um usuário já cadastrado" checked={useExisting} onCheckedChange={setUseExisting} />

          {useExisting ? (
            <div>
              <span className={fieldLabel}>Usuário <span className="text-cp-danger">*</span></span>
              <IconField icon={UserIcon}>
                <Select value={existingUserId} onValueChange={setExistingUserId}>
                  <SelectTrigger aria-label="Usuário"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {candidates.length === 0 && <div className="px-3 py-2 text-sm text-cp-muted">Nenhum usuário disponível</div>}
                    {candidates.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName} — {u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </IconField>
            </div>
          ) : (
            <>
              <div>
                <label className={fieldLabel} htmlFor="np-name">Nome completo <span className="text-cp-danger">*</span></label>
                <IconField icon={UserIcon}><Input id="np-name" value={form.fullName} onChange={set("fullName")} placeholder="Nome da psicóloga" /></IconField>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="np-email">E-mail <span className="text-cp-danger">*</span></label>
                <IconField icon={Mail}><Input id="np-email" type="email" value={form.email} onChange={set("email")} placeholder="email@exemplo.com" /></IconField>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="np-user">Usuário <span className="text-cp-danger">*</span></label>
                  <IconField icon={AtSign}><Input id="np-user" value={form.username} onChange={set("username")} placeholder="mín. 3 caracteres" autoComplete="off" /></IconField>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="np-pass">Senha <span className="text-cp-danger">*</span></label>
                  <IconField icon={Lock}><Input id="np-pass" type="password" value={form.password} onChange={set("password")} placeholder="mín. 6 caracteres" autoComplete="new-password" /></IconField>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="np-phone">Telefone</label>
              <IconField icon={Phone}><Input id="np-phone" value={form.phone} onChange={set("phone")} placeholder="(51) 91234-5678" /></IconField>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="np-crp">CRP</label>
              <IconField icon={FileText}><Input id="np-crp" value={form.crpNumber} onChange={set("crpNumber")} placeholder="07/12345" /></IconField>
            </div>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="np-rate">Valor da sessão (R$)</label>
            <IconField icon={Wallet}><Input id="np-rate" inputMode="decimal" value={form.hourlyRate} onChange={set("hourlyRate")} placeholder="Ex: 180,00" /></IconField>
            {!amountOk && <p className="mt-1 text-xs text-cp-danger">Informe um valor válido.</p>}
          </div>

          <div>
            <span className={fieldLabel}>Foto (opcional)</span>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-cp-border bg-white p-3 transition-colors hover:border-cp-sage hover:bg-cp-sage-soft/40">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPhoto(f);
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              {preview ? (
                <img src={preview} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cp-sage-soft text-cp-sage-ink"><Camera className="h-5 w-5" /></span>
              )}
              <span className="text-sm text-cp-ink">{photo ? photo.name : "Escolher imagem"}</span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
          <button type="button" className={cpButton.subtle} onClick={() => close(false)}>Cancelar</button>
          <button type="button" className={cpButton.primary} onClick={() => createMutation.mutate()} disabled={!valid || createMutation.isPending} data-testid="button-create-psych">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
