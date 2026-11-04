import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus, User as UserIcon, Mail, AtSign, Lock, Phone, FileText, Wallet, Camera, Users, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cpButton } from "@/components/cp/PageHeader";
import { CheckTile, IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ApiError, errorMessage } from "@/lib/api-error";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { parseAmount } from "@/lib/money";

type UserOption = { id: number; fullName: string; email: string; role: string };

const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const errorText = "mt-1 text-[13px] font-medium text-cp-danger";
const empty = { fullName: "", email: "", username: "", password: "", phone: "", crpNumber: "", hourlyRate: "" };
type Field = keyof typeof empty | "existingUserId";

/** Phone photos are often over the 2MB upload limit: send at most 800px as JPEG (keeps the original if the browser can't read it). */
async function shrinkPhoto(file: File, max = 800): Promise<Blob> {
  if (file.size < 500 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Creates the login (POST /api/register) and the psychologist profile (POST /api/psychologists),
 * or attaches the profile to an existing user (also the admin who attends patients herself).
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
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [useExisting, setUseExisting] = useState(false);
  const [existingUserId, setExistingUserId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  // The e-mail/username typed belongs to someone who already has access: offer to use that user
  const [suggestedUserId, setSuggestedUserId] = useState<number | null>(null);

  const { data: users = [] } = useQuery<UserOption[]>({ queryKey: ["/api/users"], enabled: open });
  const candidates = users.filter((u) => !existingPsychUserIds.includes(u.id));
  // An admin who also attends patients becomes a psychologist with her own login
  const canBeSelf = user?.role === "admin" && !existingPsychUserIds.includes(user.id);
  const isSelf = useExisting && !!user && existingUserId === String(user.id);

  const clearError = (k: Field) => {
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError(null);
    setSuggestedUserId(null);
  };
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    clearError(k);
  };

  const pickExisting = (id: string) => {
    setUseExisting(!!id);
    setExistingUserId(id);
    setErrors({});
    setServerError(null);
    setSuggestedUserId(null);
  };

  const reset = () => {
    setForm(empty);
    pickExisting("");
    setPhoto(null);
    setPreview(null);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) reset();
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (useExisting) {
      if (!existingUserId) e.existingUserId = "Selecione o usuário";
    } else {
      if (!form.fullName.trim()) e.fullName = "Informe o nome completo";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Informe um e-mail válido";
      if (form.username.trim().length < 3) e.username = "Use pelo menos 3 caracteres";
      if (form.password.length < 6) e.password = "Use pelo menos 6 caracteres";
    }
    if (form.hourlyRate && isNaN(parseAmount(form.hourlyRate))) e.hourlyRate = "Informe um valor válido";
    return e;
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
        fd.append("profileImageFile", await shrinkPhoto(photo), photo.name.replace(/\.\w+$/, "") + ".jpg");
        // The profile already exists; a failed photo upload is reported but does not undo it
        const up = await fetch(`/api/psychologists/${psych.id}/photo`, { method: "POST", body: fd, credentials: "include" });
        if (!up.ok) toast({ title: "Psicóloga criada, mas a foto não foi enviada", description: "Tente enviar a foto de novo pelo perfil dela.", variant: "destructive" });
      }
      return psych;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: isSelf ? "Pronto! Agora você também aparece como psicóloga." : "Psicóloga cadastrada com sucesso!" });
      close(false);
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.field && e.field in empty) {
        setErrors({ [e.field]: e.message });
        const id = e.body?.userId;
        setSuggestedUserId(typeof id === "number" && candidates.some((u) => u.id === id) ? id : null);
      } else {
        setServerError(errorMessage(e));
      }
    },
  });

  const submit = () => {
    const e = validate();
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;
    createMutation.mutate();
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const suggested = candidates.find((u) => u.id === suggestedUserId);
  const fieldError = (k: Field) =>
    errors[k] ? (
      <p className={errorText} role="alert">{errors[k]}</p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <ModalHeader icon={UserPlus} title="Nova Psicóloga" description="Crie o acesso e o perfil profissional." />

        <div className="mt-2 space-y-4">
          {canBeSelf && (
            <CheckTile icon={UserCheck} label="Eu também atendo (usar o meu acesso)" checked={isSelf} onCheckedChange={(v) => pickExisting(v ? String(user!.id) : "")} />
          )}
          <CheckTile icon={Users} label="Usar um usuário já cadastrado" checked={useExisting} onCheckedChange={(v) => { pickExisting(""); setUseExisting(v); }} />

          {useExisting ? (
            <div>
              <span className={fieldLabel}>Usuário <span className="text-cp-danger">*</span></span>
              <IconField icon={UserIcon}>
                <Select value={existingUserId} onValueChange={(v) => { setExistingUserId(v); clearError("existingUserId"); }}>
                  <SelectTrigger aria-label="Usuário" aria-invalid={!!errors.existingUserId}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {candidates.length === 0 && <div className="px-3 py-2 text-sm text-cp-muted">Nenhum usuário disponível</div>}
                    {candidates.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName} — {u.email}{u.id === user?.id ? " (você)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </IconField>
              {fieldError("existingUserId")}
              {isSelf && <p className="mt-1 text-[13px] text-cp-muted">Você continua administradora e passa a aparecer na lista de psicólogas da agenda.</p>}
            </div>
          ) : (
            <>
              <div>
                <label className={fieldLabel} htmlFor="np-name">Nome completo <span className="text-cp-danger">*</span></label>
                <IconField icon={UserIcon}><Input id="np-name" value={form.fullName} onChange={set("fullName")} aria-invalid={!!errors.fullName} placeholder="Nome da psicóloga" /></IconField>
                {fieldError("fullName")}
              </div>
              <div>
                <label className={fieldLabel} htmlFor="np-email">E-mail <span className="text-cp-danger">*</span></label>
                <IconField icon={Mail}><Input id="np-email" type="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} placeholder="email@exemplo.com" /></IconField>
                {fieldError("email")}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="np-user">Usuário <span className="text-cp-danger">*</span></label>
                  <IconField icon={AtSign}><Input id="np-user" value={form.username} onChange={set("username")} aria-invalid={!!errors.username} placeholder="mín. 3 caracteres" autoComplete="off" /></IconField>
                  {fieldError("username")}
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="np-pass">Senha <span className="text-cp-danger">*</span></label>
                  <IconField icon={Lock}><Input id="np-pass" type="password" value={form.password} onChange={set("password")} aria-invalid={!!errors.password} placeholder="mín. 6 caracteres" autoComplete="new-password" /></IconField>
                  {fieldError("password")}
                </div>
              </div>
              {suggested && (
                <button type="button" className={cpButton.subtle} onClick={() => pickExisting(String(suggested.id))}>
                  <UserCheck className="h-4 w-4" />
                  {suggested.id === user?.id ? "Usar o meu acesso" : `Usar o usuário de ${suggested.fullName}`}
                </button>
              )}
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
            <IconField icon={Wallet}><Input id="np-rate" inputMode="decimal" value={form.hourlyRate} onChange={set("hourlyRate")} aria-invalid={!!errors.hourlyRate} placeholder="Ex: 180,00" /></IconField>
            {fieldError("hourlyRate")}
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

          {errorCount > 0 && !suggested && (
            <InfoBanner variant="danger" title={errorCount === 1 ? "Ajuste o campo marcado em vermelho" : `Ajuste os ${errorCount} campos marcados em vermelho`} />
          )}
          {serverError && <InfoBanner variant="danger" title="Não foi possível cadastrar">{serverError}</InfoBanner>}
        </div>

        <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
          <button type="button" className={cpButton.subtle} onClick={() => close(false)}>Cancelar</button>
          <button type="button" className={cpButton.primary} onClick={submit} disabled={createMutation.isPending} data-testid="button-create-psych">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
