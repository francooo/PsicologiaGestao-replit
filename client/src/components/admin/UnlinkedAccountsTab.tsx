import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Link2, Loader2, RotateCcw, Search, ShieldCheck, Stethoscope, UserCheck, UserX, Headset } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cpButton } from "@/components/cp/PageHeader";
import { IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

export type UnlinkedAccount = {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string | null;
  viaGoogle: boolean;
  lastCompanyName: string | null;
};
type CompanyOption = { id: number; name: string; status: "active" | "suspended" };
type Filter = "waiting" | "inactive";

export const unlinkedKey = (status: Filter) => ["/api/platform/unlinked-accounts", status];
const unlinkedUrl = (status: Filter) => `/api/platform/unlinked-accounts?status=${status}`;

/** Waiting accounts, also used by the page for the tab counter. */
export const useUnlinkedAccounts = (status: Filter) =>
  useQuery<UnlinkedAccount[]>({
    queryKey: unlinkedKey(status),
    queryFn: async () => (await apiRequest("GET", unlinkedUrl(status))).json(),
  });

const invalidate = () => {
  queryClient.invalidateQueries({ queryKey: ["/api/platform/unlinked-accounts"] });
  queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
};

const ROLES = [
  { value: "psychologist", label: "Psicóloga", hint: "Atende pacientes, agenda e prontuários.", icon: Stethoscope },
  { value: "receptionist", label: "Recepcionista", hint: "Agenda, salas e cadastro de pacientes.", icon: Headset },
  { value: "admin", label: "Administrador", hint: "Gerencia a clínica, a equipe e o financeiro.", icon: ShieldCheck },
] as const;

/** Empresas → Contas sem clínica: who signed up without an invite (or lost every clinic). */
export function UnlinkedAccountsTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("waiting");
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<UnlinkedAccount | null>(null);
  const [deactivating, setDeactivating] = useState<UnlinkedAccount | null>(null);

  const { data: accounts = [], isLoading } = useUnlinkedAccounts(filter);
  const term = search.trim().toLowerCase();
  const shown = term ? accounts.filter((a) => `${a.fullName} ${a.email}`.toLowerCase().includes(term)) : accounts;

  const deactivate = useMutation({
    mutationFn: (a: UnlinkedAccount) => apiRequest("POST", `/api/platform/unlinked-accounts/${a.id}/deactivate`),
    onSuccess: (_res, a) => {
      invalidate();
      setDeactivating(null);
      toast({ title: `Conta de ${a.fullName} desativada`, description: "Ela fica em Desativadas e pode ser reativada." });
    },
    onError: (error) => toast({ title: "Não foi possível desativar", description: errorMessage(error), variant: "destructive" }),
  });

  const reactivate = useMutation({
    mutationFn: (a: UnlinkedAccount) => apiRequest("POST", `/api/platform/unlinked-accounts/${a.id}/reactivate`),
    onSuccess: (_res, a) => {
      invalidate();
      toast({ title: `Conta de ${a.fullName} reativada`, description: "Ela volta para a lista Aguardando." });
    },
    onError: (error) => toast({ title: "Não foi possível reativar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex gap-0.5 self-start rounded-xl bg-cp-hover p-1" role="tablist" aria-label="Situação das contas">
          {(["waiting", "inactive"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all",
                filter === f ? "bg-cp-sage-soft text-cp-ink shadow-sm" : "text-cp-muted hover:text-cp-ink"
              )}
            >
              {f === "waiting" ? "Aguardando" : "Desativadas"}
            </button>
          ))}
        </div>
        <IconField icon={Search} className="sm:w-80">
          <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar conta" />
        </IconField>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cp-action" /></div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-cp-divider bg-white px-6 py-12 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cp-sage-soft">
            <UserCheck className="h-6 w-6 text-cp-sage-ink" aria-hidden="true" />
          </span>
          <p className="text-[16px] font-semibold text-cp-ink">
            {term ? "Nenhuma conta encontrada" : filter === "waiting" ? "Nenhuma conta aguardando vínculo" : "Nenhuma conta desativada"}
          </p>
          {!term && filter === "waiting" && (
            <p className="mt-1 max-w-md text-sm text-cp-muted">
              Aparecem aqui as pessoas que criaram a conta sem convite, ou que saíram de todas as clínicas.
            </p>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-cp-divider bg-white p-4 shadow-sm sm:flex-row sm:items-center" data-testid={`unlinked-${a.id}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={a.avatarUrl || undefined} />
                  <AvatarFallback className="bg-cp-lavender text-sm font-semibold text-cp-lavender-ink">{a.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[15px] font-semibold text-cp-ink">{a.fullName}</p>
                    {a.viaGoogle && <StatusBadge label="Google" tone="neutral" />}
                  </div>
                  <p className="truncate text-sm text-cp-muted">{a.email}</p>
                  <p className="text-xs text-cp-subtle">
                    {a.createdAt ? `Cadastro em ${format(new Date(a.createdAt), "dd/MM/yyyy", { locale: ptBR })}` : "Conta antiga"}
                    {a.lastCompanyName && ` · Saiu de ${a.lastCompanyName}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {filter === "waiting" ? (
                  <>
                    <button type="button" className={cn(cpButton.primary, "h-9 flex-1 px-3 text-[13px]")} onClick={() => setLinking(a)}>
                      <Link2 className="h-4 w-4" />
                      Vincular
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-danger-soft hover:text-cp-danger"
                      onClick={() => setDeactivating(a)}
                      aria-label={`Desativar a conta de ${a.fullName}`}
                      title="Desativar conta"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={cn(cpButton.secondary, "h-9 flex-1 px-3 text-[13px]")}
                    onClick={() => reactivate.mutate(a)}
                    disabled={reactivate.isPending}
                  >
                    {reactivate.isPending && reactivate.variables?.id === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reativar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {linking && <LinkAccountDialog account={linking} onClose={() => setLinking(null)} />}

      <AlertDialog open={deactivating !== null} onOpenChange={(o) => !o && !deactivate.isPending && setDeactivating(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cp-ink">Desativar a conta de {deactivating?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa não consegue mais entrar no sistema e as sessões abertas são encerradas. Dá para reativar depois, em Desativadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deactivate.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-cp-danger hover:bg-cp-danger/90"
              disabled={deactivate.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deactivating) deactivate.mutate(deactivating);
              }}
            >
              {deactivate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LinkAccountDialog({ account, onClose }: { account: UnlinkedAccount; onClose: () => void }) {
  const { toast } = useToast();
  const { data: companies = [] } = useQuery<CompanyOption[]>({ queryKey: ["/api/platform/companies"] });
  const active = companies.filter((c) => c.status === "active");
  const [companyId, setCompanyId] = useState<string>(active.length === 1 ? String(active[0].id) : "");
  const [role, setRole] = useState<string>("psychologist");

  const link = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", `/api/platform/unlinked-accounts/${account.id}/link`, { companyId: Number(companyId), role })).json(),
    onSuccess: (res: { company: { name: string } }) => {
      invalidate();
      onClose();
      toast({ title: `${account.fullName} agora faz parte de ${res.company.name}`, description: "No próximo acesso, a pessoa já entra nesta clínica." });
    },
    onError: (error) => toast({ title: "Não foi possível vincular", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !link.isPending && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <ModalHeader icon={Link2} title="Vincular a uma clínica" description={`${account.fullName} · ${account.email}`} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            link.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="link-company">Clínica</Label>
            <IconField icon={Building2}>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="link-company">
                  <SelectValue placeholder="Escolha a clínica" />
                </SelectTrigger>
                <SelectContent>
                  {active.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-cp-ink">Papel na clínica</legend>
            <div className="grid gap-2" role="radiogroup">
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selected ? "border-cp-sage-ink bg-cp-sage-soft" : "border-cp-divider hover:bg-cp-hover"
                    )}
                  >
                    <r.icon className={cn("h-5 w-5 shrink-0", selected ? "text-cp-sage-ink" : "text-cp-muted")} aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium text-cp-ink">{r.label}</span>
                      <span className="block text-xs text-cp-muted">{r.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <InfoBanner variant="info">No próximo acesso, a pessoa já entra nesta clínica com o papel escolhido.</InfoBanner>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={cpButton.secondary} onClick={onClose} disabled={link.isPending}>
              Cancelar
            </button>
            <button type="submit" className={cpButton.primary} disabled={!companyId || link.isPending}>
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Vincular
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
