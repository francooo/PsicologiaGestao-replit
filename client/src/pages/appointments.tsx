import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAppointmentSchema, insertRoomBookingSchema } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import Calendar from "@/components/calendar";
import DailyHoursView from "@/components/daily-hours-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2,
  Plus,
  Share2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Monitor,
  User as UserIcon,
  Users,
  DoorOpen,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Search,
  CalendarCheck,
  LayoutGrid,
  Lock,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Patient } from "@shared/schema";
import { useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { overlaps, timeToMinutes, toDateKey } from "@/lib/time";
import { roomIcon } from "@/lib/room-icon";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { CharCountTextarea, IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { appointmentStatus, statusOf, toneClasses, type Tone } from "@/components/cp/status";
import { WhatsAppIcon } from "@/components/cp/WhatsAppIcon";

// ─── Schemas ────────────────────────────────────────────────────────────────

const appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  duration: z.enum(["50", "60", "90"]).optional(),
});
type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

const whatsAppShareSchema = z.object({
  psychologistId: z.string().min(1, "Selecione uma psicóloga"),
  startDate: z.string().min(1, "Data inicial é obrigatória"),
  endDate: z.string().min(1, "Data final é obrigatória"),
  message: z.string().max(500, "Máximo de 500 caracteres").optional(),
});
type WhatsAppShareFormValues = z.infer<typeof whatsAppShareSchema>;

const bookingFormSchema = insertRoomBookingSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
});
type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Local calendar date (toISOString() is UTC and shifted the day at night in BRT)
const formatDateForRequest = (date: Date) => toDateKey(date);

export const SESSION_TYPES = ["Terapia Individual", "Retorno", "Avaliação Inicial", "Acompanhamento", "Orientação Familiar", "Outro"];

/** Booking purpose without patient data (appointment bookings are saved as "Appointment with {patient}"). */
const bookingTitle = (purpose?: string | null) =>
  !purpose || /^appointment with/i.test(purpose) ? "Reserva de Sala" : purpose;

const PSYCH_COLORS = [
  { bg: 'bg-[#e8f4f6]', text: 'text-[#155f6b]', borderColor: '#1e7e8c', dot: 'bg-[#1e7e8c]' },
  { bg: 'bg-[#fef3e2]', text: 'text-[#92400e]', borderColor: '#d97706', dot: 'bg-[#d97706]' },
  { bg: 'bg-[#f3e8ff]', text: 'text-[#5b21b6]', borderColor: '#7c3aed', dot: 'bg-[#7c3aed]' },
  { bg: 'bg-[#f0fdf4]', text: 'text-[#14532d]', borderColor: '#16a34a', dot: 'bg-[#16a34a]' },
  { bg: 'bg-[#fce7f3]', text: 'text-[#831843]', borderColor: '#db2777', dot: 'bg-[#db2777]' },
];

function getPsychColor(idx: number) {
  return PSYCH_COLORS[idx % PSYCH_COLORS.length];
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Appointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  const activeTab = (() => {
    const p = new URLSearchParams(searchString);
    return (p.get('tab') === 'rooms' ? 'rooms' : 'consultas') as 'consultas' | 'rooms';
  })();

  const switchTab = (tab: 'consultas' | 'rooms') => {
    setLocation(tab === 'rooms' ? '/appointments?tab=rooms' : '/appointments');
  };

  // ── Shared state ──
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week");
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Room bookings tab state ──
  const [roomDate, setRoomDate] = useState<Date>(new Date());
  const [roomTab, setRoomTab] = useState<'all' | number>('all');
  const [isNewBookingDialogOpen, setIsNewBookingDialogOpen] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);

  // ── Date ranges ──
  const getMonthDateRange = (date: Date) => {
    const y = date.getFullYear(), m = date.getMonth();
    return {
      startDate: formatDateForRequest(new Date(y, m, 1)),
      endDate: formatDateForRequest(new Date(y, m + 1, 0)),
    };
  };
  const dateRange = getMonthDateRange(selectedDate);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  // ── Queries: consultas ──
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: psychologists = [], isLoading: loadingPsychs } = useQuery({
    queryKey: ['/api/psychologists'],
    queryFn: async () => {
      const res = await fetch('/api/psychologists');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: patients } = useQuery<Patient[]>({ queryKey: ['/api/patients'] });

  // All appointments (no date range) — used only to populate the patient dropdown
  const { data: allAppointments = [] } = useQuery({
    queryKey: ['/api/appointments', 'all-patients'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  // ── Queries: room bookings ──
  const roomDateStr = formatDateForRequest(roomDate);
  const { data: roomBookings = [], isLoading: loadingRoomBookings } = useQuery({
    queryKey: ['/api/room-bookings', { date: roomDateStr }],
    queryFn: async () => {
      const res = await fetch(`/api/room-bookings?date=${roomDateStr}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const loggedPsychologist = user?.role === "psychologist"
    ? (psychologists as any[]).find((p: any) => p.userId === user.id)
    : null;

  // ── Psychologist color map ──
  const psychColorMap: Record<number, typeof PSYCH_COLORS[0]> = {};
  (psychologists as any[]).forEach((p, i) => { psychColorMap[p.id] = getPsychColor(i); });

  // ── Formatted appointments ──
  const formattedAppointments = (appointments as any[]).map(a => ({
    id: a.id,
    title: a.patientName,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    patientName: a.patientName,
    psychologistId: a.psychologistId,
    psychologistName: a.psychologist?.user?.fullName || 'N/A',
    roomId: a.roomId,
    roomName: a.room?.name || 'N/A',
    status: a.status,
    notes: a.notes,
    sessionType: a.sessionType as string | null,
  }));

  const patientOptions = Array.from(
    new Set((allAppointments as any[]).map((a: any) => a.patientName))
  ).sort();

  // ── Week appointments by date ──
  const weeklyByDate = formattedAppointments.reduce<Record<string, typeof formattedAppointments>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});

  // ── Mutations: appointments ──
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      const { duration, ...payload } = data;
      const res = await apiRequest("POST", "/api/appointments", {
        ...payload,
        sessionType: payload.sessionType || null,
        psychologistId: Number(payload.psychologistId),
        roomId: Number(payload.roomId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({ title: "Agendamento criado", description: "O agendamento foi criado com sucesso." });
      setIsNewAppointmentDialogOpen(false);
      appointmentForm.reset({
        patientName: "",
        psychologistId: loggedPsychologist?.id || 0,
        roomId: 0,
        date: formatDateForRequest(selectedDate),
        startTime: "09:00",
        endTime: "10:00",
        status: "scheduled",
        notes: "",
        sessionType: "",
        duration: "50",
      });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const shareWhatsAppMutation = useMutation({
    mutationFn: async (data: WhatsAppShareFormValues) => {
      const res = await apiRequest("POST", "/api/share/whatsapp", {
        psychologistId: Number(data.psychologistId),
        startDate: data.startDate,
        endDate: data.endDate,
        message: data.message,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      window.open(data.link, '_blank');
      setIsShareDialogOpen(false);
      toast({ title: "Link gerado", description: "O link do WhatsApp foi gerado." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ── Mutations: room bookings ──
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const res = await apiRequest("POST", "/api/room-bookings", {
        ...data,
        psychologistId: Number(data.psychologistId),
        roomId: Number(data.roomId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast({ title: "Reserva criada", description: "Sala reservada com sucesso." });
      setIsNewBookingDialogOpen(false);
      bookingForm.reset();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/room-bookings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast({ title: "Reserva removida" });
      setDeleteBookingId(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ── Forms ──
  const appointmentForm = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientName: "",
      psychologistId: loggedPsychologist?.id || 0,
      roomId: 0,
      date: formatDateForRequest(selectedDate),
      startTime: "09:00",
      endTime: "10:00",
      status: "scheduled",
      notes: "",
      sessionType: "",
      duration: "50",
    }
  });

  useEffect(() => {
    if (loggedPsychologist) {
      appointmentForm.setValue("psychologistId", loggedPsychologist.id);
    }
  }, [loggedPsychologist?.id]);

  const shareForm = useForm<WhatsAppShareFormValues>({
    resolver: zodResolver(whatsAppShareSchema),
    defaultValues: {
      psychologistId: loggedPsychologist?.id?.toString() || "",
      startDate: formatDateForRequest(new Date()),
      endDate: formatDateForRequest(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      message: "Olá! Seguem os horários disponíveis para agendamento.",
    }
  });

  useEffect(() => {
    if (loggedPsychologist) {
      shareForm.setValue("psychologistId", loggedPsychologist.id.toString());
    }
  }, [loggedPsychologist?.id]);

  const bookingForm = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      psychologistId: 0,
      roomId: 0,
      date: formatDateForRequest(roomDate),
      startTime: "09:00",
      endTime: "10:00",
      purpose: "Consulta",
    }
  });

  // Auto-set psychologistId for non-admin users when dialog opens
  useEffect(() => {
    if (isNewBookingDialogOpen && user?.role !== 'admin' && loggedPsychologist) {
      bookingForm.setValue("psychologistId", loggedPsychologist.id);
    }
  }, [isNewBookingDialogOpen, loggedPsychologist?.id]);

  // ── Handlers ──
  const calculateEndTime = (start: string, durMin: string) => {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + parseInt(durMin);
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    appointmentForm.setValue('date', formatDateForRequest(date));
  };

  // Opened from the dashboard ("Nova consulta" / "Agendar"): ?new=1&date=&time=&psychologistId=
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('new') !== '1') return;
    const date = params.get('date');
    const time = params.get('time');
    const psych = params.get('psychologistId');
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
      appointmentForm.setValue('date', date);
    }
    if (time) {
      appointmentForm.setValue('startTime', time);
      appointmentForm.setValue('endTime', calculateEndTime(time, '50'));
    }
    // Psychologists always book for themselves (the server enforces it too)
    if (psych && user?.role !== 'psychologist') appointmentForm.setValue('psychologistId', Number(psych));
    setIsNewAppointmentDialogOpen(true);
    // Drop the params so going back doesn't reopen the dialog
    setLocation('/appointments', { replace: true });
  }, [searchString]);

  const handleAppointmentClick = (_id: number) => {};

  const handleQuickAddAppointmentForDate = (date: Date) => {
    appointmentForm.setValue("date", formatDateForRequest(date));
    appointmentForm.setValue("startTime", "09:00");
    appointmentForm.setValue("endTime", "09:50");
    setSelectedDate(date);
    setIsNewAppointmentDialogOpen(true);
  };

  const goToToday = () => setSelectedDate(new Date());
  const goToPrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };
  const goToNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const periodLabel = (() => {
    if (viewMode === 'day') return format(selectedDate, "d 'de' MMMM yyyy", { locale: ptBR });
    if (viewMode === 'week') {
      return format(weekStart, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    }
    return format(selectedDate, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
  })();

  const filteredAppointments = formattedAppointments.filter(a => {
    if (filterPatient && a.patientName !== filterPatient) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const dailyEvents = filteredAppointments.filter(a => a.date === formatDateForRequest(selectedDate));

  const filteredWeeklyByDate = filteredAppointments.reduce<Record<string, typeof filteredAppointments>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});

  // ── Render ──
  const navBtn =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-cp-border bg-white text-cp-muted transition-colors hover:bg-cp-hover hover:text-cp-ink";
  const selectCls =
    "h-9 rounded-xl border border-cp-border bg-white px-3 text-[13px] text-cp-ink outline-none focus:ring-2 focus:ring-cp-action";

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="relative flex-1 flex flex-col ml-0 md:ml-64 pt-16 md:pt-0 overflow-hidden">
        <MobileNav />

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-6 pb-4 sm:px-7">
          {activeTab === 'consultas' ? (
            <PageHeader
              title="Minhas Consultas"
              subtitle={`Agenda de ${user?.fullName?.split(' ')[0] || 'usuário'}`}
              phrase
              actions={
                <>
                  <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className={cpButton.secondary}>
                        <Share2 className="h-4 w-4" />
                        Compartilhar Horários
                      </button>
                    </DialogTrigger>
                    <ShareDialog
                      form={shareForm}
                      psychologists={psychologists as any[]}
                      user={user}
                      isPending={shareWhatsAppMutation.isPending}
                      onClose={() => setIsShareDialogOpen(false)}
                      onSubmit={(d: WhatsAppShareFormValues) => shareWhatsAppMutation.mutate(d)}
                    />
                  </Dialog>

                  <Dialog open={isNewAppointmentDialogOpen} onOpenChange={setIsNewAppointmentDialogOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className={cpButton.primary}>
                        <Plus className="h-4 w-4" />
                        Nova Consulta
                      </button>
                    </DialogTrigger>
                    <AppointmentDialog
                      form={appointmentForm}
                      psychologists={psychologists as any[]}
                      rooms={rooms as any[]}
                      patients={patients}
                      isPatientSearchOpen={isPatientSearchOpen}
                      setIsPatientSearchOpen={setIsPatientSearchOpen}
                      isPending={createAppointmentMutation.isPending}
                      onClose={() => setIsNewAppointmentDialogOpen(false)}
                      onSubmit={(data: AppointmentFormValues) => createAppointmentMutation.mutate(data)}
                      calculateEndTime={calculateEndTime}
                      loggedPsychologist={loggedPsychologist}
                      user={user}
                    />
                  </Dialog>
                </>
              }
            />
          ) : (
            <PageHeader
              title="Reservas de Salas"
              subtitle="Grade de ocupação das salas"
              phrase
              actions={
                <Dialog open={isNewBookingDialogOpen} onOpenChange={setIsNewBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className={cpButton.primary}>
                      <Plus className="h-4 w-4" />
                      Reservar Sala
                    </button>
                  </DialogTrigger>
                  <BookingDialog
                    form={bookingForm}
                    psychologists={psychologists as any[]}
                    rooms={rooms as any[]}
                    isPending={createBookingMutation.isPending}
                    onClose={() => setIsNewBookingDialogOpen(false)}
                    onSubmit={d => createBookingMutation.mutate(d)}
                    user={user}
                    loggedPsychologist={loggedPsychologist}
                  />
                </Dialog>
              }
            />
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'consultas' ? (
          <div className="flex-1 flex flex-col overflow-hidden px-4 pb-5 sm:px-7">
            {/* Calendar toolbar */}
            <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-cp-divider bg-white px-4 py-3 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]">
              <div className="flex flex-wrap items-center gap-3">
                {/* View toggle */}
                <div className="inline-flex gap-0.5 rounded-xl bg-cp-hover p-1" role="tablist" aria-label="Visualização">
                  {(['month','week','day'] as const).map(v => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={viewMode === v}
                      onClick={() => setViewMode(v)}
                      className={cn(
                        "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all",
                        viewMode === v ? "bg-cp-sage-soft text-cp-ink shadow-sm" : "text-cp-muted hover:text-cp-ink"
                      )}
                    >
                      {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                    </button>
                  ))}
                </div>

                {/* Date nav */}
                <div className="flex items-center gap-1.5">
                  <button onClick={goToPrev} aria-label="Período anterior" className={navBtn}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[130px] text-center text-[15px] font-semibold text-cp-ink">{periodLabel}</span>
                  <button onClick={goToNext} aria-label="Próximo período" className={navBtn}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { goToToday(); setViewMode('week'); }}
                    className="h-9 rounded-xl border border-cp-border bg-white px-3.5 text-[13px] font-medium text-cp-ink transition-colors hover:bg-cp-hover"
                  >
                    Hoje
                  </button>
                </div>

                {/* Filters */}
                <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} className={selectCls} aria-label="Filtrar por paciente">
                  <option value="">Todos os pacientes</option>
                  {patientOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls} aria-label="Filtrar por status">
                  <option value="">Todos os status</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="scheduled">Aguardando</option>
                  <option value="completed">Concluído</option>
                  <option value="canceled">Cancelado</option>
                  <option value="first-session">Primeira sessão</option>
                </select>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-cp-muted">
                {(['confirmed', 'scheduled', 'completed', 'canceled', 'first-session'] as const).map(st => {
                  const def = appointmentStatus[st];
                  return (
                    <span key={st} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", toneClasses[def.tone].dot)} />
                      {def.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Calendar area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {isLoading || loadingPsychs || loadingRooms ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
                </div>
              ) : (
                <>
                  {viewMode === 'day' && (
                    <DailyHoursView
                      date={selectedDate}
                      events={dailyEvents}
                      onAppointmentClick={handleAppointmentClick}
                      onTimeSlotClick={(timeSlot, date) => {
                        appointmentForm.setValue('date', formatDateForRequest(date));
                        appointmentForm.setValue('startTime', timeSlot);
                        appointmentForm.setValue('endTime', calculateEndTime(timeSlot, '50'));
                        setIsNewAppointmentDialogOpen(true);
                      }}
                    />
                  )}

                  {viewMode === 'week' && (
                    <WeekGrid
                      weekStart={weekStart}
                      today={new Date()}
                      appointmentsByDate={filteredWeeklyByDate}
                      onAddClick={handleQuickAddAppointmentForDate}
                    />
                  )}

                  {viewMode === 'month' && (
                    <Calendar
                      events={filteredAppointments}
                      month={selectedDate.getMonth()}
                      year={selectedDate.getFullYear()}
                      onDateSelect={date => { handleDateSelect(date); setViewMode('day'); }}
                      onEventClick={handleAppointmentClick}
                      onAddAppointmentClick={handleQuickAddAppointmentForDate}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Reservas de Salas ── */
          <div className="flex-1 flex flex-col overflow-hidden px-4 pb-5 sm:px-7">
            {/* Room tabs + date nav */}
            <div className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-cp-divider bg-white px-4 py-2 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]">
              <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Salas">
                <button
                  role="tab"
                  aria-selected={roomTab === 'all'}
                  onClick={() => setRoomTab('all')}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                    roomTab === 'all' ? "border-cp-action text-cp-ink" : "border-transparent text-cp-muted hover:text-cp-ink"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Visão Geral
                </button>
                {(rooms as any[]).map(r => {
                  const RIcon = roomIcon(r.name);
                  return (
                    <button
                      key={r.id}
                      role="tab"
                      aria-selected={roomTab === r.id}
                      onClick={() => setRoomTab(r.id)}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                        roomTab === r.id ? "border-cp-action text-cp-ink" : "border-transparent text-cp-muted hover:text-cp-ink"
                      )}
                    >
                      <RIcon className="h-4 w-4" />
                      {r.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setRoomDate(d => addDays(d, -1))} aria-label="Dia anterior" className={navBtn}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[150px] text-center text-[14px] font-semibold text-cp-ink">
                  {format(roomDate, "d 'de' MMMM yyyy", { locale: ptBR })}
                </span>
                <button onClick={() => setRoomDate(d => addDays(d, 1))} aria-label="Próximo dia" className={navBtn}>
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRoomDate(new Date())}
                  className="h-9 rounded-xl border border-cp-border bg-white px-3.5 text-[13px] font-medium text-cp-ink transition-colors hover:bg-cp-hover"
                >
                  Hoje
                </button>
              </div>
            </div>

            <InfoBanner variant="info" className="mb-3 flex-shrink-0">
              Dados de pacientes não são exibidos — apenas psicóloga, sala e horário
            </InfoBanner>

            {/* Room grid */}
            <div className="flex-1 overflow-auto">
              {loadingRoomBookings ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
                </div>
              ) : (
                <RoomGrid
                  rooms={rooms as any[]}
                  bookings={roomBookings as any[]}
                  selectedRoom={roomTab}
                  user={user}
                  onDelete={id => setDeleteBookingId(id)}
                />
              )}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-shrink-0 flex-wrap items-center gap-5 text-[12px] text-cp-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cp-lavender" />Reserva</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-cp-sage" />Horário disponível</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete booking confirmation */}
      <AlertDialog open={deleteBookingId !== null} onOpenChange={open => !open && setDeleteBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover reserva?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-cp-danger hover:bg-cp-danger/90"
              onClick={() => deleteBookingId !== null && deleteBookingMutation.mutate(deleteBookingId)}
            >
              {deleteBookingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── WeekGrid (calendário semanal tipo grade de horas) ────────────────────────

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 07 → 23
const HOUR_H = 64; // pixels per hour

function WeekGrid({
  weekStart,
  today,
  appointmentsByDate,
  onAddClick,
}: {
  weekStart: Date;
  today: Date;
  appointmentsByDate: Record<string, any[]>;
  onAddClick: (date: Date) => void;
}) {
  const todayStr = formatDateForRequest(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]">
      {/* Day headers */}
      <div className="grid flex-shrink-0 border-b border-cp-divider" style={{ gridTemplateColumns: `58px repeat(7, 1fr)` }}>
        <div className="p-2" />
        {days.map((day, i) => {
          const ds = formatDateForRequest(day);
          const isToday = ds === todayStr;
          return (
            <div key={i} className={cn("border-l border-cp-divider px-2 py-3 text-center", isToday && "bg-cp-sage-soft/60")}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-cp-muted">
                {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
              </div>
              <div className={cn(
                "mx-auto mt-1 flex h-8 w-8 items-center justify-center text-[18px] font-bold leading-none text-cp-ink",
                isToday && "rounded-full bg-cp-sage text-[15px] text-white"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ gridTemplateColumns: `58px repeat(7, 1fr)`, display: 'grid', height: `${HOUR_H * HOURS.length}px` }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map(h => (
              <div key={h} className="absolute flex w-full items-start justify-end pr-2 pt-1" style={{ top: `${(h - 7) * HOUR_H}px`, height: `${HOUR_H}px` }}>
                <span className="text-[11px] font-medium text-cp-subtle">{h.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const ds = formatDateForRequest(day);
            const isToday = ds === todayStr;
            const events = appointmentsByDate[ds] || [];

            return (
              <div
                key={di}
                className={cn("group relative cursor-pointer border-l border-cp-divider", isToday && "bg-cp-sage-soft/30")}
                onClick={() => onAddClick(day)}
              >
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-cp-divider" style={{ top: `${(h - 7) * HOUR_H}px` }} />
                ))}

                {events.map(ev => {
                  const startMin = timeToMinutes(ev.startTime);
                  const endMin = timeToMinutes(ev.endTime);
                  const top = (startMin - 7 * 60) / 60 * HOUR_H;
                  const height = Math.max((endMin - startMin) / 60 * HOUR_H, 26);
                  const st = statusOf(appointmentStatus, ev.status);
                  const t = toneClasses[st.tone];
                  // Session type when set; older appointments fall back to the room / online
                  const kind = ev.sessionType || (ev.roomId === 0 ? 'Online' : ev.roomName);

                  return (
                    <div
                      key={ev.id}
                      onClick={e => e.stopPropagation()}
                      title={`${ev.patientName} · ${st.label}`}
                      className={cn("absolute left-1 right-1 overflow-hidden rounded-lg px-2 py-1.5", t.row)}
                      style={{ top: `${top + 1}px`, height: `${height - 2}px` }}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-cp-muted">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} aria-label={st.label} />
                        <span className="truncate">{ev.startTime.slice(0, 5)} – {ev.endTime.slice(0, 5)}</span>
                      </div>
                      {height > 34 && (
                        <div className="truncate text-[12px] font-semibold leading-tight text-cp-ink">{kind}</div>
                      )}
                      {height > 50 && (
                        <div className="truncate text-[11px] leading-tight text-cp-muted">{ev.patientName}</div>
                      )}
                    </div>
                  );
                })}

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[11px] text-cp-subtle">+ Agendar</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── RoomGrid ────────────────────────────────────────────────────────────────

// Room booking grid shows 07:00–18:00 (spec); each room gets its own soft tone
const ROOM_HOURS = Array.from({ length: 12 }, (_, i) => i + 7);
const ROOM_TONES: Tone[] = ["lavender", "sand", "sage", "info"];

function RoomGrid({
  rooms,
  bookings,
  selectedRoom,
  user,
  onDelete,
}: {
  rooms: any[];
  bookings: any[];
  selectedRoom: 'all' | number;
  user: any;
  onDelete: (id: number) => void;
}) {
  const displayRooms = selectedRoom === 'all' ? rooms : rooms.filter(r => r.id === selectedRoom);
  const toneOf = (roomId: number) => ROOM_TONES[Math.max(0, rooms.findIndex(r => r.id === roomId)) % ROOM_TONES.length];
  const cols = `72px repeat(${Math.max(displayRooms.length, 1)}, minmax(180px, 1fr))`;

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-cp-divider bg-white py-12 text-center text-sm text-cp-subtle">
        Nenhuma sala cadastrada
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]">
      <div className="grid border-b border-cp-divider bg-cp-hover/60" style={{ gridTemplateColumns: cols }}>
        <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-cp-muted">Horário</div>
        {displayRooms.map(r => {
          const RIcon = roomIcon(r.name);
          const t = toneClasses[toneOf(r.id)];
          return (
            <div key={r.id} className="flex items-center justify-center gap-2 border-l border-cp-divider px-3 py-3">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", t.badge)}>
                <RIcon className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-cp-ink">{r.name}</span>
            </div>
          );
        })}
      </div>

      {ROOM_HOURS.map(h => {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        const nextStr = `${(h + 1).toString().padStart(2, '0')}:00`;
        return (
          <div key={h} className="grid border-t border-cp-divider" style={{ gridTemplateColumns: cols, minHeight: '64px' }}>
            <div className="px-3 pt-2 text-[12px] font-medium text-cp-subtle">{hourStr}</div>
            {displayRooms.map(room => {
              const starting = bookings.filter(b => {
                if (b.roomId !== room.id) return false;
                const bStart = timeToMinutes(b.startTime);
                return bStart >= h * 60 && bStart < (h + 1) * 60;
              });
              const busy = bookings.some(b => b.roomId === room.id && overlaps(hourStr, nextStr, b.startTime, b.endTime));
              const t = toneClasses[toneOf(room.id)];

              return (
                <div key={room.id} className="relative min-h-[64px] border-l border-cp-divider p-1.5">
                  {starting.map(b => {
                    const isMe = b.psychologist?.userId === user?.id;
                    return (
                      <div key={b.id} className={cn("group relative mb-1 rounded-lg border-l-[3px] border-cp-lavender-ink/40 px-2.5 py-1.5", t.row)}>
                        <div className="text-[11px] text-cp-muted">{b.startTime.slice(0, 5)} – {b.endTime.slice(0, 5)}</div>
                        {/* Never shows patient data — only the booking purpose */}
                        <div className="truncate text-[12px] font-semibold text-cp-ink">{bookingTitle(b.purpose)}</div>
                        <div className="truncate text-[11px] text-cp-muted">
                          Psicóloga: {b.psychologist?.user?.fullName || '—'}{isMe && ' (você)'}
                        </div>
                        <button
                          onClick={() => onDelete(b.id)}
                          aria-label="Remover reserva"
                          className="absolute right-1 top-1 rounded p-0.5 text-cp-danger opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {!busy && (
                    <div className="flex h-full min-h-[50px] items-center justify-center rounded-lg border border-dashed border-cp-sage/60 text-[11px] text-cp-subtle">
                      Horário disponível
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared dialog bits ──────────────────────────────────────────────────────

const labelCls = "text-[13px] font-semibold text-cp-ink";
const readOnlyCls = "flex h-11 items-center rounded-xl border border-cp-border bg-cp-hover px-3 text-sm text-cp-ink";

function DialogActions({ onClose, isPending, label, pendingLabel, icon }: { onClose: () => void; isPending: boolean; label: string; pendingLabel: string; icon?: React.ReactNode }) {
  return (
    <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
      <button type="button" onClick={onClose} className={cpButton.subtle}>Cancelar</button>
      <button type="submit" disabled={isPending} className={cpButton.primary}>
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{pendingLabel}</> : <>{icon}{label}</>}
      </button>
    </DialogFooter>
  );
}

// ─── ShareDialog ─────────────────────────────────────────────────────────────

function ShareDialog({ form, psychologists, user, isPending, onClose, onSubmit }: any) {
  return (
    <DialogContent className="max-w-lg rounded-2xl">
      <ModalHeader icon={Share2} title="Compartilhar Disponibilidade" description="Compartilhe os horários disponíveis via WhatsApp." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <FormField control={form.control} name="psychologistId" render={({ field }: any) => (
            <FormItem>
              <FormLabel className={labelCls}>Psicóloga</FormLabel>
              {user?.role === "psychologist" ? (
                <div className={readOnlyCls}>{user.fullName}</div>
              ) : (
                <IconField icon={UserIcon}>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {psychologists.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </IconField>
              )}
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startDate" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Data Inicial</FormLabel>
                <IconField icon={CalendarIcon}><Input type="date" {...field} /></IconField>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Data Final</FormLabel>
                <IconField icon={CalendarIcon}><Input type="date" {...field} /></IconField>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="message" render={({ field }: any) => (
            <FormItem>
              <FormLabel className={labelCls}>Mensagem</FormLabel>
              <FormControl><CharCountTextarea max={500} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <DialogFooter className="flex-row justify-between gap-3 sm:justify-between">
            <button type="button" onClick={onClose} className={cpButton.subtle}>Cancelar</button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25A244] px-5 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[#1E8A39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A244] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-5 w-5" />}
              Compartilhar via WhatsApp
            </button>
          </DialogFooter>
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-cp-subtle">
            <Lock className="h-3.5 w-3.5" />
            A mensagem será aberta no WhatsApp com os horários selecionados.
          </p>
        </form>
      </Form>
    </DialogContent>
  );
}

// ─── AppointmentDialog ────────────────────────────────────────────────────────

function AppointmentDialog({
  form,
  psychologists,
  rooms,
  patients,
  isPatientSearchOpen,
  setIsPatientSearchOpen,
  isPending,
  onClose,
  onSubmit,
  calculateEndTime,
  loggedPsychologist,
  user,
}: any) {
  const isPsychologist = user?.role === "psychologist";
  const [modality, setModality] = useState<'presential' | 'online'>('presential');

  const handleModalityChange = (value: 'presential' | 'online') => {
    setModality(value);
    if (value === 'online') {
      form.setValue('roomId', 0);
    }
  };

  const modalityBtn = (active: boolean) =>
    cn(
      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-cp-action text-white" : "bg-white text-cp-muted hover:bg-cp-hover",
    );

  return (
    <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-2xl p-0">
      <div className="border-b border-cp-divider px-6 py-4">
        <ModalHeader icon={Plus} tone="action" title="Novo Agendamento" description="Agende uma sessão para um paciente." />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField control={form.control} name="patientName" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={labelCls}>Paciente</FormLabel>
                  <IconField icon={UserIcon}><Input placeholder="Buscar ou digitar..." {...field} /></IconField>
                  <FormMessage />
                  <div className="mt-2">
                    <button type="button" onClick={() => setIsPatientSearchOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cp-border bg-white px-3 text-[13px] font-medium text-cp-ink hover:bg-cp-hover">
                      <Search className="h-3.5 w-3.5" />
                      Buscar paciente existente
                    </button>
                    <Command shouldFilter className={isPatientSearchOpen ? "mt-2 rounded-xl border border-cp-border" : "hidden"}>
                      <CommandInput placeholder="Buscar por nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                        <CommandGroup heading="Pacientes">
                          {patients?.map((p: any) => (
                            <CommandItem key={p.id} value={p.fullName} onSelect={() => {
                              form.setValue("patientName", p.fullName);
                              setIsPatientSearchOpen(false);
                            }}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{p.fullName}</span>
                                {p.email && <span className="text-xs text-cp-muted">{p.email}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="psychologistId" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={labelCls}>Psicóloga</FormLabel>
                  {isPsychologist ? (
                    <div className={readOnlyCls}>{user.fullName}</div>
                  ) : (
                    <IconField icon={Users}>
                      <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value ? field.value.toString() : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma psicóloga" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {psychologists.map((p: any) => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </IconField>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <p className={labelCls}>Modalidade</p>
                <div className="flex w-fit overflow-hidden rounded-xl border border-cp-border">
                  <button type="button" onClick={() => handleModalityChange('presential')} className={modalityBtn(modality === 'presential')} data-testid="button-modality-presential">
                    <MapPin className="h-3.5 w-3.5" />
                    Presencial
                  </button>
                  <button type="button" onClick={() => handleModalityChange('online')} className={cn(modalityBtn(modality === 'online'), "border-l border-cp-border")} data-testid="button-modality-online">
                    <Monitor className="h-3.5 w-3.5" />
                    Online
                  </button>
                </div>
              </div>

              <FormField control={form.control} name="sessionType" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={labelCls}>Tipo de sessão</FormLabel>
                  <IconField icon={FileText}>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField control={form.control} name="roomId" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={cn(labelCls, modality === 'online' && 'text-cp-subtle')}>
                    Sala {modality === 'online' && <span className="text-xs font-normal">(não se aplica a online)</span>}
                  </FormLabel>
                  <IconField icon={DoorOpen}>
                    <Select
                      onValueChange={v => field.onChange(parseInt(v))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                      disabled={modality === 'online'}
                    >
                      <FormControl>
                        <SelectTrigger className={modality === 'online' ? 'cursor-not-allowed opacity-50' : ''}>
                          <SelectValue placeholder={modality === 'online' ? '—' : 'Selecione uma sala'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={labelCls}>Status</FormLabel>
                  <IconField icon={Clock}>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(['scheduled', 'confirmed', 'completed', 'canceled', 'first-session'] as const).map(st => {
                          const def = appointmentStatus[st];
                          return (
                            <SelectItem key={st} value={st}>
                              <span className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", toneClasses[def.tone].dot)} />
                                {def.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-4 rounded-2xl border border-cp-lavender bg-cp-lavender-soft/60 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField control={form.control} name="date" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Data</FormLabel>
                    <IconField icon={CalendarIcon}><Input type="date" {...field} /></IconField>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Início</FormLabel>
                    <IconField icon={Clock}>
                      <Input type="time" {...field} onChange={e => {
                        field.onChange(e);
                        const dur = form.getValues("duration") || "50";
                        form.setValue("endTime", calculateEndTime(e.target.value, dur));
                      }} />
                    </IconField>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Término</FormLabel>
                    <IconField icon={Clock}><Input type="time" {...field} /></IconField>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="duration" render={({ field }: any) => (
                <FormItem>
                  <FormLabel className={labelCls}>Duração</FormLabel>
                  <IconField icon={Clock}>
                    <Select onValueChange={v => { field.onChange(v); const s = form.getValues("startTime"); if (s) form.setValue("endTime", calculateEndTime(s, v)); }} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="50">50 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                        <SelectItem value="90">90 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </IconField>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Observações</FormLabel>
                <FormControl><CharCountTextarea max={500} placeholder="Opcional" {...field} value={field.value ?? ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <InfoBanner variant="warning">
              Verifique se a sala e o horário estão disponíveis antes de confirmar o agendamento.
            </InfoBanner>
          </div>

          <div className="border-t border-cp-divider px-6 py-4">
            <DialogActions onClose={onClose} isPending={isPending} label="Criar Agendamento" pendingLabel="Criando..." icon={<CalendarCheck className="h-4 w-4" />} />
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// ─── BookingDialog ────────────────────────────────────────────────────────────

function BookingDialog({ form, psychologists, rooms, isPending, onClose, onSubmit, user, loggedPsychologist }: any) {
  return (
    <DialogContent className="max-w-lg rounded-2xl">
      <ModalHeader icon={DoorOpen} title="Nova Reserva de Sala" description="Reserve uma sala para um horário específico." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <FormField control={form.control} name="psychologistId" render={({ field }: any) => (
            <FormItem>
              <FormLabel className={labelCls}>Psicóloga</FormLabel>
              {user?.role === 'admin' ? (
                <IconField icon={UserIcon}>
                  <Select onValueChange={v => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a psicóloga" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {psychologists.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </IconField>
              ) : loggedPsychologist ? (
                <div className={readOnlyCls}>{loggedPsychologist.user?.fullName || user?.fullName}</div>
              ) : (
                <InfoBanner variant="warning">
                  Seu registro de psicóloga não foi encontrado. Entre em contato com o administrador.
                </InfoBanner>
              )}
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="roomId" render={({ field }: any) => (
            <FormItem>
              <FormLabel className={labelCls}>Sala</FormLabel>
              <IconField icon={DoorOpen}>
                <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value ? field.value.toString() : undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {rooms.map((r: any) => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </IconField>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="purpose" render={({ field }: any) => (
            <FormItem>
              <FormLabel className={labelCls}>Tipo</FormLabel>
              <IconField icon={FileText}>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Tipo de uso" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Supervisão">Supervisão</SelectItem>
                    <SelectItem value="Formação">Formação</SelectItem>
                    <SelectItem value="Uso pessoal">Uso pessoal</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </IconField>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField control={form.control} name="date" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Data</FormLabel>
                <IconField icon={CalendarIcon}><Input type="date" {...field} /></IconField>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="startTime" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Início</FormLabel>
                <IconField icon={Clock}><Input type="time" {...field} /></IconField>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endTime" render={({ field }: any) => (
              <FormItem>
                <FormLabel className={labelCls}>Término</FormLabel>
                <IconField icon={Clock}><Input type="time" {...field} /></IconField>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <DialogActions onClose={onClose} isPending={isPending} label="Reservar" pendingLabel="Reservando..." />
        </form>
      </Form>
    </DialogContent>
  );
}
