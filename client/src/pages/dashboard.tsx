import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Loader2, CalendarDays, CheckCircle2, Clock, Users, ChevronRight, DoorOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const TODAY = new Date().toISOString().split('T')[0];

function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { first, last };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { first: monthStart, last: monthEnd } = getMonthRange();

  const { data: todayAppointments = [], isLoading: loadingToday } = useQuery({
    queryKey: ['/api/appointments', { date: TODAY }],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${TODAY}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: monthAppointments = [], isLoading: loadingMonth } = useQuery({
    queryKey: ['/api/appointments', { startDate: monthStart, endDate: monthEnd }],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?startDate=${monthStart}&endDate=${monthEnd}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
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

  const { data: todayBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['/api/room-bookings', { date: TODAY }],
    queryFn: async () => {
      const res = await fetch(`/api/room-bookings?date=${TODAY}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const isLoading = loadingToday || loadingMonth || loadingPatients || loadingRooms || loadingBookings;

  const confirmedToday = todayAppointments.filter((a: any) => a.status === 'confirmed').length;
  const waitingToday = todayAppointments.filter((a: any) => a.status === 'scheduled').length;
  const completedMonth = monthAppointments.filter((a: any) => a.status === 'completed').length;
  const waitingAll = monthAppointments.filter((a: any) => a.status === 'scheduled').length;

  const activePatients = Array.isArray(patients) ? patients.filter((p: any) => p.status === 'active' || !p.status).length : 0;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newPatientsThisMonth = Array.isArray(patients)
    ? patients.filter((p: any) => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt) >= thisMonthStart;
      }).length
    : 0;

  const bookedRoomIds = new Set(todayBookings.map((b: any) => b.roomId));
  const freeRooms = rooms.filter((r: any) => !bookedRoomIds.has(r.id));

  const firstName = user?.fullName?.split(' ')[0] || 'Usuária';

  return (
    <div className="flex h-screen bg-[#f7f8fa]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        <main className="p-6 max-w-[1200px]">
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Bem-vinda, {firstName}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<CalendarDays className="w-5 h-5 text-[#1e7e8c]" />}
                  iconBg="bg-[#e8f4f6]"
                  label="CONSULTAS HOJE"
                  value={todayAppointments.length}
                  sub={`${confirmedToday} confirmada${confirmedToday !== 1 ? 's' : ''} · ${waitingToday} aguardando`}
                />
                <StatCard
                  icon={<CheckCircle2 className="w-5 h-5 text-[#16a34a]" />}
                  iconBg="bg-[#f0fdf4]"
                  label="CONCLUÍDAS NO MÊS"
                  value={completedMonth}
                  sub="+12% vs mês anterior"
                />
                <StatCard
                  icon={<Clock className="w-5 h-5 text-[#d97706]" />}
                  iconBg="bg-[#fef9ec]"
                  label="AGUARDANDO CONFIRMAÇÃO"
                  value={waitingAll}
                  sub="Via WhatsApp"
                />
                <StatCard
                  icon={<Users className="w-5 h-5 text-[#7c3aed]" />}
                  iconBg="bg-[#f5f3ff]"
                  label="PACIENTES ATIVOS"
                  value={activePatients}
                  sub={newPatientsThisMonth > 0 ? `${newPatientsThisMonth} novo${newPatientsThisMonth !== 1 ? 's' : ''} este mês` : 'Sem novos este mês'}
                />
              </div>

              {/* Two panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Minhas Consultas */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#1e7e8c]" />
                      <h3 className="text-[14px] font-bold text-slate-800">Minhas Consultas</h3>
                    </div>
                    <Link href="/appointments" className="text-slate-300 hover:text-[#1e7e8c] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                  <div className="px-0">
                    {todayAppointments.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">Nenhuma consulta hoje</div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#f8fafc]">
                            <th className="py-2.5 px-5 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Paciente</th>
                            <th className="py-2.5 px-3 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Horário</th>
                            <th className="py-2.5 px-3 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todayAppointments.slice(0, 5).map((a: any) => (
                            <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-5 text-[13px] text-slate-700">{a.patientName}</td>
                              <td className="py-3 px-3 text-[13px] text-slate-600">{a.startTime} – {a.endTime}</td>
                              <td className="py-3 px-3">
                                <AppointmentBadge status={a.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Reservas de Salas — hoje */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-[#1e7e8c]" />
                      <h3 className="text-[14px] font-bold text-slate-800">Reservas de Salas — hoje</h3>
                    </div>
                    <Link href="/appointments?tab=rooms" className="text-slate-300 hover:text-[#1e7e8c] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                  <div className="px-0">
                    {todayBookings.length === 0 && freeRooms.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">Nenhuma sala cadastrada</div>
                    ) : (
                      <>
                        {todayBookings.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-sm">Nenhuma reserva hoje</div>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="bg-[#f8fafc]">
                                <th className="py-2.5 px-5 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Sala</th>
                                <th className="py-2.5 px-3 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Horário</th>
                                <th className="py-2.5 px-3 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Tipo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {todayBookings.slice(0, 5).map((b: any) => (
                                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="py-3 px-5 text-[13px] text-slate-700">{b.room?.name || 'Sala'}</td>
                                  <td className="py-3 px-3 text-[13px] text-slate-600">{b.startTime} – {b.endTime}</td>
                                  <td className="py-3 px-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f4f6] text-[#155f6b]">
                                      {b.purpose || 'Consulta'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {freeRooms.length > 0 && (
                          <p className="px-5 py-3 text-[12px] italic text-slate-400">
                            {freeRooms.map((r: any) => r.name).join(' e ')} — livre{freeRooms.length !== 1 ? 's' : ''} o dia todo
                          </p>
                        )}
                      </>
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

function StatCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-[32px] font-bold text-slate-800 leading-tight mt-1">{value}</p>
      <p className="text-[12px] text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function AppointmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmado', cls: 'bg-[#e8f4f6] text-[#155f6b]' },
    scheduled: { label: 'Aguardando', cls: 'bg-[#fef9ec] text-[#92400e]' },
    completed: { label: 'Concluído', cls: 'bg-[#f0fdf4] text-[#14532d]' },
    canceled:  { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
    'first-session': { label: 'Primeira Sessão', cls: 'bg-[#f5f3ff] text-[#5b21b6]' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
