import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Loader2, Plus, Wifi, AirVent, Users, SquareUser } from "lucide-react";

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
  const { toast } = useToast();
  const [isNewRoomDialogOpen, setIsNewRoomDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  // Room booking form
  const bookingForm = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingFormSchema),
    defaultValues: {
      roomId: "",
      psychologistId: "",
      date: new Date().toISOString().split('T')[0],
      startTime: "09:00",
      endTime: "10:00",
      purpose: "",
    }
  });

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
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Loading state
  const isLoading = isLoadingRooms || isLoadingPsychologists || isLoadingRoomBookings;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />

      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />

        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Rooms Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Gestão de Salas</h1>
              <p className="text-neutral-dark">Controle e agendamento de salas</p>
            </div>
            <div className="flex mt-4 md:mt-0 space-x-2">
              <Button 
                variant="outline" 
                className="flex items-center"
                onClick={() => setIsBookingDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Reservar Sala
              </Button>

              <Dialog open={isNewRoomDialogOpen} onOpenChange={setIsNewRoomDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Sala
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Sala</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para adicionar uma nova sala.
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...roomForm}>
                    <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={roomForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Sala</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Sala 01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={roomForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacidade</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Ex: 4" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={roomForm.control}
                          name="squareMeters"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Área (m²)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Ex: 15" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={roomForm.control}
                          name="hasWifi"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Wi-Fi</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={roomForm.control}
                          name="hasAirConditioning"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Ar-Condicionado</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={roomForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL da Imagem</FormLabel>
                            <FormControl>
                              <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button type="submit" disabled={createRoomMutation.isPending}>
                          {createRoomMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            "Adicionar Sala"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reservar Sala</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para reservar uma sala.
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...bookingForm}>
                    <form onSubmit={bookingForm.handleSubmit(onBookingSubmit)} className="space-y-4 mt-4">
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
                        render={({ field }) => {
                          // Encontrar o psicólogo correspondente ao usuário logado
                          const loggedPsychologist = psychologists?.find(
                            p => p.user?.username === user?.username
                          );

                          // Se o psicólogo logado foi encontrado e não há valor definido, define o valor do campo
                          if (loggedPsychologist && !field.value) {
                            setTimeout(() => {
                              field.onChange(loggedPsychologist.id.toString());
                            }, 0);
                          }
                          
                          // Se não há psicólogos no sistema mas o usuário é um psicólogo,
                          // vamos mostrar uma mensagem informativa
                          if ((!psychologists || psychologists.length === 0) && user?.role === 'psychologist') {
                            console.log("Nenhum registro de psicólogo encontrado para o usuário atual.");
                          }

                          // Se o usuário for um psicólogo
                          if (user?.role === 'psychologist') {
                            if (loggedPsychologist) {
                              // Se tiver um registro de psicólogo, mostramos o nome dele
                              return (
                                <FormItem>
                                  <FormLabel>Psicóloga</FormLabel>
                                  <div className="flex items-center border rounded-md p-2 bg-neutral-50">
                                    <SquareUser className="mr-2 h-4 w-4 text-neutral-500" />
                                    <span>{loggedPsychologist.user?.fullName || user.fullName}</span>
                                    <input 
                                      type="hidden" 
                                      name="psychologistId" 
                                      value={loggedPsychologist.id.toString()} 
                                    />
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            } else {
                              // Se for psicólogo mas não tiver registro ainda, mostramos uma mensagem
                              return (
                                <FormItem>
                                  <FormLabel>Psicóloga</FormLabel>
                                  <div className="text-amber-600 border border-amber-300 rounded-md p-3 bg-amber-50">
                                    <p>Para fazer reservas, seu registro de psicólogo precisa ser configurado.</p>
                                    <p className="text-sm mt-1">Entre em contato com o administrador do sistema.</p>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }
                          }

                          // Filtramos os psicólogos para não mostrar o usuário logado se for admin reservando para outros
                          const filteredPsychologists = psychologists?.filter(p => {
                            if (user?.role === 'admin') {
                              // Administradores podem ver todos os psicólogos
                              return true;
                            } else {
                              // Outros usuários não devem ver o psicólogo atualmente logado
                              return p.user?.username !== user?.username;
                            }
                          });

                          return (
                            <FormItem>
                              <FormLabel>Psicóloga</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || (loggedPsychologist?.id.toString() ?? '')}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma psicóloga" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredPsychologists?.map((psychologist) => (
                                    <SelectItem
                                      key={psychologist.id}
                                      value={psychologist.id.toString()}
                                    >
                                      {psychologist.user?.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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

                      <DialogFooter>
                        <Button type="submit" disabled={createBookingMutation.isPending}>
                          {createBookingMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Reservando...
                            </>
                          ) : (
                            "Reservar Sala"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
                      const todayDate = now.toISOString().split('T')[0];

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
                        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
                        const todayDate = new Date().toISOString().split('T')[0];
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
                      <div key={room.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="relative">
                          <img 
                            src={room.imageUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"} 
                            alt={room.name} 
                            className="w-full h-48 object-cover"
                          />
                          <div className={`absolute top-3 right-3 bg-white bg-opacity-90 px-2 py-1 rounded-md text-sm font-medium ${
                            isCurrentlyBooked ? 'text-error' : 'text-success'
                          }`}>
                            {isCurrentlyBooked ? 'Ocupada' : 'Disponível'}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-semibold text-neutral-darkest">{room.name}</h3>
                          <p className="text-neutral-dark text-sm mb-4">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {room.capacity} pessoas
                            </span>
                            <span className="flex items-center gap-1 mt-1">
                              <SquareUser className="h-4 w-4" />
                              {room.squareMeters}m²
                            </span>
                          </p>
                          <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-neutral-dark">
                              {room.hasWifi && (
                                <span className="flex items-center text-success mr-1">
                                  <Wifi className="h-4 w-4 mr-1" /> Wi-Fi
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-neutral-dark">
                              {room.hasAirConditioning && (
                                <span className="flex items-center text-success mr-1">
                                  <AirVent className="h-4 w-4 mr-1" /> Ar-Condicionado
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-neutral-dark">
                            <p>
                              {nextBooking 
                                ? `Próxima reserva: ${nextBooking.startTime} - ${nextBooking.endTime}` 
                                : 'Sem reservas para hoje'}
                            </p>
                            <div className="w-full bg-neutral-light rounded-full h-2 mt-2">
                              <div 
                                className={`${isCurrentlyBooked ? 'bg-error' : 'bg-success'} h-2 rounded-full`} 
                                style={{ width: `${occupancyRate}%` }}
                              ></div>
                            </div>
                          </div>
                          <button 
                            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm w-full mt-4"
                            onClick={() => {
                              setSelectedRoom(room.id);
                              bookingForm.setValue('roomId', room.id.toString());
                              setIsBookingDialogOpen(true);
                            }}
                          >
                            Reservar
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-12 text-neutral-dark">
                    <h3 className="text-lg font-medium mb-2">Nenhuma sala cadastrada</h3>
                    <p className="max-w-md mx-auto mb-6">
                      Adicione salas para começar a gerenciar os espaços no consultório.
                    </p>
                    <Button
                      onClick={() => setIsNewRoomDialogOpen(true)}
                      className="flex items-center mx-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Sala
                    </Button>
                  </div>
                )}
              </div>

              {/* Calendário de Reservas */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-darkest">Calendário de Reservas</h3>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-neutral-dark">Data:</label>
                    <input 
                      type="date" 
                      className="border border-neutral-light rounded-md p-2 text-sm"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Horário</TableHead>
                        {rooms?.map((room) => (
                          <TableHead key={room.id} className="text-center">{room.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeSlots.map((timeSlot) => (
                        <TableRow key={timeSlot}>
                          <TableCell className="font-medium">{timeSlot}</TableCell>
                          {rooms?.map((room) => {
                            const booked = isRoomBooked(room.id, timeSlot);
                            const bookingInfo = getBookingInfo(room.id, timeSlot);

                            return (
                              <TableCell key={`${room.id}-${timeSlot}`} className="text-center">
                                {booked ? (
                                  <div className="inline-block px-2 py-1 rounded-full text-xs bg-error bg-opacity-10 text-error">
                                    {bookingInfo?.psychologistName || 'Ocupada'}
                                  </div>
                                ) : (
                                  <div className="inline-block px-2 py-1 rounded-full text-xs bg-success bg-opacity-10 text-success">
                                    Disponível
                                  </div>
                                )}
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