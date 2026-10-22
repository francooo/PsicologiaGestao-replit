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
  Mail,
  Phone,
  FileText,
  Info,
  Leaf,
  Home,
  Plus,
  Trash2,
  Filter,
  Tag,
  Loader2,
  Save,
} from "lucide-react";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { IconField, ModalHeader } from "@/components/cp/fields";
import { NewPsychologistDialog } from "@/components/admin/NewPsychologistDialog";
import MobileNav from "@/components/mobile-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-cp-divider bg-white p-5 text-left shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] transition-shadow hover:shadow-[0_14px_44px_-18px_rgba(36,54,71,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action",
        !isActive && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`card-psychologist-${p.id}`}
    >
      <div className="flex w-full items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={p.user.profileImage || undefined} />
          <AvatarFallback className="bg-cp-action font-bold text-white">
            {p.user.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold text-cp-ink">{p.user.fullName}</h3>
            <StatusBadge label={isActive ? "Ativa" : "Inativa"} tone={isActive ? "success" : "neutral"} className="flex-shrink-0" />
          </div>
          {p.crpNumber && <p className="mt-0.5 text-xs text-cp-muted">CRP {p.crpNumber}</p>}
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-cp-muted">
            {(p.age ?? 0) > 0 && <span>{p.age} anos</span>}
            {p.phone && <span className="truncate">{p.phone}</span>}
            {p.startedAtClinic && <span>desde {formatDate(p.startedAtClinic)}</span>}
          </div>
        </div>
      </div>

      {/* Specialization chips - up to 3 + counter */}
      {p.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.specializations.slice(0, 3).map((s) => (
            <span key={s.id} className="rounded-full bg-cp-sage-soft px-2.5 py-0.5 text-[11px] font-medium text-cp-sage-ink">
              {s.name}
            </span>
          ))}
          {p.specializations.length > 3 && (
            <span className="rounded-full bg-cp-hover px-2.5 py-0.5 text-[11px] font-medium text-cp-muted">
              +{p.specializations.length - 3} mais
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-1 grid w-full grid-cols-3 gap-2 border-t border-cp-divider pt-3">
        <div className="text-center">
          <p className="text-base font-bold text-cp-ink">{p.activePatientsCount}</p>
          <p className="text-[11px] leading-tight text-cp-muted">Pacientes</p>
        </div>
        <div className="border-x border-cp-divider text-center">
          <p className="text-base font-bold text-cp-ink">{p.sessionsCount}</p>
          <p className="text-[11px] leading-tight text-cp-muted">Sessões</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-cp-ink">
            {p.monthsAtClinic !== null ? monthsText(p.startedAtClinic) : "—"}
          </p>
          <p className="text-[11px] leading-tight text-cp-muted">Na Clínica</p>
        </div>
      </div>
    </button>
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
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Removes the psychologist profile (the login stays, as on the old /psychologists page)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/psychologists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/psychologists"] });
      setConfirmDelete(false);
      setEditingPsych(null);
      toast({ title: "Psicóloga removida." });
    },
    onError: () => toast({ title: "Erro ao remover psicóloga", variant: "destructive" }),
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
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 md:ml-64 md:pt-0">
      <MobileNav />
      <main className="p-4 pb-20 sm:px-7 sm:py-6">
        <PageHeader
          className="mb-6"
          title="Psicólogas"
          icon={Users}
          subtitle="Gerencie os perfis profissionais, áreas de atuação e status das psicólogas."
          phrase
          actions={
            <button type="button" className={cpButton.primary} onClick={() => setIsNewOpen(true)} data-testid="button-new-psych">
              <Plus className="h-4 w-4" />
              Nova Psicóloga
            </button>
          }
        />
        <NewPsychologistDialog open={isNewOpen} onOpenChange={setIsNewOpen} existingPsychUserIds={psychologists.map((p) => p.userId)} />

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-cp-divider bg-white p-4 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_220px]">
            <IconField icon={Search}>
              <Input
                placeholder="Buscar por nome, e-mail ou CRP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-psych-search"
              />
            </IconField>
            <IconField icon={Filter}>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger data-testid="select-status-filter" aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </IconField>
            <IconField icon={Tag}>
              <Select value={specFilter === "all" ? "all" : String(specFilter)} onValueChange={(v) => setSpecFilter(v === "all" ? "all" : parseInt(v))}>
                <SelectTrigger data-testid="select-spec-filter" aria-label="Área de atuação"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {allAreaOptions.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-cp-muted">
            {filtered.length} psicóloga{filtered.length !== 1 ? "s" : ""}
          </span>
          <StatusBadge label={`${psychologists.filter((p) => p.user.status === "active").length} ativas`} tone="success" />
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-cp-divider bg-white py-20 text-center">
            <Users className="mb-3 h-10 w-10 text-cp-sage" />
            <p className="text-sm font-medium text-cp-ink">Nenhuma psicóloga encontrada.</p>
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
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl border-cp-divider bg-cp-bg p-0">
            <div className="relative overflow-hidden px-6 pb-6 pt-8 sm:px-10">
              {/* soft decorative blobs, behind content */}
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cp-sage-soft" />
              <div aria-hidden="true" className="pointer-events-none absolute -right-2 top-20 h-28 w-28 rounded-full bg-cp-lavender-soft" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-60 rounded-full bg-cp-sand-soft" />

              <DialogHeader className="relative space-y-0 text-left">
                <DialogTitle className="flex items-center gap-5">
                  <Avatar className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                    <AvatarImage src={viewingPsych?.user.profileImage || undefined} />
                    <AvatarFallback className="bg-cp-action text-3xl font-bold text-white">
                      {viewingPsych?.user.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[26px] font-bold leading-tight text-cp-ink sm:text-[30px]">{viewingPsych?.user.fullName}</p>
                    {viewingPsych?.crpNumber && (
                      <p className="mt-0.5 text-sm font-normal text-cp-muted">CRP {viewingPsych.crpNumber}</p>
                    )}
                    {viewingPsych && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={viewingPsych.user.status === "active" ? "Ativa" : "Inativa"}
                          tone={viewingPsych.user.status === "active" ? "success" : "neutral"}
                        />
                        {viewingPsych.startedAtClinic && (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-cp-muted">
                            <Calendar className="h-3 w-3" />
                            Ativa desde {formatDate(viewingPsych.startedAtClinic)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              {viewingPsych && (
                <div className="relative mt-6 space-y-5">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Users, value: viewingPsych.activePatientsCount, label: "Pacientes Ativos", box: "bg-cp-sage-soft", dot: "bg-white/70 text-cp-sage-ink" },
                      { icon: Calendar, value: viewingPsych.sessionsCount, label: "Sessões Totais", box: "bg-cp-lavender-soft", dot: "bg-white/70 text-cp-lavender-ink" },
                      { icon: Home, value: viewingPsych.monthsAtClinic !== null ? monthsText(viewingPsych.startedAtClinic) : "—", label: "Na Clínica", box: "bg-cp-sand-soft", dot: "bg-white/70 text-cp-sand-ink" },
                    ].map(({ icon: Icon, value, label, box, dot }) => (
                      <div key={label} className={cn("flex flex-col items-center rounded-2xl px-2 py-4 text-center", box)}>
                        <span className={cn("mb-2 flex h-11 w-11 items-center justify-center rounded-full", dot)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <p className="text-[26px] font-bold leading-tight text-cp-ink">{value}</p>
                        <p className="text-[13px] text-cp-ink sm:text-[15px]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Info grid */}
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-cp-divider pt-5 sm:grid-cols-2">
                    {[
                      { icon: Mail, label: "E-mail", value: viewingPsych.user.email },
                      { icon: Phone, label: "Telefone", value: viewingPsych.phone || "—" },
                      { icon: Calendar, label: "Nascimento", value: `${formatDate(viewingPsych.user.birthDate)}${viewingPsych.age ? ` (${viewingPsych.age} anos)` : ""}` },
                      { icon: FileText, label: "CRP", value: viewingPsych.crpNumber || "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-hover text-cp-ink">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">{label}</dt>
                          <dd className="mt-0.5 break-words text-[15px] text-cp-ink">{value}</dd>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-hover text-cp-ink">
                        <Info className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Sobre</dt>
                        <dd className={cn("mt-0.5 whitespace-pre-wrap text-[15px]", viewingPsych.bio ? "text-cp-ink" : "text-cp-muted")}>
                          {viewingPsych.bio || "Bio pendente…"}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  {/* Specializations (read-only) */}
                  <div className="flex items-start gap-3 border-t border-cp-divider pt-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-sage-soft text-cp-sage-ink">
                      <Leaf className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Áreas de Atuação</p>
                      <SpecializationChipSelector
                        selectedIds={viewingPsych.specializations.map((s) => s.id)}
                        onChange={() => {}}
                        readonly
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-cp-divider pt-5">
                <div aria-hidden="true" className="hidden sm:block">
                  <p className="text-[10px] uppercase leading-5 tracking-[0.4em] text-cp-subtle">Cuidar</p>
                  <p className="text-[10px] uppercase leading-5 tracking-[0.4em] text-cp-subtle">também</p>
                  <p className="text-[10px] uppercase leading-5 tracking-[0.4em] text-cp-subtle">organiza</p>
                </div>
                <div className="ml-auto flex gap-3">
                  <button type="button" className={cpButton.secondary} onClick={() => setViewingPsych(null)} data-testid="button-close-details">
                    Fechar
                  </button>
                  <button
                    type="button"
                    className={cpButton.primary}
                    onClick={() => viewingPsych && openEdit(viewingPsych)}
                    data-testid="button-open-edit"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Editar Modal ─────────────────────────────────────────── */}
        <Dialog open={!!editingPsych} onOpenChange={(open) => !open && setEditingPsych(null)}>
          <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
            <ModalHeader icon={Edit} title={`Editar: ${editingPsych?.user.fullName ?? ""}`} description={editingPsych?.crpNumber ? `CRP ${editingPsych.crpNumber}` : "Atualize o perfil profissional."} />

            {editForm && editingPsych && (
              <div className="space-y-5 py-2 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-cp-border [&_input:focus-visible]:ring-cp-action [&_textarea]:rounded-xl [&_textarea]:border-cp-border [&_textarea:focus-visible]:ring-cp-action">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-cp-hover p-3 text-center">
                    <p className="text-lg font-bold text-cp-ink">{editingPsych.activePatientsCount}</p>
                    <p className="text-[11px] text-cp-muted">Pacientes Ativos</p>
                  </div>
                  <div className="rounded-xl bg-cp-hover p-3 text-center">
                    <p className="text-lg font-bold text-cp-ink">{editingPsych.sessionsCount}</p>
                    <p className="text-[11px] text-cp-muted">Sessões Totais</p>
                  </div>
                  <div className="rounded-xl bg-cp-hover p-3 text-center">
                    <p className="text-lg font-bold text-cp-ink">
                      {editingPsych.monthsAtClinic !== null ? monthsText(editingPsych.startedAtClinic) : "—"}
                    </p>
                    <p className="text-[11px] text-cp-muted">Na Clínica</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[13px] font-semibold text-cp-ink">Nome Completo</Label>
                    <Input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((f) => f ? { ...f, fullName: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-fullName"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 text-[13px] font-semibold text-cp-ink">
                      E-mail
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 cursor-default text-cp-muted" />
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
                    <Label className="text-[13px] font-semibold text-cp-ink">Telefone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)}
                      placeholder="(11) 91234-5678"
                      className="mt-1"
                      data-testid="input-edit-phone"
                    />
                  </div>

                  <div>
                    <Label className="text-[13px] font-semibold text-cp-ink">Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={editForm.birthDate}
                      onChange={(e) => setEditForm((f) => f ? { ...f, birthDate: e.target.value } : f)}
                      className="mt-1"
                      data-testid="input-edit-birthDate"
                    />
                  </div>

                  <div>
                    <Label className="text-[13px] font-semibold text-cp-ink">Número do CRP</Label>
                    <Input
                      value={editForm.crpNumber}
                      onChange={(e) => setEditForm((f) => f ? { ...f, crpNumber: e.target.value } : f)}
                      placeholder="06/12345"
                      className="mt-1"
                      data-testid="input-edit-crpNumber"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 text-[13px] font-semibold text-cp-ink">
                      Entrada na Clínica
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 cursor-default text-cp-muted" />
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
                  <Label className="text-[13px] font-semibold text-cp-ink">Sobre / Bio</Label>
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
                  <Label className="mb-2 block text-[13px] font-semibold text-cp-ink">Áreas de Atuação</Label>
                  <SpecializationChipSelector
                    selectedIds={editSpecIds}
                    onChange={setEditSpecIds}
                  />
                </div>

                {/* Admin-only: Status toggle */}
                <div className="rounded-xl bg-cp-hover p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 flex-shrink-0 text-cp-muted" />
                      <div>
                        <p className="text-sm font-semibold text-cp-ink">Status da Psicóloga</p>
                        <p className="text-xs text-cp-muted">
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
                          ? "rounded-lg border-cp-danger/30 bg-white text-cp-danger hover:bg-cp-danger-soft"
                          : "rounded-lg border-cp-success/30 bg-white text-cp-success hover:bg-cp-success-soft"
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

            <DialogFooter className="flex-wrap gap-3 pt-2 sm:justify-between">
              <button type="button" className={cn(cpButton.secondary, "border-cp-danger/30 text-cp-danger hover:bg-cp-danger-soft")} onClick={() => setConfirmDelete(true)} data-testid="button-delete-psych">
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
              <div className="flex gap-3">
                <button type="button" className={cpButton.subtle} onClick={() => setEditingPsych(null)} data-testid="button-cancel-edit">
                  Cancelar
                </button>
                <button type="button" className={cpButton.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-psych">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={confirmDelete} onOpenChange={(o) => { if (!deleteMutation.isPending) setConfirmDelete(o); }}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-cp-ink">Excluir {editingPsych?.user.fullName}?</AlertDialogTitle>
              <AlertDialogDescription>
                O perfil profissional é removido da clínica. O acesso (login) da pessoa continua existindo. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={deleteMutation.isPending}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-cp-danger hover:bg-cp-danger/90"
                disabled={deleteMutation.isPending}
                onClick={(e) => { e.preventDefault(); if (editingPsych) deleteMutation.mutate(editingPsych.id); }}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      </div>
    </div>
  );
}
