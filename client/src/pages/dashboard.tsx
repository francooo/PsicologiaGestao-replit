import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { addDays, endOfMonth, format, isToday, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Loader2,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { TopBar } from "@/components/top-bar";
import { LeafDecor } from "@/components/brand/leaf-decor";
import { MetricCard } from "@/components/cp/MetricCard";
import { useAuth } from "@/hooks/use-auth";
import { overlaps, timeToMinutes, toDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

type Appointment = {
  id: number;
  patientName: string;
  psychologistId: number;
  roomId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  room?: { id: number; name: string } | null;
  psychologist?: { id: number; userId: number; user?: { fullName: string } | null } | null;
};
type RoomBooking = {
  id: number;
  roomId: number;
  psychologistId: number;
  startTime: string;
  endTime: string;
  room?: { name: string } | null;
  psychologist?: { userId: number; user?: { fullName: string } | null } | null;
};
type Room = { id: number; name: string };
type Patient = { id: number; status?: string | null; createdAt?: string | null };
type Psychologist = { id: number; userId: number; user?: { fullName: string } | null };

// Free slots in the agenda: whole hours from 08:00 to 18:00
const FIRST_HOUR = 8;
const LAST_HOUR = 18;
const MAX_AGENDA_ITEMS = 8;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function qs(params: Record<string, string | number | null | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "");
  return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}` : "";
}

const statusBadge: Record<string, { label: string; cls: string; dot: string; row: string }> = {
  confirmed: { label: "Confirmada", cls: "bg-cp-sage-soft text-cp-sage-ink", dot: "bg-cp-sage", row: "bg-cp-sage-soft" },
  scheduled: { label: "Pendente", cls: "bg-cp-sand-soft text-cp-sand-ink", dot: "bg-cp-lavender-ink", row: "bg-cp-lavender-soft" },
  "pending-confirmation": { label: "Pendente", cls: "bg-cp-sand-soft text-cp-sand-ink", dot: "bg-cp-lavender-ink", row: "bg-cp-lavender-soft" },
  completed: { label: "Concluída", cls: "bg-cp-action-soft text-cp-action", dot: "bg-cp-action", row: "bg-cp-action-soft" },
  canceled: { label: "Cancelada", cls: "bg-cp-hover text-cp-muted", dot: "bg-cp-border", row: "bg-cp-hover" },
  "first-session": { label: "1ª sessão", cls: "bg-cp-lavender-soft text-cp-lavender-ink", dot: "bg-cp-lavender-ink", row: "bg-cp-lavender-soft" },
};
const badgeFor = (s: string) => statusBadge[s] ?? { label: s, cls: "bg-cp-hover text-cp-muted", dot: "bg-cp-border", row: "bg-cp-hover" };

/** "segunda-feira, 12 de outubro de 2026" -> "Segunda-feira, 12 de outubro de 2026" */
function longDate(date: Date) {
  const text = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  // Admin and reception see the whole clinic (API returns everything); psychologists only their own
  const isStaff = user?.role === "admin" || user?.role === "receptionist";

  const now = new Date();
  const today = toDateKey(now);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [psychologistId, setPsychologistId] = useState<number | null>(null);
  const selectedKey = toDateKey(selectedDate);
  const psychFilter = isStaff ? psychologistId : null;

  const monthRange = { startDate: toDateKey(startOfMonth(now)), endDate: toDateKey(endOfMonth(now)) };
  const prev = subMonths(now, 1);
  const prevRange = { startDate: toDateKey(startOfMonth(prev)), endDate: toDateKey(endOfMonth(prev)) };

  const appts = (params: Record<string, string | number | null | undefined>) => ({
    queryKey: ["/api/appointments", params],
    queryFn: () => getJson<Appointment[]>(`/api/appointments${qs(params)}`),
  });

  const todayQ = useQuery(appts({ date: today, psychologistId: psychFilter }));
  const dayQ = useQuery(appts({ date: selectedKey, psychologistId: psychFilter }));
  const monthQ = useQuery(appts({ ...monthRange, psychologistId: psychFilter }));
  const prevQ = useQuery(appts({ ...prevRange, psychologistId: psychFilter }));
  const patientsQ = useQuery({ queryKey: ["/api/patients"], queryFn: () => getJson<Patient[]>("/api/patients") });
  const roomsQ = useQuery({ queryKey: ["/api/rooms"], queryFn: () => getJson<Room[]>("/api/rooms") });
  const bookingsQ = useQuery({
    queryKey: ["/api/room-bookings", { date: today }],
    queryFn: () => getJson<RoomBooking[]>(`/api/room-bookings?date=${today}`),
  });
  const psychologistsQ = useQuery({
    queryKey: ["/api/psychologists"],
    queryFn: () => getJson<Psychologist[]>("/api/psychologists"),
  });

  const isLoading = [todayQ, monthQ, patientsQ, roomsQ, bookingsQ].some((q) => q.isLoading);

  const todayList = todayQ.data ?? [];
  const monthList = monthQ.data ?? [];
  const patients = patientsQ.data ?? [];
  const rooms = roomsQ.data ?? [];
  const bookings = bookingsQ.data ?? [];

  // ── Stats ──
  const confirmedToday = todayList.filter((a) => a.status === "confirmed").length;
  const pendingToday = todayList.filter((a) => a.status === "scheduled" || a.status === "pending-confirmation").length;
  const completedMonth = monthList.filter((a) => a.status === "completed").length;
  const completedPrev = (prevQ.data ?? []).filter((a) => a.status === "completed").length;
  const variation = completedPrev > 0 ? Math.round(((completedMonth - completedPrev) / completedPrev) * 100) : null;
  const waitingAll = monthList.filter((a) => a.status === "scheduled" || a.status === "pending-confirmation").length;
  const activePatients = patients.filter((p) => p.status === "active" || !p.status).length;
  const monthStart = startOfMonth(now);
  const newPatients = patients.filter((p) => p.createdAt && new Date(p.createdAt) >= monthStart).length;

  // ── Rooms: occupied right now / next booking today ──
  const nowHm = format(now, "HH:mm");
  const roomStatus = rooms.map((room) => {
    const list = bookings.filter((b) => b.roomId === room.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const current = list.find((b) => b.startTime.slice(0, 5) <= nowHm && b.endTime.slice(0, 5) > nowHm);
    const next = current ?? list.find((b) => b.endTime.slice(0, 5) > nowHm);
    return { room, current, next };
  });
  const freeRooms = roomStatus.filter((r) => !r.current).length;

  // ── Agenda: appointments + free whole hours (only for a single psychologist's agenda) ──
  const showFreeSlots = !isStaff || psychFilter !== null;
  const agenda = useMemo(() => {
    const dayAppts = [...(dayQ.data ?? [])]
      .filter((a) => a.status !== "canceled")
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    type Item = { kind: "appt"; time: string; appt: Appointment } | { kind: "free"; time: string };
    const items: Item[] = dayAppts.map((a) => ({ kind: "appt", time: a.startTime.slice(0, 5), appt: a }));
    if (showFreeSlots) {
      const viewingToday = isToday(selectedDate);
      const nowMin = timeToMinutes(format(new Date(), "HH:mm"));
      for (let h = FIRST_HOUR; h < LAST_HOUR; h++) {
        const start = `${String(h).padStart(2, "0")}:00`;
        const end = `${String(h + 1).padStart(2, "0")}:00`;
        if (viewingToday && timeToMinutes(end) <= nowMin) continue; // past hour
        if (dayAppts.some((a) => overlaps(start, end, a.startTime, a.endTime))) continue;
        items.push({ kind: "free", time: start });
      }
    }
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [dayQ.data, showFreeSlots, selectedDate]);

  const scheduleLink = (time?: string) =>
    `/appointments${qs({ new: 1, date: selectedKey, time, psychologistId: psychFilter })}`;

  const rawFirst = user?.fullName?.trim().split(/\s+/)[0] ?? "";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />
      <div className="relative flex-1 overflow-y-auto pt-16 md:ml-64 md:pt-0">
        <MobileNav />
        <LeafDecor />

        <main className="relative mx-auto max-w-[1400px] px-4 pt-5 pb-24 sm:px-6 md:pb-8 lg:px-8">
          <TopBar todayAppointments={todayList} />


          {/* Greeting */}
          <div className="mt-8 flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-cp-ink sm:text-[40px]">
                {greeting(now)}{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-1 text-lg text-cp-muted">{longDate(now)}</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="h-0.5 w-14 rounded bg-cp-sage" />
                <span className="text-[15px] text-cp-muted">Mais tempo para o que importa</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isStaff && (
                <select
                  aria-label="Filtrar por psicóloga"
                  value={psychologistId ?? ""}
                  onChange={(e) => setPsychologistId(e.target.value ? Number(e.target.value) : null)}
                  className="h-12 rounded-xl border border-cp-border bg-white px-3 text-[15px] text-cp-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-cp-action"
                >
                  <option value="">Todas as psicólogas</option>
                  {(psychologistsQ.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user?.fullName ?? `Psicóloga #${p.id}`}
                    </option>
                  ))}
                </select>
              )}
              <Link
                href={scheduleLink()}
                className="flex h-12 items-center gap-2 rounded-xl bg-cp-action px-6 text-[16px] font-medium text-white shadow-sm transition-colors hover:bg-cp-action-hover"
              >
                <Plus className="h-5 w-5" />
                Nova consulta
              </Link>
              {/* Brand phrase (wide screens only, like the mock) */}
              <div aria-hidden="true" className="ml-6 hidden 2xl:block">
                <p className="text-[11px] uppercase leading-6 tracking-[0.45em] text-cp-subtle">Organização</p>
                <p className="text-[11px] uppercase leading-6 tracking-[0.45em] text-cp-subtle">também cuida</p>
                <div className="mt-2 h-px w-10 bg-cp-sage" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={<CalendarDays className="h-6 w-6 text-cp-sage-ink" />}
                  tint="bg-cp-sage-soft"
                  label="Consultas hoje"
                  value={todayList.length}
                  sub={`${confirmedToday} confirmada${confirmedToday !== 1 ? "s" : ""} · ${pendingToday} pendente${pendingToday !== 1 ? "s" : ""}`}
                />
                <MetricCard
                  icon={<CheckCircle2 className="h-6 w-6 text-cp-lavender-ink" />}
                  tint="bg-cp-lavender-soft"
                  label="Concluídas no mês"
                  value={completedMonth}
                  sub={
                    variation === null ? (
                      "— vs. mês anterior"
                    ) : (
                      <span className={variation >= 0 ? "text-cp-success" : "text-cp-danger"}>
                        {variation >= 0 ? "+" : ""}
                        {variation}% vs. mês anterior
                      </span>
                    )
                  }
                />
                <MetricCard
                  icon={<Clock className="h-6 w-6 text-cp-sand-ink" />}
                  tint="bg-cp-sand-soft"
                  label="Aguardando confirmação"
                  value={waitingAll}
                  sub="Via WhatsApp"
                />
                <MetricCard
                  icon={<Users className="h-6 w-6 text-cp-lavender-ink" />}
                  tint="bg-cp-lavender-soft"
                  label="Pacientes ativos"
                  value={activePatients}
                  sub={newPatients > 0 ? `${newPatients} novo${newPatients !== 1 ? "s" : ""} este mês` : "Sem novos este mês"}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                {/* Agenda */}
                <section className="rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-18px_rgba(31,51,71,0.18)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cp-divider px-6 py-5">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-6 w-6 text-cp-sage" />
                      <h2 className="text-[22px] font-semibold text-cp-ink">{isToday(selectedDate) ? "Agenda de hoje" : "Agenda do dia"}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cp-muted">{longDate(selectedDate)}</span>
                      <button
                        type="button"
                        aria-label="Dia anterior"
                        onClick={() => setSelectedDate((d) => addDays(d, -1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-cp-divider hover:bg-cp-hover"
                      >
                        <ChevronLeft className="h-4 w-4 text-cp-ink" />
                      </button>
                      <button
                        type="button"
                        aria-label="Próximo dia"
                        onClick={() => setSelectedDate((d) => addDays(d, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-cp-divider hover:bg-cp-hover"
                      >
                        <ChevronRight className="h-4 w-4 text-cp-ink" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-4 sm:px-6">
                    {dayQ.isLoading ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-cp-action" />
                      </div>
                    ) : agenda.length === 0 ? (
                      <p className="py-10 text-center text-sm text-cp-subtle">
                        {isStaff && psychFilter === null
                          ? "Nenhuma consulta neste dia. Escolha uma psicóloga para ver os horários livres."
                          : "Nenhuma consulta neste dia."}
                      </p>
                    ) : (
                      <ol className="space-y-2.5">
                        {agenda.slice(0, MAX_AGENDA_ITEMS).map((item) => {
                          if (item.kind === "free") {
                            return (
                              <li key={`free-${item.time}`} className="grid grid-cols-[52px_20px_1fr] items-center gap-3">
                                <span className="text-[15px] font-medium text-cp-ink">{item.time}</span>
                                <TimelineDot className="bg-cp-border" />
                                <div className="flex items-center gap-3 rounded-xl bg-cp-hover px-4 py-3">
                                  <Clock className="h-5 w-5 shrink-0 text-cp-subtle" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-medium text-cp-ink">Horário disponível</p>
                                    <p className="text-[13px] text-cp-subtle">Agende uma consulta</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setLocation(scheduleLink(item.time))}
                                    className="rounded-xl border border-cp-border bg-white px-4 py-1.5 text-sm font-medium text-cp-ink hover:bg-cp-hover"
                                  >
                                    Agendar
                                  </button>
                                </div>
                              </li>
                            );
                          }
                          const a = item.appt;
                          const b = badgeFor(a.status);
                          const detail = [
                            a.room?.name ?? (a.roomId === 0 ? "Online" : "Consulta"),
                            isStaff ? a.psychologist?.user?.fullName : null,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <li key={a.id} className="grid grid-cols-[52px_20px_1fr] items-center gap-3">
                              <span className="text-[15px] font-medium text-cp-ink">{item.time}</span>
                              <TimelineDot className={b.dot} />
                              <Link
                                href="/appointments"
                                className={cn("flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-90", b.row)}
                              >
                                <UserRound className="h-5 w-5 shrink-0 text-cp-sage-ink" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-medium text-cp-ink">{a.patientName}</p>
                                  <p className="truncate text-[13px] text-cp-muted">{detail}</p>
                                </div>
                                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", b.cls)}>{b.label}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-cp-subtle" />
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    <div className="mt-4 text-center">
                      <Link href="/appointments" className="inline-flex items-center gap-2 text-[15px] font-medium text-cp-action hover:underline">
                        Ver agenda completa <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  {/* Day summary */}
                  <section className="rounded-2xl border border-cp-divider bg-white px-6 py-5 shadow-[0_10px_40px_-18px_rgba(31,51,71,0.18)]">
                    <div className="mb-3 flex items-center gap-3 border-b border-cp-divider pb-4">
                      <BarChart3 className="h-6 w-6 text-cp-sage" />
                      <h2 className="text-[22px] font-semibold text-cp-ink">Resumo do dia</h2>
                    </div>
                    <SummaryRow
                      tint="bg-cp-lavender-soft"
                      icon={<Users className="h-5 w-5 text-cp-lavender-ink" />}
                      title={`${activePatients} paciente${activePatients !== 1 ? "s" : ""} ativo${activePatients !== 1 ? "s" : ""}`}
                      sub={newPatients > 0 ? `${newPatients} novo${newPatients !== 1 ? "s" : ""} este mês` : "Sem novos este mês"}
                    />
                    <SummaryRow
                      tint="bg-cp-sage-soft"
                      icon={<DoorOpen className="h-5 w-5 text-cp-sage-ink" />}
                      title={`${freeRooms} sala${freeRooms !== 1 ? "s" : ""} disponíve${freeRooms !== 1 ? "is" : "l"}`}
                      sub={`De ${rooms.length} sala${rooms.length !== 1 ? "s" : ""} totais`}
                    />
                    <SummaryRow
                      tint="bg-cp-sand-soft"
                      icon={<Clock className="h-5 w-5 text-cp-sand-ink" />}
                      title={`${waitingAll} confirmaç${waitingAll !== 1 ? "ões pendentes" : "ão pendente"}`}
                      sub="Via WhatsApp"
                    />
                  </section>

                  {/* Room bookings today */}
                  <section className="rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-18px_rgba(31,51,71,0.18)]">
                    <Link href="/appointments?tab=rooms" className="flex items-center justify-between border-b border-cp-divider px-6 py-4 hover:bg-cp-bg">
                      <span className="flex items-center gap-3">
                        <DoorOpen className="h-6 w-6 text-cp-sage" />
                        <span className="text-[20px] font-semibold text-cp-ink">Reservas de salas — hoje</span>
                      </span>
                      <ChevronRight className="h-5 w-5 text-cp-subtle" />
                    </Link>
                    {roomStatus.length === 0 ? (
                      <p className="px-6 py-8 text-center text-sm text-cp-subtle">Nenhuma sala cadastrada</p>
                    ) : (
                      <ul>
                        {roomStatus.map(({ room, current, next }, i) => {
                          const booking = current ?? next;
                          // Psychologists don't see who else booked; their own bookings show as "Você"
                          const mine = booking?.psychologist?.userId === user?.id;
                          const who = booking ? (isStaff ? booking.psychologist?.user?.fullName : mine ? "Você" : null) : null;
                          return (
                            <li key={room.id} className={cn("flex items-center gap-3 px-6 py-3", i > 0 && "border-t border-cp-divider")}>
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cp-sand-soft">
                                <DoorOpen className="h-[18px] w-[18px] text-cp-sand-ink" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-medium text-cp-ink">{room.name}</p>
                                <p className="truncate text-[13px] text-cp-muted">
                                  {booking
                                    ? `${booking.startTime.slice(0, 5)} – ${booking.endTime.slice(0, 5)}${who ? ` · ${who}` : ""}`
                                    : "Sem reservas hoje"}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-3 py-1 text-xs font-medium",
                                  current ? "bg-cp-lavender-soft text-cp-lavender-ink" : "bg-cp-sage-soft text-cp-sage-ink",
                                )}
                              >
                                {current ? "Ocupada" : "Disponível"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function TimelineDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-full items-center justify-center">
      <span className="absolute inset-y-[-8px] left-1/2 w-px -translate-x-1/2 border-l border-dashed border-cp-border" />
      <span className={cn("relative h-3 w-3 rounded-full ring-4 ring-white", className)} />
    </span>
  );
}

function SummaryRow({ tint, icon, title, sub }: { tint: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tint)}>{icon}</div>
      <div>
        <p className="text-[16px] font-medium text-cp-ink">{title}</p>
        <p className="text-[13px] text-cp-muted">{sub}</p>
      </div>
    </div>
  );
}
