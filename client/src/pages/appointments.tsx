import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAppointmentSchema } from "@shared/schema";
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
  FormMessage 
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
import { Loader2, Plus, Share, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { type Patient } from "@shared/schema";

// Extend appointment schema for form validation
const appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  // Campo apenas de front-end para facilitar o preenchimento de horário de término
  duration: z.enum(["50", "60", "90"]).optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

// WhatsApp share form schema
const whatsAppShareSchema = z.object({
  psychologistId: z.string().min(1, "Selecione uma psicóloga"),
  startDate: z.string().min(1, "Data inicial é obrigatória"),
  endDate: z.string().min(1, "Data final é obrigatória"),
  message: z.string().optional(),
});

type WhatsAppShareFormValues = z.infer<typeof whatsAppShareSchema>;

export default function Appointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isNewAppointmentDialogOpen, setIsNewAppointmentDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  // Format date for API requests
  const formatDateForRequest = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Get current month's start and end dates
  const getMonthDateRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      startDate: formatDateForRequest(firstDay),
      endDate: formatDateForRequest(lastDay)
    };
  };

  // Get date range for queries (mês usado na visão de calendário)
  const dateRange = getMonthDateRange(selectedDate);

  // Get current week range for week view
  const getWeekDateRange = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 (Dom) - 6 (Sáb)
    const start = new Date(date);
    start.setDate(date.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
  };

  const weekRange = getWeekDateRange(selectedDate);

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    }
  });

  // Fetch psychologists
  const { data: psychologists, isLoading: isLoadingPsychologists } = useQuery({
    queryKey: ['/api/psychologists'],
    queryFn: async () => {
      const res = await fetch('/api/psychologists');
      if (!res.ok) throw new Error('Failed to fetch psychologists');
      return res.json();
    }
  });

  // Fetch rooms
  const { data: rooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    }
  });

  // Fetch patients (para auto-complete de paciente no agendamento)
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Format appointments for calendar
  const formattedAppointments = appointments?.map(appointment => ({
    id: appointment.id,
    title: `${appointment.patientName}`,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    patientName: appointment.patientName,
    psychologistId: appointment.psychologistId,
    psychologistName: appointment.psychologist?.user?.fullName || 'Não definido',
    roomId: appointment.roomId,
    roomName: appointment.room?.name || 'Não definida',
    status: appointment.status,
  })) || [];

  // Agrupar agendamentos por data para a visão semanal
  const weeklyAppointmentsByDate = formattedAppointments.reduce<Record<string, typeof formattedAppointments>>(
    (acc, appointment) => {
      const dateKey = appointment.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(appointment);
      return acc;
    },
    {}
  );

  const formatDateForDisplay = (date: Date, pattern: string) => {
    return format(date, pattern, { locale: ptBR });
  };

  const calculateEndTime = (startTime: string, durationMinutes: string) => {
    const [hours, minutes] = startTime.split(":");
    const duration = parseInt(durationMinutes, 10);
    const startDate = new Date();
    startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    const endHours = endDate.getHours().toString().padStart(2, "0");
    const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
    return `${endHours}:${endMinutes}`;
  };

  // Create appointment form
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

  // WhatsApp share form
  const shareForm = useForm<WhatsAppShareFormValues>({
    resolver: zodResolver(whatsAppShareSchema),
    defaultValues: {
      psychologistId: "",
      startDate: formatDateForRequest(new Date()),
      endDate: formatDateForRequest(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      message: "Olá! Seguem os horários disponíveis para agendamento com nossa equipe de psicologia.",
    }
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      const response = await apiRequest("POST", "/api/appointments", {
        ...data,
        psychologistId: Number(data.psychologistId),
        roomId: Number(data.roomId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
        variant: "default",
      });
      setIsNewAppointmentDialogOpen(false);
      appointmentForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar agendamento: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // WhatsApp share mutation
  const shareWhatsAppMutation = useMutation({
    mutationFn: async (data: WhatsAppShareFormValues) => {
      const response = await apiRequest("POST", "/api/share/whatsapp", {
        psychologistId: Number(data.psychologistId),
        startDate: data.startDate,
        endDate: data.endDate,
        message: data.message,
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.link, '_blank');
      setIsShareDialogOpen(false);
      toast({
        title: "Link gerado",
        description: "O link do WhatsApp foi gerado e aberto em uma nova aba.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao gerar link: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle appointment form submission
  const onAppointmentSubmit = (data: AppointmentFormValues) => {
    const { duration, ...payload } = data;
    createAppointmentMutation.mutate(payload as AppointmentFormValues);
  };

  // Handle WhatsApp share form submission
  const onShareSubmit = (data: WhatsAppShareFormValues) => {
    shareWhatsAppMutation.mutate(data);
  };

  // Handle date selection in calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    appointmentForm.setValue('date', formatDateForRequest(date));
  };

  // Handle appointment click in calendar
  const handleAppointmentClick = (appointmentId: number) => {
    setSelectedAppointment(appointmentId);
    // Logic to show appointment details would go here
  };

  const handleQuickAddAppointmentForDate = (date: Date) => {
    const currentDuration = appointmentForm.getValues("duration") || "50";
    const defaultStartTime = "09:00";
    appointmentForm.setValue("date", formatDateForRequest(date));
    appointmentForm.setValue("startTime", defaultStartTime);
    appointmentForm.setValue("endTime", calculateEndTime(defaultStartTime, currentDuration));
    setSelectedDate(date);
    setViewMode("day");
    setIsNewAppointmentDialogOpen(true);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  const goToPreviousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const currentPeriodLabel = (() => {
    if (viewMode === "day") {
      return formatDateForDisplay(selectedDate, "d 'de' MMMM yyyy");
    }
    if (viewMode === "week") {
      const startLabel = formatDateForDisplay(weekRange.start, "d 'de' MMMM");
      const endLabel = formatDateForDisplay(weekRange.end, "d 'de' MMMM yyyy");
      return `Semana de ${startLabel} a ${endLabel}`;
    }
    return formatDateForDisplay(selectedDate, "MMMM yyyy");
  })();

  // Loading state
  const isPageLoading = isLoading || isLoadingPsychologists || isLoadingRooms;

  // Eventos filtrados para o dia selecionado (usados na visualização diária)
  const dailyEventsForSelectedDate = formattedAppointments.filter(
    (appointment) => appointment.date === formatDateForRequest(selectedDate)
  );

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Agendamentos Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="heading-page">Agendamentos</h1>
              <p className="text-muted">Gerenciamento de consultas</p>
            </div>
            <div className="flex mt-4 md:mt-0 space-x-2">
              <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Share className="mr-2 h-4 w-4" />
                    Compartilhar Horários
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Compartilhar Disponibilidade</DialogTitle>
                    <DialogDescription>
                      Compartilhe os horários disponíveis de uma psicóloga através do WhatsApp.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...shareForm}>
                    <form onSubmit={shareForm.handleSubmit(onShareSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={shareForm.control}
                        name="psychologistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selecione a Psicóloga</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma psicóloga" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {psychologists?.map((psychologist) => (
                                  <SelectItem 
                                    key={psychologist.id} 
                                    value={psychologist.id.toString()}
                                  >
                                    {psychologist.user.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={shareForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Inicial</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={shareForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Final</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={shareForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Informe uma mensagem personalizada..." 
                                className="resize-none" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={shareWhatsAppMutation.isPending}>
                          {shareWhatsAppMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando link...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Compartilhar via WhatsApp
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isNewAppointmentDialogOpen} onOpenChange={setIsNewAppointmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                  <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-neutral-light">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Plus className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <DialogTitle className="text-lg font-semibold tracking-tight">
                          Novo Agendamento
                        </DialogTitle>
                        <DialogDescription className="text-sm text-neutral-dark">
                          Agende uma sessão para um paciente.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <Form {...appointmentForm}>
                    <form
                      onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)}
                      className="flex flex-col max-h-[calc(90vh-4rem)]"
                    >
                      {/* Corpo rolável do formulário */}
                      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        {/* Paciente + Psicóloga */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={appointmentForm.control}
                            name="patientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Paciente</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Buscar ou digitar paciente..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                                {/* Busca/auto-complete de paciente */}
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPatientSearchOpen(true)}
                                  >
                                    Buscar paciente existente
                                  </Button>
                                  <Command
                                    shouldFilter={true}
                                    className={
                                      isPatientSearchOpen
                                        ? "mt-2 border rounded-md"
                                        : "hidden"
                                    }
                                  >
                                    <CommandInput placeholder="Buscar por nome, e-mail ou CPF..." />
                                    <CommandList>
                                      <CommandEmpty>
                                        Nenhum paciente encontrado.
                                      </CommandEmpty>
                                      <CommandGroup heading="Pacientes">
                                        {patients?.map((patient) => (
                                          <CommandItem
                                            key={patient.id}
                                            value={patient.fullName}
                                            onSelect={() => {
                                              appointmentForm.setValue(
                                                "patientName",
                                                patient.fullName
                                              );
                                              setIsPatientSearchOpen(false);
                                            }}
                                          >
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium">
                                                {patient.fullName}
                                              </span>
                                              {patient.email && (
                                                <span className="text-xs text-neutral-dark">
                                                  {patient.email}
                                                </span>
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={appointmentForm.control}
                            name="psychologistId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Psicóloga</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) =>
                                      field.onChange(parseInt(value))
                                    }
                                    defaultValue={field.value.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma psicóloga" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {psychologists?.map((psychologist) => (
                                        <SelectItem
                                          key={psychologist.id}
                                          value={psychologist.id.toString()}
                                        >
                                          {psychologist.user.fullName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Sala + Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={appointmentForm.control}
                            name="roomId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sala</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) =>
                                      field.onChange(parseInt(value))
                                    }
                                    defaultValue={field.value.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma sala" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {rooms?.map((room) => (
                                        <SelectItem
                                          key={room.id}
                                          value={room.id.toString()}
                                        >
                                          {room.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={appointmentForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="scheduled">
                                        Agendado
                                      </SelectItem>
                                      <SelectItem value="confirmed">
                                        Confirmado
                                      </SelectItem>
                                      <SelectItem value="canceled">
                                        Cancelado
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Concluído
                                      </SelectItem>
                                      <SelectItem value="first-session">
                                        Primeira Sessão
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Data / Horário / Duração em cartão destacado */}
                        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={appointmentForm.control}
                              name="date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data da consulta</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={appointmentForm.control}
                              name="startTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Início</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      {...field}
                                      onChange={(event) => {
                                        field.onChange(event);
                                        const duration =
                                          appointmentForm.getValues(
                                            "duration"
                                          ) || "50";
                                        appointmentForm.setValue(
                                          "endTime",
                                          calculateEndTime(
                                            event.target.value,
                                            duration
                                          )
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={appointmentForm.control}
                              name="endTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Término</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={appointmentForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duração da sessão</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      const start =
                                        appointmentForm.getValues("startTime");
                                      if (start) {
                                        appointmentForm.setValue(
                                          "endTime",
                                          calculateEndTime(start, value)
                                        );
                                      }
                                    }}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione a duração" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="50">
                                        50 minutos
                                      </SelectItem>
                                      <SelectItem value="60">
                                        60 minutos
                                      </SelectItem>
                                      <SelectItem value="90">
                                        90 minutos
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Observações */}
                        <FormField
                          control={appointmentForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Informações adicionais sobre o agendamento"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Rodapé fixo do modal */}
                      <DialogFooter className="px-6 py-4 border-t border-neutral-light bg-neutral-light/60 flex flex-row items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewAppointmentDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createAppointmentMutation.isPending}>
                          {createAppointmentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            "Criar Agendamento"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Toolbar do calendário: abas de visão + navegação de período + legenda */}
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Abas de visão */}
            <div className="flex items-center gap-4">
              <div className="inline-flex rounded-lg bg-neutral-light p-1">
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  className="px-4"
                  onClick={() => setViewMode("month")}
                >
                  Mês
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  className="px-4"
                  onClick={() => setViewMode("week")}
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  className="px-4"
                  onClick={() => setViewMode("day")}
                >
                  Dia
                </Button>
              </div>

              {/* Navegação de período */}
              <div className="flex items-center gap-2 ml-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToPreviousPeriod}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-neutral-darkest min-w-[150px]">
                  {currentPeriodLabel}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToNextPeriod}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-1"
                  onClick={() => {
                    goToToday();
                    setViewMode("day");
                  }}
                >
                  Hoje
                </Button>
              </div>
            </div>

            {/* Legenda por status */}
            <div className="flex flex-wrap gap-4 text-xs text-neutral-dark">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                <span>Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span>Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>Aguardando (WhatsApp)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
                <span>Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-neutral-500" />
                <span>Cancelado</span>
              </div>
            </div>
          </div>

          {isPageLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Visualização do dia (24 horas) */}
              {viewMode === 'day' && (
                <DailyHoursView 
                  date={selectedDate}
                  events={dailyEventsForSelectedDate}
                  onAppointmentClick={handleAppointmentClick}
                  onTimeSlotClick={(timeSlot, date) => {
                    appointmentForm.setValue('date', formatDateForRequest(date));
                    appointmentForm.setValue('startTime', timeSlot);
                    
                    const duration = appointmentForm.getValues("duration") || "50";
                    appointmentForm.setValue('endTime', calculateEndTime(timeSlot, duration));
                    
                    setIsNewAppointmentDialogOpen(true);
                  }}
                />
              )}
              
              {/* Visualização semanal */}
              {viewMode === "week" && (
                <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
                    {Array.from({ length: 7 }).map((_, index) => {
                      const current = new Date(weekRange.start);
                      current.setDate(weekRange.start.getDate() + index);
                      const dateKey = formatDateForRequest(current);
                      const eventsForDay = weeklyAppointmentsByDate[dateKey] || [];

                      return (
                        <div
                          key={index}
                          className="flex flex-col rounded-md border border-neutral-light bg-neutral-lightest p-3"
                        >
                          <div className="mb-2 text-sm font-semibold text-neutral-darkest">
                            {formatDateForDisplay(current, "EEE dd/MM")}
                          </div>

                          <div className="flex-1 space-y-1">
                            {eventsForDay.map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                className="w-full rounded-md border-l-4 bg-white px-2 py-1 text-left text-xs hover:bg-neutral-lightest"
                                onClick={() => handleAppointmentClick(event.id)}
                              >
                                <div className="font-medium">
                                  {event.startTime} - {event.endTime}
                                </div>
                                <div className="text-[11px] text-neutral-dark">
                                  {event.patientName}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {event.psychologistName} · {event.roomName}
                                </div>
                              </button>
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="mt-2 text-xs"
                            onClick={() => handleQuickAddAppointmentForDate(current)}
                          >
                            + Agendar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Visualização do mês (calendário) */}
              {viewMode === 'month' && (
                <>
                  <Calendar 
                    events={formattedAppointments}
                    month={selectedDate.getMonth()}
                    year={selectedDate.getFullYear()}
                    onDateSelect={(date) => {
                      handleDateSelect(date);
                      setViewMode('day'); // Muda para visualização diária ao clicar em um dia
                    }}
                    onEventClick={handleAppointmentClick}
                    onAddAppointmentClick={handleQuickAddAppointmentForDate}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
