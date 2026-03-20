import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Lock, Save, Edit2, Check, X, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import SpecializationChipSelector from "@/components/specialization-chip-selector";

interface ProfileData {
  id: number;
  fullName: string;
  email: string;
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

  const openEditInfo = () => {
    if (!profile) return;
    setDraftInfo({
      fullName: profile.fullName,
      phone: profile.psychologist?.phone || "",
      birthDate: profile.birthDate || "",
      crpNumber: profile.psychologist?.crpNumber || "",
    });
    setEditingInfo(true);
  };

  const openEditBio = () => {
    if (!profile) return;
    setDraftBio(profile.psychologist?.bio || "");
    setEditingBio(true);
  };

  const openEditSpecs = () => {
    if (!profile) return;
    setDraftSpecIds(profile.specializations.map((s) => s.id));
    setEditingSpecs(true);
  };

  const savInfoMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile", draftInfo),
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
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
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
  };

  return (
    <div className="flex min-h-screen bg-neutral-lightest">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-darkest">Meu Perfil Profissional</h1>
          <p className="text-sm text-neutral-dark mt-1">Gerencie suas informações pessoais e áreas de atuação.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Header: Avatar + Identity ───────────────────────────── */}
            <Card className="border-neutral-light shadow-sm">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-24 h-24 border-2 border-primary/30">
                      <AvatarImage src={profile?.profileImage || undefined} />
                      <AvatarFallback className="bg-primary text-white text-3xl font-bold">
                        {profile?.fullName?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarMutation.isPending}
                      data-testid="button-change-avatar"
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-avatar-file"
                    />
                  </div>

                  {/* Identity */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-neutral-darkest leading-tight">
                      {profile?.fullName}
                    </h2>
                    {profile?.psychologist?.crpNumber && (
                      <p className="text-sm text-neutral-dark mt-0.5">CRP {profile.psychologist.crpNumber}</p>
                    )}
                    <p className="text-sm text-neutral-dark">{profile?.email}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {profile?.age && (
                        <Badge variant="outline" className="text-xs border-neutral-light text-neutral-dark">
                          {profile.age} anos
                        </Badge>
                      )}
                      {profile?.psychologist?.startedAtClinic && (
                        <Badge className="text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ativa desde {formatDate(profile.psychologist.startedAtClinic)}
                          {" · "}
                          {monthsText(profile.psychologist.startedAtClinic)}
                        </Badge>
                      )}
                      <Badge
                        className={
                          profile?.status === "active"
                            ? "text-xs bg-green-50 text-green-700 border border-green-200"
                            : "text-xs bg-neutral-lightest text-neutral-dark border border-neutral-light"
                        }
                      >
                        {profile?.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 1: Informações Profissionais ─────────────────── */}
            <Card className="border-neutral-light shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-neutral-darkest">
                    Informações Profissionais
                  </CardTitle>
                  {!editingInfo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary/80 gap-1"
                      onClick={openEditInfo}
                      data-testid="button-edit-info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingInfo(false)}
                        data-testid="button-cancel-info"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={savInfoMutation.isPending}
                        onClick={() => savInfoMutation.mutate()}
                        data-testid="button-save-info"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {savInfoMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!editingInfo ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">Nome</dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">{profile?.fullName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">Telefone</dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">{profile?.psychologist?.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">Nascimento</dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">{formatDate(profile?.birthDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">CRP</dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">{profile?.psychologist?.crpNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark flex items-center gap-1">
                        E-mail
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                              Este campo só pode ser editado pelo administrador.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">{profile?.email || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark flex items-center gap-1">
                        Entrada na Clínica
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                              Este campo só pode ser editado pelo administrador.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </dt>
                      <dd className="text-sm text-neutral-darkest mt-0.5">
                        {formatDate(profile?.psychologist?.startedAtClinic)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark">Nome Completo</Label>
                      <Input
                        value={draftInfo.fullName}
                        onChange={(e) => setDraftInfo((d) => ({ ...d, fullName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-fullName"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark">Telefone / WhatsApp</Label>
                      <Input
                        value={draftInfo.phone}
                        onChange={(e) => setDraftInfo((d) => ({ ...d, phone: e.target.value }))}
                        placeholder="(11) 91234-5678"
                        className="mt-1"
                        data-testid="input-phone"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark">Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={draftInfo.birthDate}
                        onChange={(e) => setDraftInfo((d) => ({ ...d, birthDate: e.target.value }))}
                        className="mt-1"
                        data-testid="input-birthDate"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark">Número do CRP</Label>
                      <Input
                        value={draftInfo.crpNumber}
                        onChange={(e) => setDraftInfo((d) => ({ ...d, crpNumber: e.target.value }))}
                        placeholder="06/12345"
                        className="mt-1"
                        data-testid="input-crpNumber"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                        E-mail
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                              Este campo só pode ser editado pelo administrador.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        value={profile?.email || ""}
                        readOnly
                        disabled
                        className="mt-1 bg-neutral-lightest text-neutral-dark"
                        data-testid="input-email-readonly"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                        Entrada na Clínica
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                              Este campo só pode ser editado pelo administrador.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        value={profile?.psychologist?.startedAtClinic || ""}
                        readOnly
                        disabled
                        type="date"
                        className="mt-1 bg-neutral-lightest text-neutral-dark"
                        data-testid="input-startedAtClinic-readonly"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 2: Bio ───────────────────────────────────────── */}
            <Card className="border-neutral-light shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-neutral-darkest">Sobre mim</CardTitle>
                  {!editingBio ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary/80 gap-1"
                      onClick={openEditBio}
                      data-testid="button-edit-bio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingBio(false)}
                        data-testid="button-cancel-bio"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={saveBioMutation.isPending}
                        onClick={() => saveBioMutation.mutate()}
                        data-testid="button-save-bio"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {saveBioMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!editingBio ? (
                  <p className="text-sm text-neutral-darkest whitespace-pre-wrap">
                    {profile?.psychologist?.bio || (
                      <span className="text-neutral-dark italic">Nenhuma bio cadastrada. Clique em Editar para adicionar.</span>
                    )}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <Textarea
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value.slice(0, 500))}
                      placeholder="Fale sobre sua trajetória, abordagem terapêutica e o que motiva seu trabalho..."
                      rows={5}
                      className="resize-none text-sm"
                      data-testid="textarea-bio"
                      autoFocus
                    />
                    <p className={cn(
                      "text-right text-xs",
                      draftBio.length >= 480 ? "text-amber-600" : "text-neutral-dark"
                    )}>
                      {draftBio.length}/500 caracteres
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 3: Áreas de Atuação ──────────────────────────── */}
            <Card className="border-neutral-light shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-neutral-darkest">Áreas de Atuação</CardTitle>
                  {!editingSpecs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary/80 gap-1"
                      onClick={openEditSpecs}
                      data-testid="button-edit-specs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingSpecs(false)}
                        data-testid="button-cancel-specs"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={saveSpecsMutation.isPending}
                        onClick={() => saveSpecsMutation.mutate()}
                        data-testid="button-save-specs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {saveSpecsMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!editingSpecs ? (
                  <SpecializationChipSelector
                    selectedIds={profile?.specializations.map((s) => s.id) ?? []}
                    onChange={() => {}}
                    readonly
                  />
                ) : (
                  <SpecializationChipSelector
                    selectedIds={draftSpecIds}
                    onChange={setDraftSpecIds}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
