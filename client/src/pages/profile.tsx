import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Settings,
  CalendarClock,
  Link as LinkIcon,
  Unlink,
  Loader2,
  UserCircle,
  Mail,
  AtSign,
  Shield,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
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
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { InfoBanner } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { roleName } from "@/components/cp/status";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";

type CalendarEvent = { id?: string; summary?: string; start?: { dateTime?: string; date?: string } };

/** Timed events show date + time; all-day events (start.date only) show just the date. */
function eventWhen(e: CalendarEvent) {
  if (e.start?.dateTime) return format(new Date(e.start.dateTime), "EEEE, dd 'de' MMM · HH:mm", { locale: ptBR });
  if (e.start?.date) {
    const [y, m, d] = e.start.date.split("-").map(Number);
    return `${format(new Date(y, m - 1, d), "EEEE, dd 'de' MMM", { locale: ptBR })} · dia inteiro`;
  }
  return "—";
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-hover text-cp-ink">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">{label}</p>
        <p className="mt-0.5 break-words text-[15px] text-cp-ink">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { data: googleCalendarStatus, isLoading: isLoadingStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/google-calendar/status"],
    enabled: !!user,
  });
  const connected = !!googleCalendarStatus?.authenticated;

  const { data: googleCalendarEvents, isLoading: isLoadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/google-calendar/events"],
    enabled: !!user && connected,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google-calendar/auth");
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank");
      toast({
        title: "Redirecionando para o Google",
        description: "Uma nova janela foi aberta para você autorizar o acesso ao Google Calendar.",
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível conectar ao Google Calendar. Tente novamente mais tarde.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/google-calendar/auth"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/google-calendar/status"], { authenticated: false });
      queryClient.removeQueries({ queryKey: ["/api/google-calendar/events"] });
      setConfirmDisconnect(false);
      toast({ title: "Google Calendar desconectado" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível desconectar. Tente novamente.", variant: "destructive" }),
  });

  // Return from the Google OAuth consent screen (server redirects here with a flag)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("googleCalendarConnected") === "true") {
      toast({ title: "Conectado ao Google Calendar", description: "Agora você pode sincronizar seus agendamentos com o Google Calendar." });
      navigate("/profile", { replace: true });
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
    } else if (urlParams.get("googleCalendarError") === "true") {
      toast({ title: "Erro na conexão", description: "Não foi possível conectar ao Google Calendar. Tente novamente.", variant: "destructive" });
      navigate("/profile", { replace: true });
    }
  }, []);

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="ml-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <main className="max-w-6xl p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader className="mb-6" title="Configurações" icon={Settings} subtitle="Sua conta e as integrações com outros serviços" phrase />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Conta */}
            <section className={cn(card, "p-5 sm:p-6 lg:col-span-2")} aria-labelledby="account-title">
              <h2 id="account-title" className="mb-5 flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
                <UserCircle className="h-5 w-5 text-cp-muted" />
                Conta
              </h2>
              <div className="mb-5 flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.profileImage || undefined} />
                  <AvatarFallback className="bg-cp-action text-xl font-bold text-white">{user?.fullName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-cp-ink" data-testid="text-fullname">{user?.fullName}</p>
                  <p className="text-sm text-cp-muted" data-testid="text-role">{roleName(user?.role)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <InfoRow icon={Mail} label="E-mail" value={user?.email || "—"} />
                <InfoRow icon={AtSign} label="Usuário" value={user?.username || "—"} />
                <InfoRow icon={Shield} label="Função" value={roleName(user?.role)} />
              </div>
              <p className="mt-5 text-xs text-cp-muted">E-mail e usuário só podem ser alterados por um administrador.</p>
              <button type="button" className={cn(cpButton.secondary, "mt-4 w-full")} onClick={() => navigate("/perfil")} data-testid="button-edit-profile">
                Editar meu perfil
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>

            {/* Integrações */}
            <section className={cn(card, "p-5 sm:p-6 lg:col-span-3")} aria-labelledby="integrations-title">
              <h2 id="integrations-title" className="text-[18px] font-semibold text-cp-ink">Integrações</h2>
              <p className="mb-5 text-sm text-cp-muted">Conecte sua conta com outras plataformas e serviços</p>

              <div className="rounded-xl border border-cp-divider p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cp-action-soft text-cp-action">
                      <CalendarClock className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-cp-ink">Google Calendar</h3>
                        {!isLoadingStatus && <StatusBadge label={connected ? "Conectado" : "Não conectado"} tone={connected ? "success" : "neutral"} />}
                      </div>
                      <p className="text-sm text-cp-muted">Agenda, links do Google Meet e convites por e-mail</p>
                    </div>
                  </div>

                  {connected ? (
                    <button type="button" className={cn(cpButton.secondary, "border-cp-danger/30 text-cp-danger hover:bg-cp-danger-soft")} onClick={() => setConfirmDisconnect(true)} data-testid="button-disconnect-google">
                      <Unlink className="h-4 w-4" />
                      Desconectar
                    </button>
                  ) : (
                    <button type="button" className={cpButton.primary} onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending || isLoadingStatus} data-testid="button-connect-google">
                      {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                      {connectMutation.isPending ? "Conectando..." : "Conectar"}
                    </button>
                  )}
                </div>

                {connected ? (
                  <div className="mt-4 space-y-4">
                    <InfoBanner variant="success" title="Sincronização ativa">
                      Seus agendamentos são sincronizados automaticamente com o seu Google Calendar.
                    </InfoBanner>
                    <div>
                      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">Próximos eventos</h4>
                      {isLoadingEvents ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
                      ) : googleCalendarEvents && googleCalendarEvents.length > 0 ? (
                        <ul className="space-y-2">
                          {googleCalendarEvents.slice(0, 3).map((event, index) => (
                            <li key={event.id ?? index} className="flex items-center gap-3 rounded-xl bg-cp-hover px-3 py-2.5 text-sm">
                              <CalendarDays className="h-4 w-4 shrink-0 text-cp-action" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-cp-ink">{event.summary || "(sem título)"}</p>
                                <p className="text-xs text-cp-muted first-letter:uppercase">{eventWhen(event)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="py-3 text-center text-sm text-cp-muted">Nenhum evento próximo encontrado</p>
                      )}
                    </div>
                  </div>
                ) : (
                  !isLoadingStatus && (
                    <InfoBanner variant="info" className="mt-4">
                      Sem a conexão não é possível gerar links do Google Meet nem enviar convites por e-mail nas Reuniões.
                    </InfoBanner>
                  )
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={(o) => { if (!disconnectMutation.isPending) setConfirmDisconnect(o); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cp-ink">Desconectar o Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              Os agendamentos deixam de ser sincronizados e as novas reuniões ficam sem link do Meet até você conectar de novo. Os eventos que já estão na sua agenda do Google não são apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={disconnectMutation.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-cp-danger hover:bg-cp-danger/90"
              disabled={disconnectMutation.isPending}
              onClick={(e) => { e.preventDefault(); disconnectMutation.mutate(); }}
            >
              {disconnectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
