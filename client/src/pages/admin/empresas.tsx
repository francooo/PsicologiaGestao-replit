import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Clock, FileText, Loader2, LogIn, Mail, Pause, Pencil, Play, Plus, Trash2, UserPlus } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { roleName } from "@/components/cp/status";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type Company = {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  status: "active" | "suspended";
  createdAt: string;
  membersCount: number;
  adminsCount: number;
  pendingInvitesCount: number;
};
type Member = { id: number; fullName: string; email: string; role: string; status: string };
type Invite = { id: number; email: string; role: string; createdAt: string };
type CompanyDetail = { company: Company; members: Member[]; invites: Invite[] };
type AdminResult = { type: "promoted" | "invited" };

const LIST_KEY = ["/api/platform/companies"];
const detailKey = (id: number) => ["/api/platform/companies", id];

const formatCnpj = (v: string | null) =>
  v && v.length === 14 ? v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : v;

const adminToast = (res: AdminResult | null) =>
  !res
    ? undefined
    : res.type === "promoted"
      ? "A conta já existia e agora administra a empresa."
      : "E-mail pré-autorizado: no primeiro acesso, com Google ou cadastro, a pessoa já entra como administradora.";

/** Platform admin: every company (clínica) — create, rename, suspend, invite admins, enter for support. */
export default function AdminEmpresas() {
  const { user, switchCompanyMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: companies = [], isLoading } = useQuery<Company[]>({ queryKey: LIST_KEY });

  const enter = (c: Company) => {
    if (c.id === user?.activeCompany?.id) return navigate("/");
    switchCompanyMutation.mutate(c.id, {
      onSuccess: () => {
        toast({ title: `Você entrou em ${c.name}`, description: "Agora você vê os dados desta empresa." });
        navigate("/");
      },
    });
  };

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />

        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Empresas"
            icon={Building2}
            subtitle="Clínicas da plataforma: crie, acompanhe e entre para dar suporte."
            actions={
              <button type="button" className={cpButton.primary} onClick={() => setCreating(true)} data-testid="button-new-company">
                <Plus className="h-4 w-4" />
                Nova empresa
              </button>
            }
          />

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cp-action" /></div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {companies.map((c) => {
                const isActive = c.id === user?.activeCompany?.id;
                const entering = switchCompanyMutation.isPending && switchCompanyMutation.variables === c.id;
                return (
                  <li key={c.id} className="flex flex-col rounded-2xl border border-cp-divider bg-white p-5 shadow-sm" data-testid={`company-${c.id}`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cp-sage-soft">
                        <Building2 className="h-5 w-5 text-cp-sage-ink" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-semibold text-cp-ink">{c.name}</p>
                        <p className="text-xs text-cp-muted">Criada em {format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      {c.status === "suspended" ? (
                        <StatusBadge label="Suspensa" tone="danger" />
                      ) : isActive ? (
                        <StatusBadge label="Você está aqui" tone="success" />
                      ) : null}
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Stat label="Membros" value={c.membersCount} />
                      <Stat label="Admins" value={c.adminsCount} />
                      <Stat label="Convites" value={c.pendingInvitesCount} />
                    </dl>
                    {c.adminsCount === 0 && c.pendingInvitesCount === 0 && (
                      <InfoBanner variant="warning" className="mt-3">Sem administrador: convide alguém em Detalhes.</InfoBanner>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button type="button" className={cn(cpButton.secondary, "flex-1 px-3")} onClick={() => setOpenId(c.id)}>
                        <Pencil className="h-4 w-4" />
                        Detalhes
                      </button>
                      <button
                        type="button"
                        className={cn(cpButton.primary, "flex-1 px-3")}
                        onClick={() => enter(c)}
                        disabled={c.status === "suspended" || switchCompanyMutation.isPending}
                        title={c.status === "suspended" ? "Reative a empresa para entrar" : undefined}
                      >
                        {entering ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                        {isActive ? "Abrir" : "Entrar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>

      <NewCompanyDialog open={creating} onOpenChange={setCreating} onCreated={(msg) => toast(msg)} />
      {openId !== null && <CompanyDetailDialog id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cp-hover py-2">
      <dt className="text-[11px] uppercase tracking-[0.08em] text-cp-muted">{label}</dt>
      <dd className="text-[18px] font-semibold text-cp-ink">{value}</dd>
    </div>
  );
}

function NewCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (toast: { title: string; description?: string }) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", cnpj: "", adminEmail: "" });
  useEffect(() => {
    if (open) setForm({ name: "", cnpj: "", adminEmail: "" });
  }, [open]);

  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/platform/companies", form)).json(),
    onSuccess: (res: { company: Company; admin: AdminResult | { type: "conflict"; message: string } | null }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      onOpenChange(false);
      onCreated({
        title: `Empresa ${res.company.name} criada`,
        description: res.admin?.type === "conflict" ? res.admin.message : adminToast(res.admin as AdminResult | null),
      });
    },
    onError: (error) => toast({ title: "Não foi possível criar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg rounded-2xl">
        <ModalHeader icon={Building2} title="Nova empresa" description="Uma clínica nova, com dados separados das demais." />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Nome da clínica</Label>
            <IconField icon={Building2}>
              <Input id="company-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </IconField>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-cnpj">CNPJ (opcional)</Label>
            <IconField icon={FileText}>
              <Input id="company-cnpj" inputMode="numeric" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </IconField>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-admin">E-mail do primeiro administrador</Label>
            <IconField icon={Mail}>
              <Input id="company-admin" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </IconField>
            <p className="text-xs text-cp-muted">Se ainda não tiver conta, entra como administrador no primeiro acesso (Google ou cadastro).</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={cpButton.secondary} onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </button>
            <button type="submit" className={cpButton.primary} disabled={!form.name.trim() || create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar empresa
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanyDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<CompanyDetail>({ queryKey: detailKey(id), queryFn: async () => (await apiRequest("GET", `/api/platform/companies/${id}`)).json() });
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.company.name);
      setCnpj(formatCnpj(data.company.cnpj) ?? "");
    }
  }, [data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: detailKey(id) });
    // The active company's name shows up in /api/user
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };
  const onError = (title: string) => (error: unknown) => toast({ title, description: errorMessage(error), variant: "destructive" });

  const save = useMutation({
    mutationFn: (body: Record<string, string>) => apiRequest("PATCH", `/api/platform/companies/${id}`, body),
    onSuccess: () => {
      refresh();
      setConfirmStatus(false);
      toast({ title: "Empresa atualizada" });
    },
    onError: onError("Não foi possível salvar"),
  });
  const addAdmin = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/platform/companies/${id}/admins`, { email: adminEmail })).json(),
    onSuccess: (res: AdminResult) => {
      refresh();
      setAdminEmail("");
      toast({ title: "Administrador adicionado", description: adminToast(res) });
    },
    onError: onError("Não foi possível adicionar"),
  });
  const cancelInvite = useMutation({
    mutationFn: (inviteId: number) => apiRequest("DELETE", `/api/platform/companies/${id}/invites/${inviteId}`),
    onSuccess: () => {
      refresh();
      toast({ title: "Pré-autorização cancelada" });
    },
    onError: onError("Não foi possível cancelar"),
  });

  const company = data?.company;
  const suspended = company?.status === "suspended";
  const changed = !!company && (name.trim() !== company.name || cnpj.replace(/\D/g, "") !== (company.cnpj ?? ""));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <ModalHeader icon={Building2} title={company?.name ?? "Empresa"} description={company ? `Identificador: ${company.slug}` : undefined} />

        {isLoading || !company ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-cp-action" /></div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Dados</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="detail-name">Nome</Label>
                  <Input id="detail-name" className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="detail-cnpj">CNPJ</Label>
                  <Input id="detail-cnpj" className="h-11 rounded-xl" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  className={cn(cpButton.secondary, suspended ? "" : "text-cp-danger")}
                  onClick={() => (suspended ? save.mutate({ status: "active" }) : setConfirmStatus(true))}
                  disabled={save.isPending}
                >
                  {suspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {suspended ? "Reativar empresa" : "Suspender empresa"}
                </button>
                <button
                  type="button"
                  className={cpButton.primary}
                  disabled={!changed || !name.trim() || save.isPending}
                  onClick={() => save.mutate({ name: name.trim(), cnpj })}
                >
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar dados
                </button>
              </div>
              {suspended && (
                <InfoBanner variant="warning">Suspensa: ninguém consegue entrar nesta empresa. Os dados continuam guardados.</InfoBanner>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Novo administrador</h3>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminEmail.trim()) addAdmin.mutate();
                }}
              >
                <IconField icon={Mail} className="flex-1">
                  <Input type="email" placeholder="E-mail" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} aria-label="E-mail do novo administrador" />
                </IconField>
                <button type="submit" className={cpButton.primary} disabled={!adminEmail.trim() || addAdmin.isPending}>
                  {addAdmin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Adicionar
                </button>
              </form>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Membros ({data.members.length})</h3>
                {data.members.length ? (
                  <ul className="space-y-2">
                    {data.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl border border-cp-divider px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-cp-ink">{m.fullName}</p>
                          <p className="truncate text-xs text-cp-muted">{m.email}</p>
                        </div>
                        <StatusBadge label={roleName(m.role)} tone={m.role === "admin" ? "lavender" : "neutral"} />
                        {m.status !== "active" && <StatusBadge label="Inativo" tone="neutral" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-cp-divider py-4 text-center text-sm text-cp-muted">Ninguém ainda</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Aguardando primeiro acesso ({data.invites.length})</h3>
                {data.invites.length ? (
                  <ul className="space-y-2">
                    {data.invites.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 rounded-xl bg-cp-hover px-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cp-warning-soft text-cp-warning">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-cp-ink">{i.email}</p>
                          <p className="text-xs text-cp-muted">
                            {roleName(i.role)} · desde {format(new Date(i.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-danger-soft hover:text-cp-danger"
                          onClick={() => cancelInvite.mutate(i.id)}
                          disabled={cancelInvite.isPending}
                          aria-label={`Cancelar pré-autorização de ${i.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-cp-divider py-4 text-center text-sm text-cp-muted">Nenhum e-mail aguardando</p>
                )}
              </div>
            </section>
          </div>
        )}

        <AlertDialog open={confirmStatus} onOpenChange={(o) => !save.isPending && setConfirmStatus(o)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-cp-ink">Suspender {company?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Ninguém consegue entrar nesta empresa enquanto estiver suspensa, e quem estiver usando é desconectado dela. Os dados continuam guardados e
                você pode reativar quando quiser.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={save.isPending}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-cp-danger hover:bg-cp-danger/90"
                disabled={save.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  save.mutate({ status: "suspended" });
                }}
              >
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Suspender
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
