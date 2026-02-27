import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimeSlot {
  hour: string;
  isAvailable: boolean;
  appointments: Array<{
    id: number;
    startTime: string;
    endTime: string;
    patientName: string;
    psychologistName?: string;
    roomName?: string;
    psychologistId: number;
    status: string;
  }>;
}

interface DailyHoursViewProps {
  date: Date;
  events: Array<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    patientName: string;
    psychologistId: number;
    psychologistName?: string;
    roomId: number;
    roomName?: string;
    status: string;
  }>;
  onTimeSlotClick?: (timeSlot: string, date: Date) => void;
  onAppointmentClick?: (appointmentId: number) => void;
}

export default function DailyHoursView({ 
  date, 
  events, 
  onTimeSlotClick,
  onAppointmentClick
}: DailyHoursViewProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Formatar data para exibição
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };
  
  useEffect(() => {
    // Gerar slots de hora das 07:00 às 22:00
    const slots: TimeSlot[] = [];
    
    // Criar array com todas as horas do dia (formato 24h)
    for (let hour = 7; hour <= 22; hour++) {
      const hourString = `${hour.toString().padStart(2, '0')}:00`;
      
      // Filtrar eventos para esta hora
      const hourEvents = events.filter(event => {
        const eventStartHour = event.startTime.split(':')[0];
        return parseInt(eventStartHour) === hour;
      });
      
      // Verificar disponibilidade (um slot está disponível se não houver eventos nele)
      const isAvailable = hourEvents.length === 0;
      
      slots.push({
        hour: hourString,
        isAvailable,
        appointments: hourEvents
      });
    }
    
    setTimeSlots(slots);
  }, [date, events]);
  
  // Obter informações de status visual
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { color: 'bg-blue-100 text-blue-800', label: 'Agendado' };
      case 'confirmed':
        return { color: 'bg-green-100 text-green-800', label: 'Confirmado' };
      case 'canceled':
        return { color: 'bg-red-100 text-red-800', label: 'Cancelado' };
      case 'completed':
        return { color: 'bg-purple-100 text-purple-800', label: 'Concluído' };
      case 'first-session':
        return { color: 'bg-amber-100 text-amber-800', label: '1ª Sessão' };
      case 'pending-confirmation':
        return { color: 'bg-orange-100 text-orange-800', label: 'Solicitação via WhatsApp' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };
  
  // Cor de destaque para cada psicólogo baseado no ID
  const getPsychologistColor = (psychologistId: number) => {
    const colors = [
      'border-blue-500',
      'border-green-500',
      'border-amber-500',
      'border-purple-500',
      'border-teal-500'
    ];
    
    return colors[psychologistId % colors.length];
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Horários para {formatDate(date)}</span>
        </CardTitle>
        
        {/* Legenda de status */}
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          <Badge className="bg-orange-100 text-orange-800">
            Solicitação via WhatsApp
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            Confirmado
          </Badge>
          <Badge className="bg-amber-100 text-amber-800">
            1ª Sessão
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timeSlots.map((slot) => (
            <div 
              key={slot.hour}
              className={cn(
                "border rounded-lg p-3 transition-colors",
                slot.isAvailable 
                  ? "border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer" 
                  : "border-gray-200 bg-white"
              )}
              onClick={() => {
                if (slot.isAvailable && onTimeSlotClick) {
                  onTimeSlotClick(slot.hour, date);
                }
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-900">{slot.hour}</h3>
                {slot.isAvailable ? (
                  <Badge variant="outline" className="bg-green-100 border-green-200 text-green-800">
                    Disponível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 border-red-200 text-red-800">
                    Ocupado
                  </Badge>
                )}
              </div>
              
              {/* Lista de compromissos neste horário */}
              {slot.appointments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {slot.appointments.map((appointment) => {
                    const statusInfo = getStatusInfo(appointment.status);
                    return (
                      <div 
                        key={appointment.id}
                        className={cn(
                          "p-2 rounded-md border-l-4 bg-white",
                          getPsychologistColor(appointment.psychologistId),
                          "cursor-pointer hover:bg-gray-50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAppointmentClick) {
                            onAppointmentClick(appointment.id);
                          }
                        }}
                      >
                        <div className="text-sm font-medium">
                          {appointment.startTime} - {appointment.endTime}
                        </div>
                        <div className="text-sm">{appointment.patientName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {appointment.psychologistName && (
                            <span className="block">Psicólogo: {appointment.psychologistName}</span>
                          )}
                          {appointment.roomName && (
                            <span className="block">Sala: {appointment.roomName}</span>
                          )}
                        </div>
                        <Badge className={cn("mt-1 text-xs", statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}