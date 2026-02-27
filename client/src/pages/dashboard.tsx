import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUp, ArrowDown, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fetch today's appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/appointments', { date: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${selectedDate}`);
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

  // Fetch rooms with bookings
  const { data: rooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
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

  // Fetch financial data (monthly summary)
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // Calculate financial summary
  const financialSummary = calculateFinancialSummary(transactions);



  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  const isLoading = isLoadingAppointments || isLoadingPsychologists || 
    isLoadingRooms || isLoadingRoomBookings || isLoadingTransactions;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Dashboard</h1>
              <p className="text-neutral-dark">Visão geral do consultório</p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <div className="relative mr-2">
                <input 
                  type="date" 
                  className="border border-neutral-light rounded-md p-2 text-sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm flex items-center">
                <i className="fas fa-file-export mr-2"></i> Exportar Relatório
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Dashboard Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Stat Card - Agendamentos */}
                <Card className="border-l-4 border-primary">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Agendamentos Hoje</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {appointments?.length || 0}
                        </h3>
                      </div>
                      <div className="rounded-full bg-primary-light/10 p-3">
                        <CheckCircle className="text-xl text-primary" />
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      <span>12% acima da média</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Stat Card - Psicólogas Ativas */}
                <Card className="border-l-4 border-secondary">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Psicólogas Ativas</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {psychologists?.filter(p => p.user?.status === 'active')?.length || 0}
                        </h3>
                      </div>
                      <div className="rounded-full bg-secondary-light/10 p-3">
                        <i className="fas fa-user-md text-xl text-secondary"></i>
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      <span>2 novas este mês</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Stat Card - Salas Ocupadas */}
                <Card className="border-l-4 border-accent">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Salas Ocupadas</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {roomBookings?.length || 0}/{rooms?.length || 0}
                        </h3>
                      </div>
                      <div className="rounded-full bg-accent-light/10 p-3">
                        <i className="fas fa-door-open text-xl text-accent"></i>
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-warning">
                      <i className="fas fa-circle mr-1"></i>
                      <span>
                        {rooms && roomBookings 
                          ? Math.round((roomBookings.length / rooms.length) * 100) 
                          : 0}% de ocupação
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Stat Card - Receita Mensal */}
                <Card className="border-l-4 border-success">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-neutral-dark text-sm">Receita Mensal</p>
                        <h3 className="text-2xl font-bold text-neutral-darkest">
                          {financialSummary.formattedIncome}
                        </h3>
                      </div>
                      <div className="rounded-full bg-success/10 p-3">
                        <i className="fas fa-chart-line text-xl text-success"></i>
                      </div>
                    </div>
                    <div className="mt-4 text-xs flex items-center text-success">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      <span>8% acima do mês anterior</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Dashboard Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Próximos Agendamentos */}
                <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-neutral-darkest">Próximos Agendamentos</h3>
                    <a href="/appointments" className="text-primary text-sm hover:underline">Ver todos</a>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-neutral-light">
                          <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Horário</th>
                          <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Paciente</th>
                          <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Psicóloga</th>
                          <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Sala</th>
                          <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments && appointments.length > 0 ? (
                          appointments.map((appointment) => (
                            <tr key={appointment.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                              <td className="py-3 text-sm font-medium text-neutral-darkest">
                                {appointment.startTime} - {appointment.endTime}
                              </td>
                              <td className="py-3 text-sm text-neutral-darkest">{appointment.patientName}</td>
                              <td className="py-3 text-sm text-neutral-darkest">
                                {appointment.psychologist?.user?.fullName || 'N/A'}
                              </td>
                              <td className="py-3 text-sm text-neutral-darkest">
                                {appointment.room?.name || 'N/A'}
                              </td>
                              <td className="py-3 text-sm">
                                <StatusBadge status={appointment.status} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-neutral-dark">
                              Não há agendamentos para hoje.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Disponibilidade de Salas */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-neutral-darkest">Disponibilidade de Salas</h3>
                    <a href="/rooms" className="text-primary text-sm hover:underline">Gerenciar</a>
                  </div>
                  
                  <div className="space-y-4">
                    {rooms && rooms.length > 0 ? (
                      rooms.map((room) => {
                        const roomBookingsForThisRoom = roomBookings?.filter(
                          booking => booking.roomId === room.id
                        ) || [];
                        
                        const isRoomAvailableNow = !isRoomCurrentlyBooked(
                          roomBookingsForThisRoom, 
                          new Date()
                        );
                        
                        const nextBooking = getNextBooking(
                          roomBookingsForThisRoom, 
                          new Date()
                        );
                        
                        const occupancyRate = rooms.length 
                          ? (roomBookingsForThisRoom.length / 8) * 100 // Assuming 8 slots per day
                          : 0;
                        
                        return (
                          <div key={room.id} className="p-3 border border-neutral-light rounded-lg">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-neutral-darkest">{room.name}</h4>
                              {isRoomAvailableNow ? (
                                <span className="px-2 py-1 rounded-full text-xs bg-success bg-opacity-10 text-success">
                                  Disponível
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs bg-error bg-opacity-10 text-error">
                                  Ocupada
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-neutral-dark">
                              <p>
                                {nextBooking 
                                  ? `Próxima reserva: ${nextBooking.startTime} - ${nextBooking.endTime}` 
                                  : 'Sem reservas para hoje'}
                              </p>
                              <div className="w-full bg-neutral-light rounded-full h-2 mt-2">
                                <div 
                                  className={`${isRoomAvailableNow ? 'bg-success' : 'bg-error'} h-2 rounded-full`} 
                                  style={{ width: `${occupancyRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-neutral-dark">
                        Não há salas cadastradas.
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Helper function to check if a room is currently booked
function isRoomCurrentlyBooked(bookings, currentTime) {
  if (!bookings || bookings.length === 0) return false;
  
  return bookings.some(booking => {
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    const currentDate = currentTime.toISOString().split('T')[0];
    
    if (bookingDate !== currentDate) return false;
    
    const [startHour, startMinute] = booking.startTime.split(':').map(Number);
    const [endHour, endMinute] = booking.endTime.split(':').map(Number);
    
    const bookingStart = new Date(currentTime);
    bookingStart.setHours(startHour, startMinute, 0);
    
    const bookingEnd = new Date(currentTime);
    bookingEnd.setHours(endHour, endMinute, 0);
    
    return currentTime >= bookingStart && currentTime < bookingEnd;
  });
}

// Helper function to get the next booking for a room
function getNextBooking(bookings, currentTime) {
  if (!bookings || bookings.length === 0) return null;
  
  const currentDate = currentTime.toISOString().split('T')[0];
  
  // Filter bookings for today and in the future
  const todayFutureBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    if (bookingDate !== currentDate) return false;
    
    const [startHour, startMinute] = booking.startTime.split(':').map(Number);
    const bookingStart = new Date(currentTime);
    bookingStart.setHours(startHour, startMinute, 0);
    
    return bookingStart > currentTime;
  });
  
  // Sort by start time
  todayFutureBookings.sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
  
  return todayFutureBookings[0] || null;
}

// Helper function to calculate financial summary
function calculateFinancialSummary(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      income: 0,
      expenses: 0,
      profit: 0,
      formattedIncome: 'R$ 0,00',
      formattedExpenses: 'R$ 0,00',
      formattedProfit: 'R$ 0,00'
    };
  }
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Filter transactions for current month
  const currentMonthTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === currentMonth && 
      transactionDate.getFullYear() === currentYear
    );
  });
  
  // Calculate totals
  const income = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const expenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const profit = income - expenses;
  
  // Format for display
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  
  return {
    income,
    expenses,
    profit,
    formattedIncome: formatter.format(income),
    formattedExpenses: formatter.format(expenses),
    formattedProfit: formatter.format(profit)
  };
}

// Status badge component
function StatusBadge({ status }) {
  let bgColor = 'bg-info bg-opacity-10 text-info';
  
  switch(status) {
    case 'confirmed':
      bgColor = 'bg-success bg-opacity-10 text-success';
      break;
    case 'scheduled':
      bgColor = 'bg-warning bg-opacity-10 text-warning';
      break;
    case 'canceled':
      bgColor = 'bg-error bg-opacity-10 text-error';
      break;
    case 'completed':
      bgColor = 'bg-primary bg-opacity-10 text-primary';
      break;
    default:
      bgColor = 'bg-info bg-opacity-10 text-info';
  }
  
  const statusText = {
    confirmed: 'Confirmado',
    scheduled: 'Agendado',
    canceled: 'Cancelado',
    completed: 'Concluído',
    'first-session': 'Primeira Sessão'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${bgColor}`}>
      {statusText[status] || status}
    </span>
  );
}
