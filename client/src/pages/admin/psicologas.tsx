import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Lock,
  X,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import SpecializationChipSelector from "@/components/specialization-chip-selector";
import { cn } from "@/lib/utils";

interface Specialization { id: number; name: string; category: string | null }

interface Psychologist {
  id: number;
  userId: number;
  phone: string | null;
  crpNumber: string | null;
  bio: string | null;
  startedAtClinic: string | null;
  hourlyRate: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    profileImage: string | null;
    birthDate: string | null;
    status: string;
  };
  age: number | null;
  specializations: Specialization[];
  activePatientsCount: number;
  sessionsCount: number;
  monthsAtClinic: number | null;
}

interface EditFormState {
  fullName: string;
  email: string;
  birthDate: string;
  phone: string;
  crpNumber: string;
  bio: string;
  startedAtClinic: string;
  status: string;
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
  if (totalMonths < 12) return `${totalMonths}m`;
  const years = Math.floor(totalMonths / 12);
  return `${years}a${totalMonths % 12 > 0 ? ` ${totalMonths % 12}m` : ""}`;
}

function PsychCard({ p, onClick }: { p: Psychologist; onClick: () => void }) {
  const isActive = p.user.status === "active";
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-neutral-light shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 cursor-pointer",
        !isActive && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`card-psychologist-${p.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 border border-primary/30 flex-shrink-0">
          <AvatarImage src={p.user.profileImage || undefined} />
          <AvatarFallback className="bg-primary text-white font-bold">
            {p.user.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-darkest text-sm truncate">{p.user.fullName}</h3>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] border flex-shrink-0",
                isActive
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-neutral-light text-neutral-dark bg-neutral-lightest"
              )}
            >
              {isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          {p.crpNumber && (
            <p className="text-xs text-neutral-dark mt-0.5">CRP {p.crpNumber}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {p.age && (
              <span className="text-xs text-neutral-dark">{p.age} anos</span>
            )}
            {p.phone && (
              <span className="text-xs text-neutral-dark truncate">{p.phone}</span>
            )}
            {p.startedAtClinic && (
              <span className="text-xs text-neutral-dark">desde {formatDate(p.startedAtClinic)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Specialization chips - up to 3 + counter */}
      {p.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.specializations.slice(0, 3).map((s) => (
            <span
              key={s.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {s.name}
            </span>
          ))}
          {p.specializations.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-lightest text-neutral-dark border border-neutral-light">
              +{p.specializations.length - 3} mais
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 border-t border-neutral-light pt-2 mt-1">
        <div className="text-center">
          <p className="text-base font-bold text-neutral-darkest">{p.activePatientsCount}</p>
          <p className="text-[10px] text-neutral-dark leading-tight">Pacientes</p>
        </div>
        <div className="text-center border-x border-neutral-light">
          <p className="text-base font-bold text-neutral-darkest">{p.sessionsCount}</p>
          <p className="text-[10px] text-neutral-dark leading-tight">Sessões</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-neutral-darkest">
            {p.monthsAtClinic !== null ? monthsText(p.startedAtClinic) : "—"}
          </p>
          <p className="text-[10px] text-neutral-dark leading-tight">Na Clínica</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPsicologasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [specFilter, setSpecFilter] = useState<number | "all">("all");

  const [viewingPsych, setViewingPsych] = useState<Psychologist | null>(null);
  const [editingPsych, setEditingPsych] = useState<Psychologist | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editSpecIds, setEditSpecIds] = useState<number[]>([]);

  const { data: psychologists = [], isLoading } = useQuery<Psychologist[]>({
    queryKey: ["/api/admin/psychologists"],
  });

  const { data: areasGrouped = {} } = useQuery<Record<string, { id: number; name: string }[]>>({
    queryKey: ["/api/specialization-areas"],
  });
  const allAreaOptions = Object.values(areasGrouped).flat();

  const openDetails = (p: Psychologist) => setViewingPsych(p);

  const openEdit = (p: Psychologist) => {
    setViewingPsych(null);
    setEditingPsych(p);
    setEditForm({
      fullName: p.user.fullName,
      email: p.user.email,
      birthDate: p.user.birthDate || "",
      phone: p.phone || "",
      crpNumber: p.crpNumber || "",
      bio: p.bio || "",
      startedAtClinic: p.startedAtClinic || "",
      status: p.user.status,
    });
    setEditSpecIds(p.specializations.map((s) => s.id));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingPsych || !editForm) return;
      await apiRequest("PATCH", `/api/admin/psychologists/${editingPsych.id}`, editForm);
      await apiRequest("PUT", `/api/admin/psychologists/${editingPsych.id}/specializations`, {
        specializationIds: editSpecIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      setEditingPsych(null);
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/psychologists/${id}/toggle-active`).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      toast({ title: data.isActive ? "Psicóloga ativada." : "Psicóloga desativada." });
    },
    onError: () => toast({ title: "Erro ao alterar status", variant: "destructive" }),
  });

  const filtered = psychologists.filter((p) => {
    const matchSearch =
      !search ||
      p.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.crpNumber || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.user.status === "active") ||
      (statusFilter === "inactive" && p.user.status !== "active");

    const matchSpec =
      specFilter === "all" ||
      p.specializations.some((s) => s.id === specFilter);

    return matchSearch && matchStatus && matchSpec;
  });

  return (
    <div className="flex min-h-screen bg-neutral-lightest">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-darkest">Psicólogas</h1>
          <p className="text-sm text-neutral-dark mt-1">
            Gerencie os perfis profissionais, áreas de atuação e status das psicólogas.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark" />
            <Input
              placeholder="Buscar por nome, e-mail ou CRP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-psych-search"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-36" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={specFilter === "all" ? "all" : String(specFilter)}
            onValueChange={(v) => setSpecFilter(v === "all" ? "all" : parseInt(v))}
          >
            <SelectTrigger className="w-48" data-testid="select-spec-filter">
              <SelectValue placeholder="Área de Atuação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {allAreaOptions.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-neutral-dark">
            {filtered.length} psicóloga{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            {psychologists.filter((p) => p.user.status === "active").length} ativas
          </span>
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-dark">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma psicóloga encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PsychCard key={p.id} p={p} onClick={() => openDetails(p)} />
            ))}
          </div>
        )}

        {/* ── Ver Detalhes Modal (read-only) ─────────────────────── */}
        <Dialog open={!!viewingPsych && !editingPsych} onOpenChange={(open) => !open && setViewingPsych(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-11 h-11 border border-primary/30">
                  <AvatarImage src={viewingPsych?.user.profileImage || undefined} />
                  <AvatarFallback className="bg-primary text-white font-bold text-sm">
                    {viewingPsych?.user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-semibold leading-tight">{viewingPsych?.user.fullName}</p>
                  {viewingPsych?.crpNumber && (
                    <p className="text-xs text-neutral-dark font-normal">CRP {viewingPsych.crpNumber}</p>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {viewingPsych && (
              <div className="space-y-4 py-1">
                {/* Status + Ativa desde */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={cn(
                      "text-xs",
                      viewingPsych.user.status === "active"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-neutral-lightest text-neutral-dark border border-neutral-light"
                    )}
                  >
                    {viewingPsych.user.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
                  {viewingPsych.startedAtClinic && (
                    <Badge className="text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Ativa desde {formatDate(viewingPsych.startedAtClinic)}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-xl font-bold text-neutral-darkest">{viewingPsych.activePatientsCount}</p>
                    <p className="text-[11px] text-neutral-dark">Pacientes Ativos</p>
                  </div>
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-xl font-bold text-neutral-darkest">{viewingPsych.sessionsCount}</p>
                    <p className="text-[11px] text-neutral-dark">Sessões Totais</p>
                  </div>
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-xl font-bold text-neutral-darkest">
                      {viewingPsych.monthsAtClinic !== null ? monthsText(viewingPsych.startedAtClinic) : "—"}
                    </p>
                    <p className="text-[11px] text-neutral-dark">Na Clínica</p>
                  </div>
                </div>

                {/* Info grid */}
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">E-mail</dt>
                    <dd className="text-sm text-neutral-darkest mt-0.5">{viewingPsych.user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">Telefone</dt>
                    <dd className="text-sm text-neutral-darkest mt-0.5">{viewingPsych.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">Nascimento</dt>
                    <dd className="text-sm text-neutral-darkest mt-0.5">
                      {formatDate(viewingPsych.user.birthDate)}
                      {viewingPsych.age ? ` (${viewingPsych.age} anos)` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark">CRP</dt>
                    <dd className="text-sm text-neutral-darkest mt-0.5">{viewingPsych.crpNumber || "—"}</dd>
                  </div>
                </dl>

                {/* Bio */}
                {viewingPsych.bio && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark mb-1">Sobre</dt>
                    <p className="text-sm text-neutral-darkest whitespace-pre-wrap">{viewingPsych.bio}</p>
                  </div>
                )}

                {/* Specializations (read-only) */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-dark mb-2">Áreas de Atuação</p>
                  <SpecializationChipSelector
                    selectedIds={viewingPsych.specializations.map((s) => s.id)}
                    onChange={() => {}}
                    readonly
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setViewingPsych(null)} data-testid="button-close-details">
                Fechar
              </Button>
              <Button
                onClick={() => viewingPsych && openEdit(viewingPsych)}
                data-testid="button-open-edit"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Editar Modal ─────────────────────────────────────────── */}
        <Dialog open={!!editingPsych} onOpenChange={(open) => !open && setEditingPsych(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-primary/30">
                  <AvatarImage src={editingPsych?.user.profileImage || undefined} />
                  <AvatarFallback className="bg-primary text-white font-bold text-sm">
                    {editingPsych?.user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-semibold">Editar: {editingPsych?.user.fullName}</p>
                  {editingPsych?.crpNumber && (
                    <p className="text-xs text-neutral-dark font-normal">CRP {editingPsych.crpNumber}</p>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {editForm && editingPsych && (
              <div className="space-y-5 py-2">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-lg font-bold text-neutral-darkest">{editingPsych.activePatientsCount}</p>
                    <p className="text-[11px] text-neutral-dark">Pacientes Ativos</p>
                  </div>
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-lg font-bold text-neutral-darkest">{editingPsych.sessionsCount}</p>
                    <p className="text-[11px] text-neutral-dark">Sessões Totais</p>
                  </div>
                  <div className="bg-neutral-lightest rounded-lg border border-neutral-light p-3 text-center">
                    <p className="text-lg font-bold text-neutral-darkest">
                      {editingPsych.monthsAtClinic !== null ? monthsText(editingPsych.startedAtClinic) : "—"}
                    </p>
                    <p className="text-[11px] text-neutral-dark">Na Clínica</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark">Nome Completo</Label>
                    <Input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((f) => f ? { ...f, fullName: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-fullName"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                      E-mail
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="w-3 h-3 text-primary/70 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            Este campo só pode ser editado pelo administrador.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => f ? { ...f, email: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-email"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark">Telefone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)}
                      placeholder="(11) 91234-5678"
                      className="mt-1"
                      data-testid="input-edit-phone"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark">Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={editForm.birthDate}
                      onChange={(e) => setEditForm((f) => f ? { ...f, birthDate: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-birthDate"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark">Número do CRP</Label>
                    <Input
                      value={editForm.crpNumber}
                      onChange={(e) => setEditForm((f) => f ? { ...f, crpNumber: e.target.value } : f)}
                      placeholder="06/12345"
                      className="mt-1"
                      data-testid="input-edit-crpNumber"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                      Entrada na Clínica
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="w-3 h-3 text-primary/70 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            Este campo só pode ser editado pelo administrador.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      type="date"
                      value={editForm.startedAtClinic}
                      onChange={(e) => setEditForm((f) => f ? { ...f, startedAtClinic: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-startedAtClinic"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <Label className="text-xs font-semibold text-neutral-dark">Sobre / Bio</Label>
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => f ? { ...f, bio: e.target.value } : f)}
                    rows={3}
                    className="mt-1 resize-none text-sm"
                    data-testid="textarea-edit-bio"
                  />
                </div>

                {/* Specializations */}
                <div>
                  <Label className="text-xs font-semibold text-neutral-dark block mb-2">Áreas de Atuação</Label>
                  <SpecializationChipSelector
                    selectedIds={editSpecIds}
                    onChange={setEditSpecIds}
                  />
                </div>

                {/* Admin-only: Status toggle */}
                <div className="border-t border-neutral-light pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary/70 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-darkest">Status da Psicóloga</p>
                        <p className="text-xs text-neutral-dark">
                          {editingPsych.user.status === "active"
                            ? "Psicóloga está ativa no sistema."
                            : "Psicóloga está inativa no sistema."}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-1.5 text-xs",
                        editingPsych.user.status === "active"
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      )}
                      disabled={toggleActiveMutation.isPending}
                      onClick={() => toggleActiveMutation.mutate(editingPsych.id)}
                      data-testid="button-toggle-active"
                    >
                      {editingPsych.user.status === "active" ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ativar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPsych(null)} data-testid="button-cancel-edit">
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-psych"
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
