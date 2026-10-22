import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRoomSchema, insertRoomBookingSchema } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Wifi, AirVent, Users, SquareUser, Pencil, DoorOpen, Maximize2, Link as LinkIcon, Save, CalendarCheck } from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { CheckTile, IconField, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { toDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

// Room form schema
const roomFormSchema = insertRoomSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  capacity: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Capacidade deve ser um número válido",
  }),
  squareMeters: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Área deve ser um número válido",
  }),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

const fieldLabel = "text-[13px] font-semibold text-cp-ink";

/** Fields shared by "Nova Sala" and "Editar Sala" (mockups 14 / 16). */
function RoomFields({ form }: { form: UseFormReturn<RoomFormValues> }) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel className={fieldLabel}>Nome da Sala</FormLabel>
          <IconField icon={DoorOpen}>
            <FormControl><Input placeholder="Ex: Sala 01" {...field} /></FormControl>
          </IconField>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="capacity" render={({ field }) => (
          <FormItem>
            <FormLabel className={fieldLabel}>Capacidade</FormLabel>
            <IconField icon={Users}>
              <FormControl><Input type="number" placeholder="Ex: 4" {...field} /></FormControl>
            </IconField>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="squareMeters" render={({ field }) => (
          <FormItem>
            <FormLabel className={fieldLabel}>Área (m²)</FormLabel>
            <IconField icon={Maximize2}>
              <FormControl><Input type="number" placeholder="Ex: 15" {...field} /></FormControl>
            </IconField>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="hasWifi" render={({ field }) => (
          <FormItem className="space-y-0">
            <CheckTile icon={Wifi} label="Wi-Fi" checked={!!field.value} onCheckedChange={field.onChange} />
          </FormItem>
        )} />
        <FormField control={form.control} name="hasAirConditioning" render={({ field }) => (
          <FormItem className="space-y-0">
            <CheckTile icon={AirVent} label="Ar-Condicionado" checked={!!field.value} onCheckedChange={field.onChange} />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="imageUrl" render={({ field }) => (
        <FormItem>
          <FormLabel className={fieldLabel}>URL da Imagem</FormLabel>
          <IconField icon={LinkIcon}>
            <FormControl><Input placeholder="https://exemplo.com/imagem.jpg" {...field} value={field.value ?? ""} /></FormControl>
          </IconField>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );
}

// Room booking form schema
const roomBookingFormSchema = insertRoomBookingSchema.extend({
  roomId: z.string().min(1, "Sala é obrigatória"),
  psychologistId: z.string().min(1, "Psicóloga é obrigatória"),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  purpose: z.string().optional(),
});

type RoomBookingFormValues = z.infer<typeof roomBookingFormSchema>;

export default function Rooms() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [isNewRoomDialogOpen, setIsNewRoomDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));

  // Fetch rooms
  const { data: rooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
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

  // Logged-in psychologist record (only for psychologist role)
  const loggedPsychologist = psychologists?.find(
    (p: any) => p.user?.username === user?.username
  );

  // Fetch room bookings for today
  const { data: roomBookings, isLoading: isLoadingRoomBookings } = useQuery({
    queryKey: ['/api/room-bookings', { date: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/room-bookings?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch room bookings');
      return res.json();
    }
  });

  // Room form
  const roomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      capacity: "4",
      hasWifi: true,
      hasAirConditioning: true,
      squareMeters: "15",
      imageUrl: "",
    }
  });

  // Edit room form
  const editRoomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      capacity: "4",
      hasWifi: true,
      hasAirConditioning: true,
      squareMeters: "15",
      imageUrl: "",
    }
  });

  // Room booking form
  const bookingForm = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingFormSchema),
    defaultValues: {
      roomId: "",
      psychologistId: "",
      date: toDateKey(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      purpose: "",
    }
  });

  // When booking dialog opens, auto-set psychologistId for non-admin users
  useEffect(() => {
    if (isBookingDialogOpen && user?.role !== 'admin' && loggedPsychologist) {
      bookingForm.setValue('psychologistId', loggedPsychologist.id.toString());
    }
  }, [isBookingDialogOpen, loggedPsychologist]);

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormValues) => {
      const response = await apiRequest("POST", "/api/rooms", {
        name: data.name,
        capacity: parseInt(data.capacity),
        hasWifi: data.hasWifi,
        hasAirConditioning: data.hasAirConditioning,
        squareMeters: parseInt(data.squareMeters),
        imageUrl: data.imageUrl || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "Sala criada",
        description: "A sala foi criada com sucesso.",
        variant: "default",
      });
      setIsNewRoomDialogOpen(false);
      roomForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar sala: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RoomFormValues }) => {
      const response = await apiRequest("PUT", `/api/rooms/${id}`, {
        name: data.name,
        capacity: parseInt(data.capacity),
        hasWifi: data.hasWifi,
        hasAirConditioning: data.hasAirConditioning,
        squareMeters: parseInt(data.squareMeters),
        imageUrl: data.imageUrl || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({ title: "Sala atualizada", description: "As informações foram salvas com sucesso." });
      setIsEditRoomDialogOpen(false);
      setEditingRoom(null);
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao atualizar sala: ${error.message}`, variant: "destructive" });
    }
  });

  // Open edit dialog and pre-fill form
  const openEditDialog = (room: any) => {
    setEditingRoom(room);
    editRoomForm.reset({
      name: room.name,
      capacity: String(room.capacity),
      hasWifi: room.hasWifi ?? false,
      hasAirConditioning: room.hasAirConditioning ?? false,
      squareMeters: String(room.squareMeters ?? ""),
      imageUrl: room.imageUrl ?? "",
    });
    setIsEditRoomDialogOpen(true);
  };

  // Create room booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: RoomBookingFormValues) => {
      const response = await apiRequest("POST", "/api/room-bookings", {
        roomId: parseInt(data.roomId),
        psychologistId: parseInt(data.psychologistId),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        purpose: data.purpose,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast({
        title: "Reserva criada",
        description: "A reserva foi criada com sucesso.",
        variant: "default",
      });
      setIsBookingDialogOpen(false);
      bookingForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar reserva: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle room form submission
  const onRoomSubmit = (data: RoomFormValues) => {
    createRoomMutation.mutate(data);
  };

  // Handle room booking form submission
  const onBookingSubmit = (data: RoomBookingFormValues) => {
    createBookingMutation.mutate(data);
  };

  // Find out if a room is booked at this time
  const isRoomBooked = (roomId: number, timeSlot: string) => {
    if (!roomBookings) return false;

    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    const slotStart = new Date();
    slotStart.setHours(startHour, startMinute, 0);

    // Assuming slots are 1 hour
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    // Format times for comparison
    const slotStartFormatted = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    const slotEndFormatted = `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`;

    return roomBookings.some(booking => {
      if (booking.roomId !== roomId) return false;

      const bookingStartTime = booking.startTime;
      const bookingEndTime = booking.endTime;

      // Check for overlap
      return (
        (slotStartFormatted < bookingEndTime && slotEndFormatted > bookingStartTime)
      );
    });
  };

  // Get who booked a room at this time
  const getBookingInfo = (roomId: number, timeSlot: string) => {
    if (!roomBookings) return null;

    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    const slotStart = new Date();
    slotStart.setHours(startHour, startMinute, 0);

    // Assuming slots are 1 hour
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    // Format times for comparison
    const slotStartFormatted = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    const slotEndFormatted = `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`;

    const booking = roomBookings.find(booking => {
      if (booking.roomId !== roomId) return false;

      const bookingStartTime = booking.startTime;
      const bookingEndTime = booking.endTime;

      // Check for overlap
      return (
        (slotStartFormatted < bookingEndTime && slotEndFormatted > bookingStartTime)
      );
    });

    if (!booking) return null;

    return {
      psychologistName: booking.psychologist?.user?.fullName || 'Não definido',
      purpose: booking.purpose || 'Reserva',
    };
  };

  // Generate time slots for the table
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Loading state
  const isLoading = isLoadingRooms || isLoadingPsychologists || isLoadingRoomBookings;

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />

        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          {/* Rooms Header */}
          <div className="mb-6">
            <PageHeader
              title="Gestão de Salas"
              subtitle="Controle e agendamento de salas"
              phrase
              actions={
                <>
                  <button type="button" className={cpButton.secondary} onClick={() => setIsBookingDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Reservar Sala
                  </button>
                  {isAdmin && (
                    <button type="button" className={cpButton.primary} onClick={() => setIsNewRoomDialogOpen(true)} data-testid="button-add-room">
                      <Plus className="h-4 w-4" />
                      Adicionar Sala
                    </button>
                  )}
                </>
              }
            />
            <div>
              {isAdmin && (
              <Dialog open={isNewRoomDialogOpen} onOpenChange={setIsNewRoomDialogOpen}>
                <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
                  <ModalHeader icon={DoorOpen} title="Nova Sala" description="Preencha os detalhes para adicionar uma nova sala." />
                  <Form {...roomForm}>
                    <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="mt-2 space-y-4">
                      <RoomFields form={roomForm} />
                      <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
                        <button type="button" className={cpButton.subtle} onClick={() => setIsNewRoomDialogOpen(false)}>
                          Cancelar
                        </button>
                        <button type="submit" className={cpButton.primary} disabled={createRoomMutation.isPending}>
                          {createRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          {createRoomMutation.isPending ? "Criando..." : "Adicionar Sala"}
                        </button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              )}

              <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
                  <ModalHeader icon={CalendarCheck} title="Reservar Sala" description="Preencha os detalhes para reservar uma sala." />

                  <Form {...bookingForm}>
                    <form onSubmit={bookingForm.handleSubmit(onBookingSubmit)} className="mt-2 space-y-4 [&_input]:rounded-xl [&_input]:border-cp-border [&_input:focus-visible]:ring-cp-action [&_button[role=combobox]]:rounded-xl [&_button[role=combobox]]:border-cp-border [&_button[role=combobox]:focus]:ring-cp-action [&_textarea]:rounded-xl [&_textarea]:border-cp-border">
                      <FormField
                        control={bookingForm.control}
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sala</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
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

                      <FormField
                        control={bookingForm.control}
                        name="psychologistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Psicóloga</FormLabel>
                            {user?.role === 'admin' ? (
                              /* Admin: dropdown para escolher qualquer psicóloga */
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-psychologist">
                                    <SelectValue placeholder="Selecione uma psicóloga" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {psychologists?.map((psychologist: any) => (
                                    <SelectItem
                                      key={psychologist.id}
                                      value={psychologist.id.toString()}
                                    >
                                      {psychologist.user?.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : loggedPsychologist ? (
                              /* Não-admin: campo fixo com a psicóloga logada */
                              <FormControl>
                                <div className="flex h-11 items-center rounded-xl border border-cp-border bg-cp-hover px-3">
                                  <SquareUser className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm" data-testid="text-locked-psychologist">
                                    {loggedPsychologist.user?.fullName || user?.fullName}
                                  </span>
                                </div>
                              </FormControl>
                            ) : (
                              /* Psicóloga sem registro no sistema */
                              <div className="rounded-xl border border-cp-warning/25 bg-cp-warning-soft p-3 text-sm text-cp-ink">
                                Seu registro de psicóloga não foi encontrado. Entre em contato com o administrador.
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={bookingForm.control}
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
                          control={bookingForm.control}
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
                          control={bookingForm.control}
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
                        control={bookingForm.control}
                        name="purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Propósito (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Informe o propósito da reserva" 
                                className="resize-none" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
                        <button type="button" className={cpButton.subtle} onClick={() => setIsBookingDialogOpen(false)}>
                          Cancelar
                        </button>
                        <button type="submit" className={cpButton.primary} disabled={createBookingMutation.isPending}>
                          {createBookingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                          {createBookingMutation.isPending ? "Reservando..." : "Reservar Sala"}
                        </button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Edit Room Dialog */}
          {isAdmin && (
          <Dialog open={isEditRoomDialogOpen} onOpenChange={setIsEditRoomDialogOpen}>
            <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
              <ModalHeader icon={Pencil} title="Editar Sala" description="Atualize as informações da sala." />
              <Form {...editRoomForm}>
                <form
                  onSubmit={editRoomForm.handleSubmit((data) =>
                    updateRoomMutation.mutate({ id: editingRoom?.id, data })
                  )}
                  className="mt-2 space-y-4"
                >
                  <RoomFields form={editRoomForm} />
                  <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
                    <button type="button" className={cpButton.subtle} onClick={() => setIsEditRoomDialogOpen(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className={cpButton.primary} disabled={updateRoomMutation.isPending}>
                      {updateRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {updateRoomMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
            </div>
          ) : (
            <>
              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                {rooms && rooms.length > 0 ? (
                  rooms.map((room) => {
                    // Calculate bookings for this room today
                    const roomBookingsForThisRoom = roomBookings?.filter(
                      booking => booking.roomId === room.id
                    ) || [];

                    const isCurrentlyBooked = roomBookingsForThisRoom.some(booking => {
                      const now = new Date();
                      const bookingDate = String(booking.date ?? '').slice(0, 10);
                      const todayDate = toDateKey(now);

                      if (bookingDate !== todayDate) return false;

                      const [startHour, startMinute] = booking.startTime.split(':').map(Number);
                      const [endHour, endMinute] = booking.endTime.split(':').map(Number);

                      const bookingStart = new Date(now);
                      bookingStart.setHours(startHour, startMinute, 0);

                      const bookingEnd = new Date(now);
                      bookingEnd.setHours(endHour, endMinute, 0);

                      return now >= bookingStart && now < bookingEnd;
                    });

                    const nextBooking = roomBookingsForThisRoom
                      .filter(booking => {
                        const bookingDate = String(booking.date ?? '').slice(0, 10);
                        const todayDate = toDateKey(new Date());
                        if (bookingDate !== todayDate) return false;

                        const [startHour, startMinute] = booking.startTime.split(':').map(Number);
                        const bookingStart = new Date();
                        bookingStart.setHours(startHour, startMinute, 0);

                        return bookingStart > new Date();
                      })
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

                    // Calculate occupancy rate
                    const occupancyRate = timeSlots.length 
                      ? roomBookingsForThisRoom.length / timeSlots.length * 100 
                      : 0;

                    return (
                      <div key={room.id} className="overflow-hidden rounded-2xl border border-cp-divider bg-white p-3 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]">
                        <div className="relative">
                          <img
                            src={room.imageUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"}
                            alt={room.name}
                            className="h-44 w-full rounded-xl object-cover"
                          />
                          <StatusBadge
                            label={isCurrentlyBooked ? "Ocupada" : "Disponível"}
                            tone={isCurrentlyBooked ? "danger" : "success"}
                            className="absolute right-3 top-3 bg-white/95 shadow-sm"
                          />
                        </div>
                        <div className="px-3 pb-2 pt-4">
                          <h3 className="text-[20px] font-semibold text-cp-ink">{room.name}</h3>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px] text-cp-muted">
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {room.capacity} pessoas
                            </span>
                            <span />
                            <span className="flex items-center gap-2">
                              <SquareUser className="h-4 w-4" />
                              {room.squareMeters}m²
                            </span>
                            {room.hasAirConditioning ? (
                              <span className="flex items-center gap-2 justify-self-end">
                                <AirVent className="h-4 w-4" /> Ar-Condicionado
                              </span>
                            ) : <span />}
                            {room.hasWifi && (
                              <span className="flex items-center gap-2">
                                <Wifi className="h-4 w-4" /> Wi-Fi
                              </span>
                            )}
                          </div>
                          <div className="mt-4 text-[14px] text-cp-muted">
                            <p>
                              {nextBooking
                                ? `Próxima reserva: ${nextBooking.startTime} - ${nextBooking.endTime}`
                                : 'Sem reservas para hoje'}
                            </p>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-cp-divider">
                              <div
                                className={cn("h-1.5 rounded-full", isCurrentlyBooked ? "bg-cp-danger" : "bg-cp-sage")}
                                style={{ width: `${occupancyRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              data-testid={`button-reserve-room-${room.id}`}
                              className={cn(cpButton.primary, "flex-1")}
                              onClick={() => {
                                setSelectedRoom(room.id);
                                bookingForm.setValue('roomId', room.id.toString());
                                setIsBookingDialogOpen(true);
                              }}
                            >
                              Reservar
                            </button>
                            {isAdmin && (
                              <button
                                data-testid={`button-edit-room-${room.id}`}
                                className={cpButton.secondary}
                                onClick={() => openEditDialog(room)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-2xl border border-cp-divider bg-white py-12 text-center text-cp-muted">
                    <DoorOpen className="mx-auto mb-3 h-10 w-10 text-cp-sage" />
                    <h3 className="mb-2 text-lg font-medium text-cp-ink">Nenhuma sala cadastrada</h3>
                    {isAdmin && (
                      <>
                        <p className="mx-auto mb-6 max-w-md">
                          Adicione salas para começar a gerenciar os espaços no consultório.
                        </p>
                        <button type="button" onClick={() => setIsNewRoomDialogOpen(true)} className={cn(cpButton.primary, "mx-auto")}>
                          <Plus className="h-4 w-4" />
                          Adicionar Sala
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Calendário de Reservas */}
              <div className="rounded-2xl border border-cp-divider bg-white p-4 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[20px] font-semibold text-cp-ink">Calendário de Reservas</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-cp-muted" htmlFor="rooms-date">Data:</label>
                    <input
                      id="rooms-date"
                      type="date"
                      className="h-10 rounded-xl border border-cp-border bg-white px-3 text-sm text-cp-ink focus:outline-none focus:ring-2 focus:ring-cp-action"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="[&_tr]:border-0">
                      <TableRow className="bg-cp-sand-soft hover:bg-cp-sand-soft">
                        <TableHead className="w-28 rounded-l-xl text-[14px] font-medium text-cp-ink">Horário</TableHead>
                        {rooms?.map((room, i) => (
                          <TableHead key={room.id} className={cn("text-[14px] font-medium text-cp-ink", i === rooms.length - 1 && "rounded-r-xl")}>{room.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeSlots.map((timeSlot) => (
                        <TableRow key={timeSlot} className="border-cp-divider hover:bg-cp-hover">
                          <TableCell className="font-medium text-cp-ink">{timeSlot}</TableCell>
                          {rooms?.map((room) => {
                            const booked = isRoomBooked(room.id, timeSlot);
                            const bookingInfo = getBookingInfo(room.id, timeSlot);

                            return (
                              <TableCell key={`${room.id}-${timeSlot}`}>
                                <span className={cn("inline-flex items-center gap-2 text-[14px]", booked ? "font-medium text-cp-lavender-ink" : "text-cp-muted")}>
                                  <span className={cn("h-3 w-3 rounded-full", booked ? "bg-cp-lavender-ink" : "bg-cp-sage")} aria-hidden="true" />
                                  {booked ? (bookingInfo?.psychologistName || 'Ocupada') : 'Disponível'}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}