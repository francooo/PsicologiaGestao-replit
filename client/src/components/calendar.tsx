import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  events: Array<{
    id: number;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    patientName: string;
    psychologistId: number;
    psychologistName?: string;
    roomId: number;
    roomName?: string;
    status: string;
    colorClass?: string;
  }>;
  month?: number;
  year?: number;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (eventId: number) => void;
  colorMap?: Record<number, string>;
}

export default function Calendar({
  events,
  month: initialMonth,
  year: initialYear,
  onDateSelect,
  onEventClick,
  colorMap = {}
}: CalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth !== undefined ? initialMonth : today.getMonth());
  const [currentYear, setCurrentYear] = useState(initialYear !== undefined ? initialYear : today.getFullYear());

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Get the last day of the previous month
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const days = [];
    
    // Previous month's days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = 
        today.getDate() === day && 
        today.getMonth() === currentMonth && 
        today.getFullYear() === currentYear;
      
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday
      });
    }
    
    // Next month's days to fill the remaining cells
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextMonthDays = totalCells - days.length;
    
    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  };

  // Group events by date
  const groupEventsByDate = () => {
    const eventsByDate: Record<string, typeof events> = {};
    
    events.forEach(event => {
      const dateKey = event.date;
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });
    
    return eventsByDate;
  };

  const days = generateCalendarDays();
  const eventsByDate = groupEventsByDate();

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return eventsByDate[dateKey] || [];
  };

  // Get color class for a psychologist or based on status
  const getColorClass = (psychologistId: number, status?: string) => {
    // Prioridade para agendamentos via WhatsApp (pending-confirmation)
    if (status === 'pending-confirmation') {
      return 'calendar-event-pending';
    }
    
    if (colorMap[psychologistId]) {
      return colorMap[psychologistId];
    }
    
    // Default color classes
    const defaultColors = [
      "calendar-event-psych1",
      "calendar-event-psych2",
      "calendar-event-psych3"
    ];
    
    return defaultColors[psychologistId % defaultColors.length];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button 
            className="p-2 border border-neutral-light rounded-md text-neutral-dark hover:bg-neutral-lightest"
            onClick={previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-lg font-semibold text-neutral-darkest py-2">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button 
            className="p-2 border border-neutral-light rounded-md text-neutral-dark hover:bg-neutral-lightest"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1 border border-neutral-light rounded-md text-sm text-neutral-dark hover:bg-neutral-lightest"
            onClick={goToToday}
          >
            Hoje
          </button>
          <button className="px-3 py-1 border border-primary rounded-md text-sm text-primary bg-primary bg-opacity-5 hover:bg-opacity-10">
            Semana
          </button>
          <button className="px-3 py-1 border border-neutral-light rounded-md text-sm text-neutral-dark hover:bg-neutral-lightest">
            Mês
          </button>
        </div>
      </div>
      
      {/* Legenda para status de agendamentos */}
      <div className="flex flex-wrap gap-4 mb-4 ml-1 text-xs text-neutral-dark">
        <div className="flex items-center">
          <div className="w-3 h-3 mr-1 rounded bg-orange-500 bg-opacity-20 border-l-2 border-orange-500"></div>
          <span>Aguardando confirmação (WhatsApp)</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-neutral-light rounded-lg overflow-hidden">
        {/* Calendar headers */}
        {daysOfWeek.map((day, index) => (
          <div key={index} className="bg-neutral-lightest p-2 text-center text-sm font-semibold text-neutral-dark">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const eventsForDay = getEventsForDate(day.date);
          
          return (
            <div 
              key={index}
              className={cn(
                "bg-white p-2 calendar-day",
                !day.isCurrentMonth && "opacity-50",
                day.isToday && "bg-blue-50",
                "cursor-pointer hover:bg-blue-50"
              )}
              onClick={() => onDateSelect && onDateSelect(day.date)}
            >
              <div className={cn(
                "text-sm mb-2",
                day.isToday ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center" : "text-neutral-dark"
              )}>
                {day.day}
              </div>
              
              {eventsForDay.slice(0, 3).map((event) => (
                <div 
                  key={event.id}
                  className={cn(
                    "calendar-event p-1 mb-1 truncate",
                    event.colorClass || getColorClass(event.psychologistId, event.status)
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event.id);
                  }}
                >
                  {event.startTime} - {event.patientName}
                </div>
              ))}
              
              {eventsForDay.length > 3 && (
                <div className="text-xs text-neutral-dark text-center">
                  +{eventsForDay.length - 3} mais
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <style jsx>{`
        .calendar-day {
          min-height: 80px;
        }
        .calendar-event {
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .calendar-event-psych1 {
          background-color: rgba(45, 122, 169, 0.2);
          border-left: 3px solid #2D7AA9;
        }
        .calendar-event-psych2 {
          background-color: rgba(94, 182, 157, 0.2);
          border-left: 3px solid #5EB69D;
        }
        .calendar-event-psych3 {
          background-color: rgba(248, 180, 0, 0.2);
          border-left: 3px solid #F8B400;
        }
        .calendar-event-pending {
          background-color: rgba(249, 115, 22, 0.2);
          border-left: 3px solid #f97316;
        }
      `}</style>
    </div>
  );
}
