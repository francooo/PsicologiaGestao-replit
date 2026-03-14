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
  Share,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Trash2,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Patient } from "@shared/schema";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
  message: z.string().optional(),
});
type WhatsAppShareFormValues = z.infer<typeof whatsAppShareSchema>;

const bookingFormSchema = insertRoomBookingSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
});
type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateForRequest = (date: Date) => date.toISOString().split('T')[0];

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

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Appointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Read tab from URL
  const getTab = () => {
    if (typeof window === 'undefined') return 'consultas';
    const p = new URLSearchParams(window.location.search);
    return p.get('tab') || 'consultas';
  };
  const [activeTab, setActiveTab] = useState<'consultas' | 'rooms'>(getTab() as any);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tab = (p.get('tab') || 'consultas') as 'consultas' | 'rooms';
    setActiveTab(tab);
  }, [location]);

  const switchTab = (tab: 'consultas' | 'rooms') => {
    setActiveTab(tab);
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
  }));

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
        psychologistId: Number(payload.psychologistId),
        roomId: Number(payload.roomId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({ title: "Agendamento criado", description: "O agendamento foi criado com sucesso." });
      setIsNewAppointmentDialogOpen(false);
      appointmentForm.reset();
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
      psychologistId: 0,
      roomId: 0,
      date: formatDateForRequest(selectedDate),
      startTime: "09:00",
      endTime: "10:00",
      status: "scheduled",
      notes: "",
      duration: "50",
    }
  });

  const shareForm = useForm<WhatsAppShareFormValues>({
    resolver: zodResolver(whatsAppShareSchema),
    defaultValues: {
      psychologistId: "",
      startDate: formatDateForRequest(new Date()),
      endDate: formatDateForRequest(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      message: "Olá! Seguem os horários disponíveis para agendamento.",
    }
  });

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

  const dailyEvents = formattedAppointments.filter(a => a.date === formatDateForRequest(selectedDate));

  const filteredAppointments = formattedAppointments.filter(a => {
    if (filterPatient && a.psychologistId !== Number(filterPatient)) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const filteredWeeklyByDate = filteredAppointments.reduce<Record<string, typeof filteredAppointments>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});

  // ── Render ──
  return (
    <div className="flex h-screen bg-[#f7f8fa]">
      <Sidebar />

      <div className="flex-1 flex flex-col ml-0 md:ml-64 pt-16 md:pt-0 overflow-hidden">
        <MobileNav />

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-4 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            {activeTab === 'consultas' ? (
              <>
                <h1 className="text-[17px] font-bold text-slate-800">Minhas Consultas</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">Agenda de {user?.fullName?.split(' ')[0] || 'usuário'}</p>
              </>
            ) : (
              <>
                <h1 className="text-[17px] font-bold text-slate-800">Reservas de Salas</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">Grade de ocupação das salas</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'consultas' ? (
              <>
                <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-[13px]">
                      <Share className="h-3.5 w-3.5" />
                      Compartilhar Horários
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Compartilhar Disponibilidade</DialogTitle>
                      <DialogDescription>Compartilhe os horários disponíveis via WhatsApp.</DialogDescription>
                    </DialogHeader>
                    <Form {...shareForm}>
                      <form onSubmit={shareForm.handleSubmit(d => shareWhatsAppMutation.mutate(d))} className="space-y-4 mt-4">
                        <FormField control={shareForm.control} name="psychologistId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Psicóloga</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {(psychologists as any[]).map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={shareForm.control} name="startDate" render={({ field }) => (
                            <FormItem><FormLabel>Data Inicial</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={shareForm.control} name="endDate" render={({ field }) => (
                            <FormItem><FormLabel>Data Final</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={shareForm.control} name="message" render={({ field }) => (
                          <FormItem><FormLabel>Mensagem</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={shareWhatsAppMutation.isPending}>
                            {shareWhatsAppMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                            Compartilhar via WhatsApp
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isNewAppointmentDialogOpen} onOpenChange={setIsNewAppointmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1.5 text-[13px]">
                      <Plus className="h-3.5 w-3.5" />
                      Nova Consulta
                    </Button>
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
                  />
                </Dialog>
              </>
            ) : (
              <Dialog open={isNewBookingDialogOpen} onOpenChange={setIsNewBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-1.5 text-[13px]">
                    <Plus className="h-3.5 w-3.5" />
                    Reservar Sala
                  </Button>
                </DialogTrigger>
                <BookingDialog
                  form={bookingForm}
                  psychologists={psychologists as any[]}
                  rooms={rooms as any[]}
                  isPending={createBookingMutation.isPending}
                  onClose={() => setIsNewBookingDialogOpen(false)}
                  onSubmit={d => createBookingMutation.mutate(d)}
                />
              </Dialog>
            )}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'consultas' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Calendar toolbar */}
            <div className="px-7 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                {/* View toggle */}
                <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                  {(['month','week','day'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-all",
                        viewMode === v ? "bg-[#1e7e8c] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                    </button>
                  ))}
                </div>

                {/* Date nav */}
                <div className="flex items-center gap-1.5">
                  <button onClick={goToPrev} className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-bold text-slate-800 min-w-[130px] text-center">{periodLabel}</span>
                  <button onClick={goToNext} className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => { goToToday(); setViewMode('week'); }} className="px-3 py-1 border border-slate-200 rounded-md text-[12.5px] font-medium text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors bg-white">
                    Hoje
                  </button>
                </div>

                {/* Filters */}
                <select
                  value={filterPatient}
                  onChange={e => setFilterPatient(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md text-[12px] text-slate-600 bg-white outline-none focus:border-[#1e7e8c]"
                >
                  <option value="">Todos os pacientes</option>
                  {(psychologists as any[]).map(p => (
                    <option key={p.id} value={p.id}>{p.user.fullName}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md text-[12px] text-slate-600 bg-white outline-none focus:border-[#1e7e8c]"
                >
                  <option value="">Todos os status</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="scheduled">Aguardando</option>
                  <option value="completed">Concluído</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[11.5px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1e7e8c]" />Confirmado</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#d97706]" />Aguardando</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#16a34a]" />Concluído</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" />Cancelado</span>
              </div>
            </div>

            {/* Calendar area */}
            <div className="flex-1 overflow-hidden px-7 py-4">
              {isLoading || loadingPsychs || loadingRooms ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Room tabs + date nav */}
            <div className="px-7 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              {/* Room tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setRoomTab('all')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium border-b-2 transition-colors",
                    roomTab === 'all' ? "border-[#1e7e8c] text-[#1e7e8c]" : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Visão Geral
                </button>
                {(rooms as any[]).map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRoomTab(r.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[12.5px] font-medium border-b-2 transition-colors",
                      roomTab === r.id ? "border-[#1e7e8c] text-[#1e7e8c]" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {r.name}
                  </button>
                ))}
              </div>

              {/* Date nav */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRoomDate(d => addDays(d, -1))}
                  className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[13px] font-semibold text-slate-700 min-w-[130px] text-center">
                  {format(roomDate, "d 'de' MMMM yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={() => setRoomDate(d => addDays(d, 1))}
                  className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRoomDate(new Date())}
                  className="px-3 py-1 border border-slate-200 rounded-md text-[12.5px] font-medium text-slate-500 hover:border-[#1e7e8c] hover:text-[#1e7e8c] transition-colors bg-white"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="px-7 py-2 bg-[#f8fafc] border-b border-slate-100 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <p className="text-[11.5px] text-slate-400">Dados de pacientes não são exibidos — apenas psicóloga, sala e horário</p>
            </div>

            {/* Room grid */}
            <div className="flex-1 overflow-auto px-7 py-4">
              {loadingRoomBookings ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <RoomGrid
                  rooms={rooms as any[]}
                  bookings={roomBookings as any[]}
                  psychColorMap={psychColorMap}
                  selectedRoom={roomTab}
                  user={user}
                  onDelete={id => setDeleteBookingId(id)}
                />
              )}
            </div>

            {/* Legend */}
            {(psychologists as any[]).length > 0 && (
              <div className="px-7 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center gap-4">
                {(psychologists as any[]).map((p, i) => {
                  const c = getPsychColor(i);
                  return (
                    <span key={p.id} className="flex items-center gap-1.5 text-[12px] text-slate-600">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      {p.user.fullName}
                      {p.userId === user?.id && ' (você)'}
                    </span>
                  );
                })}
              </div>
            )}
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
              className="bg-red-600 hover:bg-red-700"
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07 → 20
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-[#e8f4f6] border-[#1e7e8c] text-[#155f6b]';
      case 'scheduled': return 'bg-[#fef3e2] border-[#d97706] text-[#92400e]';
      case 'completed': return 'bg-[#f0fdf4] border-[#16a34a] text-[#14532d]';
      case 'canceled':  return 'bg-slate-100 border-slate-300 text-slate-500';
      case 'first-session': return 'bg-[#f3e8ff] border-[#7c3aed] text-[#5b21b6]';
      default: return 'bg-[#e8f4f6] border-[#1e7e8c] text-[#155f6b]';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ height: `${HOUR_H * HOURS.length + 48}px` }}>
      {/* Day headers */}
      <div className="grid border-b border-slate-200 flex-shrink-0" style={{ gridTemplateColumns: `54px repeat(7, 1fr)` }}>
        <div className="p-2" />
        {days.map((day, i) => {
          const ds = formatDateForRequest(day);
          const isToday = ds === todayStr;
          return (
            <div key={i} className={cn("px-2 py-2 text-center border-l border-slate-100", isToday && "bg-[#f0f9fa]")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                "mt-1 text-[18px] font-bold text-slate-600 leading-none",
                isToday && "w-8 h-8 rounded-full bg-[#1e7e8c] text-white text-[14px] flex items-center justify-center mx-auto"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ gridTemplateColumns: `54px repeat(7, 1fr)`, display: 'grid', height: `${HOUR_H * HOURS.length}px` }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map(h => (
              <div key={h} className="absolute w-full flex items-start justify-end pr-2 pt-0.5" style={{ top: `${(h - 7) * HOUR_H}px`, height: `${HOUR_H}px` }}>
                <span className="text-[10.5px] text-slate-400 font-medium">{h.toString().padStart(2, '0')}:00</span>
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
                className={cn("relative border-l border-slate-100 cursor-pointer group", isToday && "bg-[#f0f9fa]/40")}
                onClick={() => onAddClick(day)}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-slate-100" style={{ top: `${(h - 7) * HOUR_H}px` }} />
                ))}

                {/* Event cards */}
                {events.map(ev => {
                  const startMin = timeToMinutes(ev.startTime);
                  const endMin = timeToMinutes(ev.endTime);
                  const top = (startMin - 7 * 60) / 60 * HOUR_H;
                  const height = Math.max((endMin - startMin) / 60 * HOUR_H, 24);

                  return (
                    <div
                      key={ev.id}
                      onClick={e => e.stopPropagation()}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1.5 py-1 overflow-hidden",
                        statusColor(ev.status)
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="text-[10px] font-semibold leading-tight truncate">
                        {ev.startTime} – {ev.endTime}
                      </div>
                      {height > 30 && (
                        <div className="text-[10px] leading-tight truncate font-medium">{ev.patientName}</div>
                      )}
                      {height > 46 && (
                        <div className="text-[9.5px] leading-tight truncate opacity-75">
                          {ev.roomName} · {ev.status === 'completed' ? 'Concluído' : ev.status === 'confirmed' ? 'Presencial' : 'Agendado'}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add hint on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                  <span className="text-[10px] text-slate-400">+ Agendar</span>
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

function RoomGrid({
  rooms,
  bookings,
  psychColorMap,
  selectedRoom,
  user,
  onDelete,
}: {
  rooms: any[];
  bookings: any[];
  psychColorMap: Record<number, typeof PSYCH_COLORS[0]>;
  selectedRoom: 'all' | number;
  user: any;
  onDelete: (id: number) => void;
}) {
  const displayRooms = selectedRoom === 'all' ? rooms : rooms.filter(r => r.id === selectedRoom);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `72px repeat(${displayRooms.length}, 1fr)` }}>
        <div className="p-3 bg-[#f8fafc]" />
        {displayRooms.map(r => (
          <div key={r.id} className="px-3 py-3 text-center bg-[#f8fafc] border-l border-slate-200">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{r.name}</div>
          </div>
        ))}
      </div>

      {/* Time rows */}
      {HOURS.map(h => {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        return (
          <div key={h} className="grid border-t border-slate-100" style={{ gridTemplateColumns: `72px repeat(${displayRooms.length}, 1fr)`, minHeight: '60px' }}>
            <div className="px-3 pt-2 text-[11px] text-slate-400 font-medium">{hourStr}</div>
            {displayRooms.map(room => {
              const slot = bookings.filter(b => {
                if (b.roomId !== room.id) return false;
                const bStart = timeToMinutes(b.startTime);
                const bEnd = timeToMinutes(b.endTime);
                return bStart >= h * 60 && bStart < (h + 1) * 60;
              });

              return (
                <div key={room.id} className="border-l border-slate-100 p-1 relative min-h-[60px]">
                  {slot.map(b => {
                    const c = psychColorMap[b.psychologistId] || PSYCH_COLORS[0];
                    const isMe = b.psychologist?.userId === user?.id;
                    const duration = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
                    const heightRatio = duration / 60;

                    return (
                      <div
                        key={b.id}
                        className={cn("rounded-md px-2 py-1 mb-1 relative group", c.bg)}
                        style={{ borderLeft: `3px solid ${c.borderColor}` }}
                      >
                        <div className={cn("text-[11px] font-semibold leading-tight truncate", c.text)}>
                          {b.psychologist?.user?.fullName || 'Psicóloga'}
                          {isMe && ' (você)'}
                        </div>
                        <div className={cn("text-[10.5px] leading-tight", c.text, "opacity-80")}>
                          {b.startTime} – {b.endTime} · {b.purpose || 'Consulta'}
                        </div>
                        <button
                          onClick={() => onDelete(b.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {bookings.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          Nenhuma reserva para esta data
        </div>
      )}
    </div>
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
}: any) {
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
      <DialogHeader className="flex flex-row items-center gap-3 px-6 py-4 border-b border-neutral-light">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Plus className="h-5 w-5" />
        </div>
        <div className="text-left">
          <DialogTitle className="text-lg font-semibold">Novo Agendamento</DialogTitle>
          <DialogDescription className="text-sm text-neutral-dark">Agende uma sessão para um paciente.</DialogDescription>
        </div>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="patientName" render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <FormControl><Input placeholder="Buscar ou digitar..." {...field} /></FormControl>
                  <FormMessage />
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsPatientSearchOpen(true)}>
                      Buscar paciente existente
                    </Button>
                    <Command shouldFilter className={isPatientSearchOpen ? "mt-2 border rounded-md" : "hidden"}>
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
                                {p.email && <span className="text-xs text-neutral-dark">{p.email}</span>}
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
                  <FormLabel>Psicóloga</FormLabel>
                  <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {psychologists.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="roomId" render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Sala</FormLabel>
                  <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {rooms.map((r: any) => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Aguardando</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="first-session">Primeira Sessão</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="date" render={({ field }: any) => (
                  <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={e => {
                        field.onChange(e);
                        const dur = form.getValues("duration") || "50";
                        form.setValue("endTime", calculateEndTime(e.target.value, dur));
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }: any) => (
                  <FormItem><FormLabel>Término</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="duration" render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Duração</FormLabel>
                  <Select onValueChange={v => { field.onChange(v); const s = form.getValues("startTime"); if (s) form.setValue("endTime", calculateEndTime(s, v)); }} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="50">50 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }: any) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea className="resize-none min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-neutral-light bg-neutral-light/60">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

// ─── BookingDialog ────────────────────────────────────────────────────────────

function BookingDialog({ form, psychologists, rooms, isPending, onClose, onSubmit }: any) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova Reserva de Sala</DialogTitle>
        <DialogDescription>Reserve uma sala para um horário específico.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <FormField control={form.control} name="psychologistId" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Psicóloga</FormLabel>
              <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  {psychologists.map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="roomId" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Sala</FormLabel>
              <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  {rooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="purpose" render={({ field }: any) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
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
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-3 gap-3">
            <FormField control={form.control} name="date" render={({ field }: any) => (
              <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="startTime" render={({ field }: any) => (
              <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="endTime" render={({ field }: any) => (
              <FormItem><FormLabel>Término</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reservar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
