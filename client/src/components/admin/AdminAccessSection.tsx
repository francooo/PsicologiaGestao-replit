import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Mail, ShieldCheck, Trash2, UserPlus, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { IconField, InfoBanner } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type Admin = { id: number; fullName: string; email: string; username: string; status: string; avatarUrl: string | null };
type Invite = { id: number; email: string; role: string; createdAt: string };
type AdminsResponse = { admins: Admin[]; invites: Invite[] };

const QUERY_KEY = ["/api/admin/admins"];

/** apiRequest throws "409: {json}" — show the server's message to the user. */
function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    return JSON.parse(body).message ?? body;
  } catch {
    return body;
  }
}

type Pending = { kind: "admin"; id: number; label: string } | { kind: "invite"; id: number; label: string };

/** Configurações → Administradores (admin only): who administers the system and pre-authorized e-mails. */
export function AdminAccessSection({ className }: { className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState<Pending | null>(null);

  const { data, isLoading } = useQuery<AdminsResponse>({ queryKey: QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: async (value: string) => (await apiRequest("POST", "/api/admin/admins", { email: value })).json(),
    onSuccess: (res: { type: "promoted" | "invited" }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setEmail("");
      toast(
        res.type === "promoted"
          ? { title: "Administrador adicionado", description: "A conta já existia e agora tem acesso de administrador." }
          : { title: "E-mail pré-autorizado", description: "No primeiro acesso, com Google ou cadastro, essa pessoa já entra como administradora." },
      );
    },
    onError: (error) => toast({ title: "Não foi possível adicionar", description: errorMessage(error), variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (p: Pending) => apiRequest("DELETE", p.kind === "admin" ? `/api/admin/admins/${p.id}` : `/api/admin/invites/${p.id}`),
    onSuccess: (_r, p) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setConfirm(null);
      toast({ title: p.kind === "admin" ? "Acesso de administrador removido" : "Pré-autorização cancelada" });
    },
    onError: (error) => {
      setConfirm(null);
      toast({ title: "Não foi possível remover", description: errorMessage(error), variant: "destructive" });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) addMutation.mutate(email.trim());
  };

  return (
    <section className={className} aria-labelledby="admins-title">
      <h2 id="admins-title" className="flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
        <ShieldCheck className="h-5 w-5 text-cp-muted" />
        Administradores
      </h2>
      <p className="mb-5 text-sm text-cp-muted">Quem pode gerenciar todo o sistema: psicólogas, salas, financeiro, comissões e permissões.</p>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <IconField icon={Mail} className="flex-1">
          <Input
            type="email"
            placeholder="E-mail do novo administrador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-mail do novo administrador"
            data-testid="input-admin-email"
          />
        </IconField>
        <button type="submit" className={cpButton.primary} disabled={!email.trim() || addMutation.isPending} data-testid="button-add-admin">
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Adicionar administrador
        </button>
      </form>
      <InfoBanner variant="info" className="mt-3">
        Se o e-mail ainda não tem conta, ele fica pré-autorizado: no primeiro acesso, com Google ou cadastro, a pessoa já entra como administradora.
      </InfoBanner>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Ativos ({data?.admins.length ?? 0})</h3>
            <ul className="space-y-2">
              {data?.admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-cp-divider px-3 py-2.5" data-testid={`admin-row-${a.id}`}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={a.avatarUrl || undefined} />
                    <AvatarFallback className="bg-cp-lavender text-sm font-semibold text-cp-lavender-ink">{a.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-cp-ink">
                      {a.fullName}
                      {a.id === user?.id && <span className="ml-1.5 text-xs font-normal text-cp-muted">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-cp-muted">{a.email}</p>
                  </div>
                  {a.status !== "active" && <StatusBadge label="Inativo" tone="neutral" />}
                  {a.id !== user?.id && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-danger-soft hover:text-cp-danger"
                      onClick={() => setConfirm({ kind: "admin", id: a.id, label: a.fullName })}
                      aria-label={`Remover ${a.fullName} dos administradores`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Aguardando primeiro acesso ({data?.invites.length ?? 0})</h3>
            {data?.invites.length ? (
              <ul className="space-y-2">
                {data.invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl bg-cp-hover px-3 py-2.5" data-testid={`invite-row-${i.id}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cp-warning-soft text-cp-warning">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-cp-ink">{i.email}</p>
                      <p className="text-xs text-cp-muted">Pré-autorizado em {format(new Date(i.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-danger-soft hover:text-cp-danger"
                      onClick={() => setConfirm({ kind: "invite", id: i.id, label: i.email })}
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
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o && !removeMutation.isPending) setConfirm(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cp-ink">
              {confirm?.kind === "admin" ? "Remover acesso de administrador?" : "Cancelar pré-autorização?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "admin"
                ? `${confirm.label} continua com a conta, mas passa a ter acesso de psicóloga.`
                : `${confirm?.label} deixa de entrar como administrador no primeiro acesso.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={removeMutation.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className={cn("rounded-xl bg-cp-danger hover:bg-cp-danger/90")}
              disabled={removeMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (confirm) removeMutation.mutate(confirm); }}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirm?.kind === "admin" ? "Remover" : "Cancelar pré-autorização"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
