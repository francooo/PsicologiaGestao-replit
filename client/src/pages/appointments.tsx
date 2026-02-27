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
import { Loader2, Plus, Share, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Extend appointment schema for form validation
const appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
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
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

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

  // Get date range for queries
  const dateRange = getMonthDateRange(selectedDate);

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
    createAppointmentMutation.mutate(data);
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

  // Loading state
  const isPageLoading = isLoading || isLoadingPsychologists || isLoadingRooms;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Agendamentos Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Agendamentos</h1>
              <p className="text-neutral-dark">Gerenciamento de consultas</p>
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para criar um novo agendamento.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...appointmentForm}>
                    <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={appointmentForm.control}
                        name="patientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Paciente</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o nome do paciente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={appointmentForm.control}
                        name="psychologistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Psicóloga</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={appointmentForm.control}
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sala</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={appointmentForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="col-span-1">
                              <FormLabel>Data</FormLabel>
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
                            <FormItem className="col-span-1">
                              <FormLabel>Início</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={appointmentForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem className="col-span-1">
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
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
                                <SelectItem value="scheduled">Agendado</SelectItem>
                                <SelectItem value="confirmed">Confirmado</SelectItem>
                                <SelectItem value="canceled">Cancelado</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                                <SelectItem value="first-session">Primeira Sessão</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={appointmentForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Informações adicionais sobre o agendamento" 
                                className="resize-none" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
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
          
          {/* Controle de visualização */}
          <div className="flex items-center mb-6">
            <div className="flex overflow-x-auto">
              <Button 
                variant={viewMode === 'month' ? 'default' : 'outline'} 
                size="sm"
                className="mr-2"
                onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'} 
                size="sm"
                className="mr-4"
                onClick={() => {
                  setViewMode('day');
                  setSelectedDate(new Date()); // Reset para hoje
                }}
              >
                Hoje
              </Button>
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
                  events={formattedAppointments}
                  onAppointmentClick={handleAppointmentClick}
                  onTimeSlotClick={(timeSlot, date) => {
                    appointmentForm.setValue('date', formatDateForRequest(date));
                    appointmentForm.setValue('startTime', timeSlot);
                    
                    // Calcular o horário de término (1 hora após)
                    const [hours, minutes] = timeSlot.split(':');
                    const endHour = parseInt(hours) + 1;
                    const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;
                    appointmentForm.setValue('endTime', endTime);
                    
                    setIsNewAppointmentDialogOpen(true);
                  }}
                />
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
                  />
                  
                  {/* Legenda do Calendário */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    {psychologists?.slice(0, 5).map((psychologist) => (
                      <div key={psychologist.id} className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ 
                            backgroundColor: 
                              psychologist.id % 3 === 0 ? '#2D7AA9' : 
                              psychologist.id % 3 === 1 ? '#5EB69D' : '#F8B400' 
                          }}
                        ></div>
                        <span className="text-sm text-neutral-dark">{psychologist.user.fullName}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
