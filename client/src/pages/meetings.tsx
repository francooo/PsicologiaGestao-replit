import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Video,
  Plus,
  ExternalLink,
  Send,
  Pencil,
  X,
  Check,
  Clock,
  CalendarDays,
  Users,
  CheckCircle2,
  Copy,
  AlertCircle,
  ChevronDown,
  Loader2,
  Play,
  Square,
  FileText,
  Search,
  User as UserIcon,
} from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { CharCountTextarea, IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { MetricCard } from "@/components/cp/MetricCard";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { meetingStatus, statusOf } from "@/components/cp/status";
import { format, isToday, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Patient } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
  id: number;
  psychologistId: number;
  patientId: number;
  appointmentId?: number;
  title: string;
  description?: string;
  googleEventId?: string;
  meetLink?: string;
  status: "scheduled" | "active" | "ended" | "cancelled";
  scheduledAt: string;
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string;
  actualDuration?: number;
  patientEmail?: string;
  patientName?: string;
  linkSentAt?: string;
  notes?: string;
  createdAt: string;
  isToday: boolean;
  patientFullName?: string;
  patientPhone?: string;
  patientPhotoUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function formatCronômetro(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function copyToClipboard(text: string, toast: any) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: "Link copiado!" });
  });
}

// ─── Active Session Banner ────────────────────────────────────────────────────

function ActiveSessionBanner({
  meeting,
  onEnterMeet,
  onEndSession,
}: {
  meeting: Meeting;
  onEnterMeet: () => void;
  onEndSession: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = meeting.startedAt ? new Date(meeting.startedAt).getTime() : Date.now();
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [meeting.startedAt]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 md:left-64 bg-cp-success text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium text-sm">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
          Sessão em andamento com {meeting.patientName || meeting.patientFullName}
        </span>
        <span className="text-white/80 text-sm font-mono">⏱ {formatCronômetro(elapsed)}</span>
      </div>
      <div className="flex items-center gap-2">
        {meeting.meetLink && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-white/60 text-cp-ink bg-white hover:bg-cp-success-soft"
            onClick={onEnterMeet}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Entrar no Meet
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-red-300 text-red-700 bg-white hover:bg-red-50"
          onClick={onEndSession}
        >
          <Square className="h-3 w-3 mr-1" />
          Encerrar Sessão
        </Button>
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onStart,
  onEnd,
  onSendLink,
  onViewNotes,
  onCancel,
  onEnterMeet,
}: {
  meeting: Meeting;
  onStart: (m: Meeting) => void;
  onEnd: (m: Meeting) => void;
  onSendLink: (m: Meeting) => void;
  onViewNotes: (m: Meeting) => void;
  onCancel: (m: Meeting) => void;
  onEnterMeet: (m: Meeting) => void;
}) {
  const status = statusOf(meetingStatus, meeting.status);
  const patientName = meeting.patientFullName || meeting.patientName || "Paciente";
  const patientInitial = patientName.charAt(0).toUpperCase();
  const scheduledDate = new Date(meeting.scheduledAt);
  const { toast } = useToast();

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-divider bg-white p-5 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]",
        meeting.isToday && "border-l-4 border-l-cp-action",
        meeting.status === "active" && "ring-2 ring-cp-sage"
      )}
      data-testid={`card-meeting-${meeting.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={meeting.patientPhotoUrl || undefined} />
            <AvatarFallback className="bg-cp-action-soft text-cp-action font-semibold">
              {patientInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-cp-ink">{patientName}</p>
            {meeting.patientEmail && (
              <p className="truncate text-xs text-cp-muted">{meeting.patientEmail}</p>
            )}
          </div>
        </div>
        <StatusBadge label={status.label} tone={status.tone} className={cn("shrink-0", meeting.status === "active" && "animate-pulse")} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm font-medium text-cp-ink">{meeting.title}</p>
        <p className="flex items-center gap-1.5 text-xs text-cp-muted">
          <CalendarDays className="h-3.5 w-3.5 text-cp-action" />
          {format(scheduledDate, "EEEE, dd MMM • HH:mm", { locale: ptBR })} —{" "}
          {formatDuration(meeting.durationMinutes)}
        </p>
        {meeting.meetLink && (
          <div className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 shrink-0 text-cp-action" />
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[240px] truncate text-xs text-cp-action hover:underline"
            >
              {meeting.meetLink}
            </a>
            <button
              onClick={() => copyToClipboard(meeting.meetLink!, toast)}
              className="text-cp-subtle hover:text-cp-action"
              aria-label="Copiar link do Meet"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
        {meeting.linkSentAt && (
          <p className="flex items-center gap-1 text-xs text-cp-muted">
            <Check className="h-3 w-3 text-cp-success" />
            Link enviado em {format(new Date(meeting.linkSentAt), "dd/MM HH:mm")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {meeting.status === "scheduled" && (
          <>
            <Button
              size="sm"
              className="h-8 rounded-lg bg-cp-action text-xs hover:bg-cp-action-hover"
              onClick={() => onStart(meeting)}
              data-testid={`button-start-meeting-${meeting.id}`}
            >
              <Play className="h-3 w-3 mr-1" />
              Iniciar Sessão
            </Button>
            {meeting.meetLink && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-cp-border text-xs text-cp-ink"
                onClick={() => onSendLink(meeting)}
                disabled={!meeting.patientEmail}
                data-testid={`button-send-link-${meeting.id}`}
              >
                <Send className="h-3 w-3 mr-1" />
                Enviar Link
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onCancel(meeting)}
              data-testid={`button-cancel-meeting-${meeting.id}`}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          </>
        )}

        {meeting.status === "active" && (
          <>
            {meeting.meetLink && (
              <Button
                size="sm"
                className="h-8 rounded-lg bg-cp-success text-xs hover:bg-cp-success/90"
                onClick={() => onEnterMeet(meeting)}
                data-testid={`button-enter-meet-${meeting.id}`}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Entrar no Meet ↗
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onEnd(meeting)}
              data-testid={`button-end-meeting-${meeting.id}`}
            >
              <Square className="h-3 w-3 mr-1" />
              Encerrar Sessão
            </Button>
          </>
        )}

        {meeting.status === "ended" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-cp-border text-xs text-cp-ink"
              onClick={() => onViewNotes(meeting)}
              data-testid={`button-view-notes-${meeting.id}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              {meeting.notes ? "Ver Anotações" : "Anotações"}
            </Button>
            {meeting.meetLink && meeting.patientEmail && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => onSendLink(meeting)}
              >
                <Send className="h-3 w-3 mr-1" />
                Reenviar Link
              </Button>
            )}
            {(meeting.actualDuration ?? 0) > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-cp-muted">
                <Clock className="h-3 w-3" />
                Duração real: {formatDuration(meeting.actualDuration!)}
              </span>
            )}
          </>
        )}

        {meeting.status === "cancelled" && (
          <span className="text-xs italic text-cp-subtle">Sessão cancelada</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Meetings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Filter state ──
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchPatient, setSearchPatient] = useState("");

  // ── Modal state ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState<Meeting | null>(null);
  const [viewNotesMeeting, setViewNotesMeeting] = useState<Meeting | null>(null);
  const [cancelMeetingId, setCancelMeetingId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [endNotes, setEndNotes] = useState("");

  // ── Create form state ──
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    scheduledAt: new Date().toISOString().slice(0, 16),
    durationMinutes: "50",
    sendLinkNow: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  // ── Queries ──
  const { data: meetingsList = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });

  const { data: googleCalStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/google-calendar/status"],
    queryFn: async () => {
      const res = await fetch("/api/google-calendar/status", { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
  });
  const googleConnected = !!googleCalStatus?.authenticated;

  // ── Active meeting (from list) ──
  const activeMeeting = meetingsList.find((m) => m.status === "active") ?? null;

  // ── Filter meetings ──
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const filtered = meetingsList.filter((m) => {
    const patientName = (m.patientFullName || m.patientName || "").toLowerCase();
    if (searchPatient && !patientName.includes(searchPatient.toLowerCase())) return false;
    if (filterStatus === "today") return m.isToday;
    if (filterStatus !== "all" && filterStatus !== "today") return m.status === filterStatus;
    return true;
  });

  // ── Summary stats ──
  const todayCount = meetingsList.filter((m) => m.isToday && m.status !== "cancelled").length;
  const weekCount = meetingsList.filter((m) => {
    const d = new Date(m.scheduledAt);
    return d >= weekStart && d <= weekEnd && m.status !== "cancelled";
  }).length;
  const doneCount = meetingsList.filter((m) => m.status === "ended").length;

  // ── Mutations ──
  /**
   * meetingFetch: raw fetch wrapper that reads JSON before deciding ok/error,
   * so GOOGLE_TOKEN_EXPIRED payloads from 401 responses are always parsed.
   * Surface token-expiry errors as a dedicated toast, then throw to stop mutation.
   */
  const meetingFetch = async (
    method: string,
    url: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      if (data.error === "GOOGLE_TOKEN_EXPIRED") {
        toast({
          title: "Conexão com o Google expirada",
          description:
            (data.message as string) ||
            "Acesse Configurações → Google Calendar e faça novo login.",
          variant: "destructive",
          duration: 8000,
        });
        throw new Error("GOOGLE_TOKEN_EXPIRED");
      }
      throw new Error((data.error as string) || "Erro desconhecido");
    }
    if (data.warning === "GOOGLE_TOKEN_EXPIRED_EMAIL") {
      toast({
        title: "Reunião criada",
        description: data.warningMessage as string,
        variant: "destructive",
        duration: 8000,
      });
    }
    return data;
  };

  const onMutationError = (e: Error) => {
    if (e.message !== "GOOGLE_TOKEN_EXPIRED")
      toast({ title: "Erro", description: e.message, variant: "destructive" });
  };

  const startMutation = useMutation({
    mutationFn: (meeting: Meeting) =>
      meetingFetch("POST", `/api/meetings/${meeting.id}/start`),
    onSuccess: (data, meeting) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      const link = (data.meetLink as string | null) || meeting.meetLink;
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
        toast({ title: "Sessão iniciada", description: "O Google Meet foi aberto em uma nova aba." });
      } else {
        toast({
          title: "Sessão iniciada",
          description: "Conecte o Google Calendar no seu perfil para gerar o link do Meet.",
        });
      }
    },
    onError: onMutationError,
  });

  const endMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      meetingFetch("POST", `/api/meetings/${id}/end`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Sessão encerrada", description: "Anotações salvas." });
      setEndingMeeting(null);
      setEndNotes("");
    },
    onError: onMutationError,
  });

  const sendLinkMutation = useMutation({
    mutationFn: (id: number) =>
      meetingFetch("POST", `/api/meetings/${id}/send-link`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (data.sent)
        toast({ title: "Link enviado", description: "E-mail enviado com sucesso." });
      else
        toast({
          title: "Não foi possível enviar",
          description: "Verifique a conexão com o Google.",
          variant: "destructive",
        });
    },
    onError: onMutationError,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      meetingFetch("DELETE", `/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Reunião cancelada" });
      setCancelMeetingId(null);
    },
    onError: onMutationError,
  });

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      meetingFetch("PATCH", `/api/meetings/${id}/notes`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Anotações salvas" });
      setEditingNotes(false);
      if (viewNotesMeeting) {
        setViewNotesMeeting({ ...viewNotesMeeting, notes: notesText });
      }
    },
    onError: onMutationError,
  });

  // ── Create meeting ──
  const handleCreate = async () => {
    if (!selectedPatient) {
      toast({ title: "Selecione uma paciente", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        title: createForm.title || `Sessão com ${selectedPatient.fullName}`,
        description: createForm.description || undefined,
        scheduledAt: new Date(createForm.scheduledAt).toISOString(),
        durationMinutes: parseInt(createForm.durationMinutes),
        sendLinkNow: createForm.sendLinkNow,
      };
      const data = await meetingFetch("POST", "/api/meetings", payload as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });

      if (!data.hasGoogleCalendar) {
        toast({
          title: "Reunião criada",
          description: "Conecte sua conta Google para gerar link do Meet automaticamente.",
        });
      } else if (!data.meetLink) {
        toast({ title: "Reunião criada", description: "Não foi possível gerar o link do Meet." });
      } else {
        toast({
          title: "Reunião criada",
          description: data.emailSent ? "E-mail enviado para a paciente." : "Link do Meet gerado.",
        });
      }

      setIsCreateOpen(false);
      setSelectedPatient(null);
      setPatientQuery("");
      setCreateForm({ title: "", description: "", scheduledAt: new Date().toISOString().slice(0, 16), durationMinutes: "50", sendLinkNow: false });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // ── Patient filter ──
  const filteredPatients = (patients as Patient[]).filter((p) =>
    p.fullName.toLowerCase().includes(patientQuery.toLowerCase())
  );

  const filterTabs = [
    { key: "all", label: "Todas" },
    { key: "today", label: "Hoje" },
    { key: "scheduled", label: "Agendadas" },
    { key: "ended", label: "Realizadas" },
    { key: "cancelled", label: "Canceladas" },
  ];

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      {/* Active session banner */}
      {activeMeeting && (
        <ActiveSessionBanner
          meeting={activeMeeting}
          onEnterMeet={() => window.open(activeMeeting.meetLink!, "_blank")}
          onEndSession={() => setEndingMeeting(activeMeeting)}
        />
      )}

      <div
        className={cn(
          "flex-1 flex flex-col ml-0 md:ml-64 overflow-hidden",
          activeMeeting ? "pt-14 md:pt-12" : "pt-16 md:pt-0"
        )}
      >
        <MobileNav />

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-6 pb-2 sm:px-7">
          <PageHeader
            title="Reuniões"
            icon={Video}
            subtitle="Gerencie suas sessões online via Google Meet"
            phrase
            actions={
              <button type="button" className={cpButton.primary} onClick={() => setIsCreateOpen(true)} data-testid="button-new-meeting">
                <Plus className="h-4 w-4" />
                Nova Reunião
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-7">
          {/* Summary cards */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard icon={<CalendarDays className="h-6 w-6 text-cp-sage-ink" />} tint="bg-cp-sage-soft" label="Hoje" value={todayCount} sub="sessões" />
            <MetricCard icon={<Users className="h-6 w-6 text-cp-lavender-ink" />} tint="bg-cp-lavender-soft" label="Esta semana" value={weekCount} sub="sessões" />
            <MetricCard icon={<CheckCircle2 className="h-6 w-6 text-cp-sand-ink" />} tint="bg-cp-sand-soft" label="Total" value={doneCount} sub="realizadas" />
          </div>

          {/* Google Calendar not connected warning */}
          {googleCalStatus !== undefined && !googleConnected && (
            <InfoBanner variant="warning" title="Google Calendar não conectado" className="mb-4">
              Sem a integração com o Google Calendar, não é possível gerar links do Google Meet nem enviar e-mails de convite para as pacientes.{" "}
              <Link href="/profile" className="font-semibold text-cp-warning underline underline-offset-2">
                Conectar Google Calendar no Meu Perfil →
              </Link>
            </InfoBanner>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                    filterStatus === tab.key
                      ? "bg-cp-action text-white"
                      : "border border-cp-border bg-white text-cp-muted hover:text-cp-ink"
                  )}
                  data-testid={`filter-tab-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <IconField icon={Search} className="w-full sm:w-[240px]">
              <Input
                placeholder="Buscar paciente..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="bg-white text-sm"
                data-testid="input-search-patient"
              />
            </IconField>
          </div>

          {/* Meetings list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-cp-action" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Video className="mb-3 h-10 w-10 text-cp-sage" />
              <p className="text-sm font-medium text-cp-ink">Nenhuma reunião encontrada</p>
              <p className="mt-1 text-xs text-cp-muted">Crie uma nova reunião para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onStart={(m) => startMutation.mutate(m)}
                  onEnd={(m) => { setEndingMeeting(m); setEndNotes(m.notes || ""); }}
                  onSendLink={(m) => sendLinkMutation.mutate(m.id)}
                  onViewNotes={(m) => { setViewNotesMeeting(m); setNotesText(m.notes || ""); setEditingNotes(false); }}
                  onCancel={(m) => setCancelMeetingId(m.id)}
                  onEnterMeet={(m) => window.open(m.meetLink!, "_blank")}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Meeting Modal ─────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
          <ModalHeader icon={Video} title="Nova Reunião" description="Agende uma nova sessão com seu paciente." />

          <div className="space-y-4 py-2">
            {/* Patient selector */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-cp-ink">
                Paciente <span className="text-cp-danger">*</span>
              </label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <IconField icon={UserIcon}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border bg-white px-3 text-sm transition-colors hover:border-cp-sage"
                    data-testid="button-select-patient"
                  >
                    <span className={selectedPatient ? "text-cp-ink" : "text-cp-subtle"}>
                      {selectedPatient ? selectedPatient.fullName : "Buscar paciente..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-cp-subtle" />
                  </button>
                </PopoverTrigger>
                </IconField>
                <PopoverContent className="w-[340px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar por nome..."
                      value={patientQuery}
                      onValueChange={setPatientQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma paciente encontrada</CommandEmpty>
                      <CommandGroup>
                        {filteredPatients.slice(0, 20).map((p) => (
                          <CommandItem
                            key={p.id}
                            onSelect={() => {
                              setSelectedPatient(p);
                              if (!createForm.title) {
                                setCreateForm((f) => ({ ...f, title: `Sessão com ${p.fullName}` }));
                              }
                              setPatientSearchOpen(false);
                            }}
                          >
                            <div>
                              <p className="font-medium">{p.fullName}</p>
                              {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedPatient && !selectedPatient.email && (
                <p className="mt-1 flex items-center gap-1 text-xs text-cp-warning">
                  <AlertCircle className="h-3 w-3" />
                  Esta paciente não possui e-mail cadastrado. Compartilhe o link manualmente.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-cp-ink">Título da sessão</label>
              <IconField icon={FileText}>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={selectedPatient ? `Sessão com ${selectedPatient.fullName}` : "Título da sessão"}
                data-testid="input-meeting-title"
              />
              </IconField>
            </div>

            {/* Date/time + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-cp-ink">
                  Data e horário <span className="text-cp-danger">*</span>
                </label>
                <IconField icon={CalendarDays}>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  data-testid="input-meeting-datetime"
                />
                </IconField>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-cp-ink">Duração</label>
                <IconField icon={Clock}>
                <Select
                  value={createForm.durationMinutes}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, durationMinutes: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="50">50 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
                </IconField>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-cp-ink">Descrição / pauta (opcional)</label>
              <CharCountTextarea
                max={500}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Assuntos a abordar..."
                data-testid="input-meeting-description"
              />
            </div>

            {/* Send link toggle */}
            <div className={cn(
              "space-y-1.5 rounded-xl border p-3",
              !googleConnected ? "border-cp-warning/25 bg-cp-warning-soft" : "border-cp-sage/40 bg-cp-sage-soft/60"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <Send className={cn("h-4 w-4", !googleConnected ? "text-cp-warning" : "text-cp-sage-ink")} />
                  </span>
                  <span className="text-sm font-medium text-cp-ink">Enviar link para o paciente agora</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateForm((f) => ({ ...f, sendLinkNow: !f.sendLinkNow }))}
                  disabled={!selectedPatient?.email || !googleConnected}
                  className={cn(
                    "relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors",
                    createForm.sendLinkNow && selectedPatient?.email && googleConnected
                      ? "bg-cp-action"
                      : "bg-cp-border",
                    (!selectedPatient?.email || !googleConnected) && "opacity-40 cursor-not-allowed"
                  )}
                  data-testid="toggle-send-link"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      createForm.sendLinkNow && selectedPatient?.email && googleConnected
                        ? "translate-x-5"
                        : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {!googleConnected ? (
                <p className="ml-10 flex items-center gap-1 text-xs text-cp-warning">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Conecte o Google Calendar para enviar o link por e-mail automaticamente.
                </p>
              ) : selectedPatient?.email ? (
                <p className="ml-10 text-xs text-cp-muted">
                  e-mail: {selectedPatient.email} (qualquer e-mail funciona, não precisa ser Gmail)
                </p>
              ) : selectedPatient ? (
                <p className="ml-10 flex items-center gap-1 text-xs text-cp-warning">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Esta paciente não tem e-mail cadastrado. Cadastre o e-mail no perfil da paciente para enviar o link.
                </p>
              ) : null}
            </div>

            {/* Google Calendar notice */}
            {googleConnected ? (
              <InfoBanner variant="info">
                Um evento será criado no seu Google Calendar e um link do Google Meet será gerado automaticamente.
                O link abrirá no Google Meet quando a sessão for iniciada.
              </InfoBanner>
            ) : (
              <InfoBanner variant="warning" title="Google Calendar não conectado">
                A reunião será criada sem link do Meet. Para gerar links e enviar convites automaticamente,
                conecte sua conta em{" "}
                <Link href="/profile" className="font-semibold underline" onClick={() => setIsCreateOpen(false)}>
                  Meu Perfil
                </Link>.
              </InfoBanner>
            )}
          </div>

          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
            <button type="button" className={cpButton.subtle} onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className={cpButton.primary}
              onClick={handleCreate}
              disabled={isCreating || !selectedPatient}
              data-testid="button-create-meeting-submit"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Criar Reunião
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── End Session Modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!endingMeeting} onOpenChange={(o) => { if (!o) setEndingMeeting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar Sessão</DialogTitle>
          </DialogHeader>
          {endingMeeting && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-sm text-slate-800">
                  Sessão com {endingMeeting.patientName || endingMeeting.patientFullName}
                </p>
                {endingMeeting.startedAt && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Iniciada às {format(new Date(endingMeeting.startedAt), "HH:mm")}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Anotações da sessão</label>
                <Textarea
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                  placeholder="Registre observações, progressos ou próximos passos..."
                  rows={5}
                  data-testid="textarea-end-notes"
                />
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  As anotações ficam visíveis apenas para você.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEndingMeeting(null)}>Voltar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => endingMeeting && endMutation.mutate({ id: endingMeeting.id, notes: endNotes })}
              disabled={endMutation.isPending}
              data-testid="button-confirm-end-meeting"
            >
              {endMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Encerrar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Notes Modal ──────────────────────────────────────────────────── */}
      <Dialog open={!!viewNotesMeeting} onOpenChange={(o) => { if (!o) { setViewNotesMeeting(null); setEditingNotes(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anotações — {viewNotesMeeting?.title}</DialogTitle>
            {viewNotesMeeting && (
              <p className="text-xs text-slate-400">
                {format(new Date(viewNotesMeeting.scheduledAt), "EEEE, dd MMM yyyy • HH:mm", { locale: ptBR })} · {formatDuration(viewNotesMeeting.durationMinutes)}
              </p>
            )}
          </DialogHeader>
          <div className="py-2">
            {editingNotes ? (
              <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={6}
                data-testid="textarea-edit-notes"
              />
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 min-h-[100px]">
                {notesText ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{notesText}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sem anotações registradas.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {editingNotes ? (
              <>
                <Button variant="outline" onClick={() => setEditingNotes(false)}>Cancelar</Button>
                <Button
                  className="bg-cp-action hover:bg-cp-action-hover"
                  onClick={() => viewNotesMeeting && saveNotesMutation.mutate({ id: viewNotesMeeting.id, notes: notesText })}
                  disabled={saveNotesMutation.isPending}
                >
                  {saveNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setViewNotesMeeting(null); setEditingNotes(false); }}>Fechar</Button>
                <Button variant="outline" onClick={() => setEditingNotes(true)} data-testid="button-edit-notes">
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar Anotações
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!cancelMeetingId} onOpenChange={(o) => { if (!o) setCancelMeetingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              A reunião será cancelada e o evento será removido do Google Calendar. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => cancelMeetingId && cancelMutation.mutate(cancelMeetingId)}
            >
              Cancelar Reunião
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
