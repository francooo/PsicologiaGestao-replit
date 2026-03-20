import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  CalendarDays,
  Lock,
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  ToggleLeft,
  ToggleRight,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import SpecializationChipSelector from "@/components/specialization-chip-selector";
import { cn } from "@/lib/utils";

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
  specializations: { id: number; name: string; category: string | null }[];
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

function PsychCard({ p, onEdit }: { p: Psychologist; onEdit: () => void }) {
  const isActive = p.user.status === "active";
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-neutral-light shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 cursor-pointer",
        !isActive && "opacity-60"
      )}
      onClick={onEdit}
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
          <p className="text-xs text-neutral-dark truncate">{p.user.email}</p>
        </div>
      </div>

      {/* Specialization chips */}
      {p.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.specializations.slice(0, 4).map((s) => (
            <span
              key={s.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {s.name}
            </span>
          ))}
          {p.specializations.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-lightest text-neutral-dark border border-neutral-light">
              +{p.specializations.length - 4}
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
            {p.monthsAtClinic !== null ? `${p.monthsAtClinic}m` : "—"}
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
  const [editingPsych, setEditingPsych] = useState<Psychologist | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editSpecIds, setEditSpecIds] = useState<number[]>([]);

  const { data: psychologists = [], isLoading } = useQuery<Psychologist[]>({
    queryKey: ["/api/admin/psychologists"],
  });

  const openEdit = (p: Psychologist) => {
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
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/psychologists"] });
      if (editForm) setEditForm((f) => (f ? { ...f, status: data.status } : f));
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

    return matchSearch && matchStatus;
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
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
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
              <PsychCard key={p.id} p={p} onEdit={() => openEdit(p)} />
            ))}
          </div>
        )}

        {/* Edit Modal */}
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
                  <p className="text-base font-semibold">{editingPsych?.user.fullName}</p>
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
                      {editingPsych.monthsAtClinic !== null ? `${editingPsych.monthsAtClinic}m` : "—"}
                    </p>
                    <p className="text-[11px] text-neutral-dark">Na Clínica</p>
                  </div>
                </div>

                {/* Fields Grid */}
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
                            <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            Editável apenas pelo administrador.
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
                    <Label className="text-xs font-semibold text-neutral-dark">Telefone / WhatsApp</Label>
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

                  {/* Admin-only: startedAtClinic */}
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
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-primary/70" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-darkest">Status da Psicóloga</p>
                        <p className="text-xs text-neutral-dark">
                          {editingPsych.user.status === "active"
                            ? "A psicóloga está ativa no sistema."
                            : "A psicóloga está inativa no sistema."}
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
