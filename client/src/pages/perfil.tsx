import { useState, useRef, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Lock, Save, Pencil, Calendar, Mail, Phone, FileText, User as UserIcon, Info, Leaf, Home, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import SpecializationChipSelector from "@/components/specialization-chip-selector";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { CharCountTextarea, IconField } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { roleName } from "@/components/cp/status";

interface ProfileData {
  id: number;
  fullName: string;
  email: string;
  role: string;
  profileImage: string | null;
  birthDate: string | null;
  status: string;
  age: number | null;
  psychologist: {
    id: number;
    phone: string | null;
    crpNumber: string | null;
    bio: string | null;
    startedAtClinic: string | null;
    hourlyRate: string;
  } | null;
  specializations: { id: number; name: string; category: string | null }[];
}

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";
const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const smallBtn = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors disabled:opacity-60";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function monthsText(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const now = new Date();
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (totalMonths < 12) return `${totalMonths} meses na clínica`;
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  return rem > 0 ? `${years} ano${years > 1 ? "s" : ""} e ${rem} meses na clínica` : `${years} ano${years > 1 ? "s" : ""} na clínica`;
}

function AdminOnlyHint() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock className="h-3 w-3 cursor-default text-cp-muted" aria-label="Somente o administrador edita" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          Este campo só pode ser editado pelo administrador.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function InfoRow({ icon: Icon, label, children, locked }: { icon: typeof Mail; label: string; children: ReactNode; locked?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-hover text-cp-ink">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">
          {label}
          {locked && <AdminOnlyHint />}
        </dt>
        <dd className="mt-0.5 break-words text-[15px] text-cp-ink">{children}</dd>
      </div>
    </div>
  );
}

/** Card with a title and the Editar / Cancelar + Salvar pair used by each section. */
function Section({
  title,
  icon: Icon,
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
  testId,
  children,
}: {
  title: string;
  icon: typeof Mail;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(card, "p-5 sm:p-6")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
          <Icon className="h-5 w-5 text-cp-muted" />
          {title}
        </h2>
        {!editing ? (
          <button type="button" className={cn(smallBtn, "text-cp-action hover:bg-cp-action-soft")} onClick={onEdit} data-testid={`button-edit-${testId}`}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className={cn(smallBtn, "bg-cp-sand-soft text-cp-ink hover:bg-cp-sand")} onClick={onCancel} data-testid={`button-cancel-${testId}`}>
              Cancelar
            </button>
            <button type="button" className={cn(smallBtn, "bg-cp-action text-white hover:bg-cp-action-hover")} disabled={saving} onClick={onSave} data-testid={`button-save-${testId}`}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

export default function PerfilPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-section edit states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(false);

  // Draft values for each section
  const [draftInfo, setDraftInfo] = useState({ fullName: "", phone: "", birthDate: "", crpNumber: "" });
  const [draftBio, setDraftBio] = useState("");
  const [draftSpecIds, setDraftSpecIds] = useState<number[]>([]);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });
  // Phone, CRP, bio and areas live on the psychologist record; other roles only have name/birth date/photo
  const psych = profile?.psychologist ?? null;

  const openEditInfo = () => {
    if (!profile) return;
    setDraftInfo({
      fullName: profile.fullName,
      phone: psych?.phone || "",
      birthDate: profile.birthDate || "",
      crpNumber: psych?.crpNumber || "",
    });
    setEditingInfo(true);
  };

  const openEditBio = () => {
    setDraftBio(psych?.bio || "");
    setEditingBio(true);
  };

  const openEditSpecs = () => {
    if (!profile) return;
    setDraftSpecIds(profile.specializations.map((s) => s.id));
    setEditingSpecs(true);
  };

  const saveInfoMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile", psych ? draftInfo : { fullName: draftInfo.fullName, birthDate: draftInfo.birthDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditingInfo(false);
      toast({ title: "Informações atualizadas!" });
    },
    onError: () => toast({ title: "Erro ao salvar informações", variant: "destructive" }),
  });

  const saveBioMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile", { bio: draftBio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setEditingBio(false);
      toast({ title: "Bio atualizada!" });
    },
    onError: () => toast({ title: "Erro ao salvar bio", variant: "destructive" }),
  });

  const saveSpecsMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/api/profile/specializations", { specializationIds: draftSpecIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setEditingSpecs(false);
      toast({ title: "Áreas de atuação atualizadas!" });
    },
    onError: () => toast({ title: "Erro ao salvar áreas", variant: "destructive" }),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Erro ao enviar imagem");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Foto atualizada!" });
    },
    onError: (e: Error) => toast({ title: e.message || "Erro ao enviar foto", variant: "destructive" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = "";
  };

  const setDraft = (k: keyof typeof draftInfo) => (e: React.ChangeEvent<HTMLInputElement>) => setDraftInfo((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="max-w-5xl p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Meu Perfil"
            icon={UserIcon}
            subtitle={psych ? "Suas informações pessoais e profissionais e áreas de atuação." : "Suas informações pessoais."}
            phrase
          />

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Identidade */}
              <section className={cn(card, "relative overflow-hidden p-5 sm:p-6")}>
                <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-cp-sage-soft" />
                <div aria-hidden="true" className="pointer-events-none absolute -right-2 top-16 h-24 w-24 rounded-full bg-cp-lavender-soft" />
                <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.profileImage || undefined} />
                      <AvatarFallback className="bg-cp-action text-3xl font-bold text-white">
                        {profile?.fullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarMutation.isPending}
                      data-testid="button-change-avatar"
                      aria-label="Alterar foto"
                      className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-cp-action text-white shadow transition-colors hover:bg-cp-action-hover"
                    >
                      {avatarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} data-testid="input-avatar-file" />
                  </div>

                  <div className="min-w-0 text-center sm:text-left">
                    <h2 className="text-[26px] font-bold leading-tight text-cp-ink">{profile?.fullName}</h2>
                    <p className="mt-0.5 text-sm text-cp-muted">
                      {psych?.crpNumber ? `CRP ${psych.crpNumber} · ` : ""}{roleName(profile?.role)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <StatusBadge label={profile?.status === "active" ? (psych ? "Ativa" : "Ativo") : (psych ? "Inativa" : "Inativo")} tone={profile?.status === "active" ? "success" : "neutral"} />
                      {(profile?.age ?? 0) > 0 && <StatusBadge label={`${profile!.age} anos`} tone="neutral" />}
                      {psych?.startedAtClinic && (
                        <span className="inline-flex items-center gap-1 text-xs text-cp-muted">
                          <Calendar className="h-3 w-3" />
                          Desde {formatDate(psych.startedAtClinic)} · {monthsText(psych.startedAtClinic)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Informações */}
              <Section
                title={psych ? "Informações Profissionais" : "Informações Pessoais"}
                icon={FileText}
                editing={editingInfo}
                saving={saveInfoMutation.isPending}
                onEdit={openEditInfo}
                onCancel={() => setEditingInfo(false)}
                onSave={() => saveInfoMutation.mutate()}
                testId="info"
              >
                {!editingInfo ? (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    <InfoRow icon={UserIcon} label="Nome">{profile?.fullName || "—"}</InfoRow>
                    <InfoRow icon={Calendar} label="Nascimento">{formatDate(profile?.birthDate)}</InfoRow>
                    {psych && <InfoRow icon={Phone} label="Telefone">{psych.phone || "—"}</InfoRow>}
                    {psych && <InfoRow icon={FileText} label="CRP">{psych.crpNumber || "—"}</InfoRow>}
                    <InfoRow icon={Mail} label="E-mail" locked>{profile?.email || "—"}</InfoRow>
                    {psych && <InfoRow icon={Home} label="Entrada na clínica" locked>{formatDate(psych.startedAtClinic)}</InfoRow>}
                  </dl>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={fieldLabel} htmlFor="pf-name">Nome completo</label>
                      <IconField icon={UserIcon}><Input id="pf-name" value={draftInfo.fullName} onChange={setDraft("fullName")} data-testid="input-fullName" /></IconField>
                    </div>
                    <div>
                      <label className={fieldLabel} htmlFor="pf-birth">Data de nascimento</label>
                      <IconField icon={Calendar}><Input id="pf-birth" type="date" value={draftInfo.birthDate} onChange={setDraft("birthDate")} data-testid="input-birthDate" /></IconField>
                    </div>
                    {psych && (
                      <>
                        <div>
                          <label className={fieldLabel} htmlFor="pf-phone">Telefone / WhatsApp</label>
                          <IconField icon={Phone}><Input id="pf-phone" value={draftInfo.phone} onChange={setDraft("phone")} placeholder="(11) 91234-5678" data-testid="input-phone" /></IconField>
                        </div>
                        <div>
                          <label className={fieldLabel} htmlFor="pf-crp">Número do CRP</label>
                          <IconField icon={FileText}><Input id="pf-crp" value={draftInfo.crpNumber} onChange={setDraft("crpNumber")} placeholder="06/12345" data-testid="input-crpNumber" /></IconField>
                        </div>
                      </>
                    )}
                    <div>
                      <span className={cn(fieldLabel, "flex items-center gap-1")}>E-mail <AdminOnlyHint /></span>
                      <IconField icon={Mail}><Input value={profile?.email || ""} readOnly disabled className="bg-cp-hover text-cp-muted" data-testid="input-email-readonly" /></IconField>
                    </div>
                    {psych && (
                      <div>
                        <span className={cn(fieldLabel, "flex items-center gap-1")}>Entrada na clínica <AdminOnlyHint /></span>
                        <IconField icon={Home}><Input value={formatDate(psych.startedAtClinic)} readOnly disabled className="bg-cp-hover text-cp-muted" data-testid="input-startedAtClinic-readonly" /></IconField>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {psych && (
                <Section
                  title="Sobre mim"
                  icon={Info}
                  editing={editingBio}
                  saving={saveBioMutation.isPending}
                  onEdit={openEditBio}
                  onCancel={() => setEditingBio(false)}
                  onSave={() => saveBioMutation.mutate()}
                  testId="bio"
                >
                  {!editingBio ? (
                    <p className="whitespace-pre-wrap text-[15px] text-cp-ink">
                      {psych.bio || <span className="italic text-cp-muted">Nenhuma bio cadastrada. Clique em Editar para adicionar.</span>}
                    </p>
                  ) : (
                    <CharCountTextarea
                      max={500}
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      placeholder="Fale sobre sua trajetória, abordagem terapêutica e o que motiva seu trabalho..."
                      className="min-h-[140px] text-sm"
                      data-testid="textarea-bio"
                      autoFocus
                    />
                  )}
                </Section>
              )}

              {psych && (
                <Section
                  title="Áreas de Atuação"
                  icon={Leaf}
                  editing={editingSpecs}
                  saving={saveSpecsMutation.isPending}
                  onEdit={openEditSpecs}
                  onCancel={() => setEditingSpecs(false)}
                  onSave={() => saveSpecsMutation.mutate()}
                  testId="specs"
                >
                  {!editingSpecs ? (
                    <SpecializationChipSelector selectedIds={profile?.specializations.map((s) => s.id) ?? []} onChange={() => {}} readonly />
                  ) : (
                    <SpecializationChipSelector selectedIds={draftSpecIds} onChange={setDraftSpecIds} />
                  )}
                </Section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
