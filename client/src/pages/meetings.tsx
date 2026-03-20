import { useState, useEffect } from "react";
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
} from "lucide-react";
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

// ─── Status config ─────────────────────────────────────────────────────────────

const statusConfig = {
  scheduled: {
    label: "Agendada",
    className: "bg-blue-100 text-blue-700",
    pulse: false,
  },
  active: {
    label: "Em andamento",
    className: "bg-green-100 text-green-700",
    pulse: true,
  },
  ended: {
    label: "Realizada",
    className: "bg-gray-100 text-gray-500",
    pulse: false,
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-600",
    pulse: false,
  },
} as const;

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
    <div className="fixed top-0 left-0 right-0 z-50 md:left-64 bg-green-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium text-sm">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
          Sessão em andamento com {meeting.patientName || meeting.patientFullName}
        </span>
        <span className="text-green-200 text-sm font-mono">⏱ {formatCronômetro(elapsed)}</span>
      </div>
      <div className="flex items-center gap-2">
        {meeting.meetLink && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-green-300 text-green-900 bg-white hover:bg-green-50"
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
  const status = statusConfig[meeting.status] ?? statusConfig.scheduled;
  const patientName = meeting.patientFullName || meeting.patientName || "Paciente";
  const patientInitial = patientName.charAt(0).toUpperCase();
  const scheduledDate = new Date(meeting.scheduledAt);
  const { toast } = useToast();

  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-neutral-100 p-4",
        meeting.isToday && "border-l-4 border-l-teal-500",
        meeting.status === "active" && "ring-2 ring-green-300"
      )}
      data-testid={`card-meeting-${meeting.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={meeting.patientPhotoUrl || undefined} />
            <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold">
              {patientInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{patientName}</p>
            {meeting.patientEmail && (
              <p className="text-xs text-slate-400 truncate">{meeting.patientEmail}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
            status.className
          )}
        >
          {status.pulse && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          {status.label}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm text-slate-700 font-medium">{meeting.title}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-teal-500" />
          {format(scheduledDate, "EEEE, dd MMM • HH:mm", { locale: ptBR })} —{" "}
          {formatDuration(meeting.durationMinutes)}
        </p>
        {meeting.meetLink && (
          <div className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-teal-500 shrink-0" />
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 hover:underline truncate max-w-[240px]"
            >
              {meeting.meetLink}
            </a>
            <button
              onClick={() => copyToClipboard(meeting.meetLink!, toast)}
              className="text-slate-400 hover:text-teal-600"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
        {meeting.linkSentAt && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
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
              className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
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
                className="h-7 text-xs"
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
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
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
              className="h-7 text-xs"
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
            {meeting.actualDuration && (
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                Duração real: {formatDuration(meeting.actualDuration)}
              </span>
            )}
          </>
        )}

        {meeting.status === "cancelled" && (
          <span className="text-xs text-slate-400 italic">Sessão cancelada</span>
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
    mutationFn: (id: number) =>
      meetingFetch("POST", `/api/meetings/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Sessão iniciada" });
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
    <div className="flex h-screen bg-[#f7f8fa]">
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
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
              <Video className="h-5 w-5 text-teal-600" />
              Reuniões
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Gerencie suas sessões online via Google Meet</p>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700 h-9 text-sm"
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-new-meeting"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Reunião
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <CalendarDays className="h-4 w-4 text-teal-500" />
                Hoje
              </div>
              <p className="text-2xl font-bold text-slate-800">{todayCount}</p>
              <p className="text-xs text-slate-400">sessões</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Users className="h-4 w-4 text-teal-500" />
                Esta semana
              </div>
              <p className="text-2xl font-bold text-slate-800">{weekCount}</p>
              <p className="text-xs text-slate-400">sessões</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <CheckCircle2 className="h-4 w-4 text-teal-500" />
                Total
              </div>
              <p className="text-2xl font-bold text-slate-800">{doneCount}</p>
              <p className="text-xs text-slate-400">realizadas</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    filterStatus === tab.key
                      ? "bg-teal-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"
                  )}
                  data-testid={`filter-tab-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Input
              placeholder="🔍 Buscar paciente..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="h-8 text-sm max-w-[200px]"
              data-testid="input-search-patient"
            />
          </div>

          {/* Meetings list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Video className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Nenhuma reunião encontrada</p>
              <p className="text-xs text-slate-400 mt-1">Crie uma nova reunião para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onStart={(m) => startMutation.mutate(m.id)}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-teal-600" />
              Nova Reunião
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Patient selector */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Paciente <span className="text-red-500">*</span>
              </label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="w-full flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white hover:border-teal-400 transition-colors"
                    data-testid="button-select-patient"
                  >
                    <span className={selectedPatient ? "text-slate-800" : "text-slate-400"}>
                      {selectedPatient ? selectedPatient.fullName : "Buscar paciente..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                </PopoverTrigger>
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
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Esta paciente não possui e-mail cadastrado. Compartilhe o link manualmente.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Título da sessão</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={selectedPatient ? `Sessão com ${selectedPatient.fullName}` : "Título da sessão"}
                data-testid="input-meeting-title"
              />
            </div>

            {/* Date/time + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Data e horário <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  data-testid="input-meeting-datetime"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Duração</label>
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
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Descrição / pauta (opcional)</label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Assuntos a abordar..."
                rows={2}
                data-testid="input-meeting-description"
              />
            </div>

            {/* Send link toggle */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-teal-500" />
                  <span className="text-sm font-medium text-slate-700">Enviar link para a paciente agora</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateForm((f) => ({ ...f, sendLinkNow: !f.sendLinkNow }))}
                  disabled={!selectedPatient?.email}
                  className={cn(
                    "relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors",
                    createForm.sendLinkNow && selectedPatient?.email ? "bg-teal-600" : "bg-slate-200",
                    (!selectedPatient?.email) && "opacity-40 cursor-not-allowed"
                  )}
                  data-testid="toggle-send-link"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      createForm.sendLinkNow && selectedPatient?.email ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {selectedPatient?.email && (
                <p className="text-xs text-slate-400 ml-6">e-mail: {selectedPatient.email}</p>
              )}
            </div>

            {/* Google Calendar notice */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <Video className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Um evento será criado no seu Google Calendar e um link do Google Meet será gerado automaticamente
                (requer Google Calendar conectado).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleCreate}
              disabled={isCreating || !selectedPatient}
              data-testid="button-create-meeting-submit"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Video className="h-4 w-4 mr-1" />}
              Criar Reunião
            </Button>
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
                  className="bg-teal-600 hover:bg-teal-700"
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
