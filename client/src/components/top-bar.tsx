import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { addDays } from "date-fns";
import { Bell, CalendarClock, ChevronDown, DoorOpen, LogOut, Search, Settings, UserCircle, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toDateKey } from "@/lib/time";

type AppointmentLite = { id: number; patientName: string; date: string; startTime: string; status: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/**
 * Dashboard top bar: global search (patients, today's appointments, rooms),
 * pending-confirmation bell and avatar menu. Every list comes from APIs that
 * already scope data by role (psychologists only see their own).
 */
export function TopBar({ todayAppointments = [] }: { todayAppointments?: AppointmentLite[] }) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: patients = [] } = useQuery<{ id: number; fullName: string; email?: string | null; cpf?: string | null }[]>({
    queryKey: ["/api/patients"],
    queryFn: () => getJson("/api/patients"),
  });
  const { data: rooms = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/rooms"],
    queryFn: () => getJson("/api/rooms"),
  });

  const today = toDateKey();
  const weekEnd = toDateKey(addDays(new Date(), 7));
  const { data: upcoming = [] } = useQuery<AppointmentLite[]>({
    queryKey: ["/api/appointments", { startDate: today, endDate: weekEnd }],
    queryFn: () => getJson(`/api/appointments?startDate=${today}&endDate=${weekEnd}`),
  });
  const pending = useMemo(
    () =>
      upcoming
        .filter((a) => a.status === "scheduled" || a.status === "pending-confirmation")
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [upcoming],
  );

  const go = (path: string) => {
    setSearchOpen(false);
    setLocation(path);
  };

  const initials = (user?.fullName ?? "U").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 flex-1 max-w-[560px] items-center gap-3 rounded-xl border border-cp-border bg-white/90 px-4 text-left text-[15px] text-cp-subtle shadow-sm hover:border-cp-border"
            aria-label="Buscar pacientes, consultas, salas"
          >
            <Search className="h-[18px] w-[18px] text-cp-muted" />
            Buscar pacientes, consultas, salas…
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Digite um nome..." />
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              {patients.length > 0 && (
                <CommandGroup heading="Pacientes">
                  {patients.slice(0, 50).map((p) => (
                    <CommandItem
                      key={`p${p.id}`}
                      value={`paciente ${p.fullName} ${p.email ?? ""} ${p.cpf ?? ""}`}
                      onSelect={() => go(`/patients/${p.id}/record`)}
                    >
                      <UserRound className="mr-2 h-4 w-4 text-cp-action" />
                      {p.fullName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {todayAppointments.length > 0 && (
                <CommandGroup heading="Consultas de hoje">
                  {todayAppointments.map((a) => (
                    <CommandItem
                      key={`a${a.id}`}
                      value={`consulta ${a.patientName} ${a.startTime}`}
                      onSelect={() => go("/appointments")}
                    >
                      <CalendarClock className="mr-2 h-4 w-4 text-cp-action" />
                      {a.startTime.slice(0, 5)} · {a.patientName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {rooms.length > 0 && (
                <CommandGroup heading="Salas">
                  {rooms.map((r) => (
                    <CommandItem key={`r${r.id}`} value={`sala ${r.name}`} onSelect={() => go("/appointments?tab=rooms")}>
                      <DoorOpen className="mr-2 h-4 w-4 text-cp-action" />
                      {r.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        {/* Bell: appointments waiting for confirmation in the next 7 days */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/70"
              aria-label={`Notificações${pending.length ? `: ${pending.length} aguardando confirmação` : ""}`}
            >
              <Bell className="h-5 w-5 text-cp-ink" />
              {pending.length > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-cp-bg bg-cp-warning" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-cp-divider px-4 py-3">
              <p className="text-sm font-semibold text-cp-ink">Aguardando confirmação</p>
              <p className="text-xs text-cp-muted">Próximos 7 dias</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {pending.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-cp-subtle">Nenhuma pendência.</p>
              ) : (
                pending.slice(0, 10).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setLocation("/appointments")}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-cp-hover"
                  >
                    <span className="truncate text-sm text-cp-ink">{a.patientName}</span>
                    <span className="shrink-0 text-xs text-cp-muted">
                      {a.date.slice(8, 10)}/{a.date.slice(5, 7)} · {a.startTime.slice(0, 5)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setLocation("/appointments")}
              className="w-full border-t border-cp-divider px-4 py-2.5 text-sm font-medium text-cp-action hover:bg-cp-hover"
            >
              Ver agendamentos
            </button>
          </PopoverContent>
        </Popover>

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 rounded-full p-1 hover:bg-white/70" aria-label="Menu do usuário">
              <Avatar className="h-10 w-10 border border-cp-divider">
                <AvatarImage src={user?.profileImage || undefined} alt={user?.fullName || "Usuário"} />
                <AvatarFallback showPsychologySymbol={false} className="bg-cp-action text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-cp-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setLocation("/profile")}>
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            {user?.role === "psychologist" && (
              <DropdownMenuItem onClick={() => setLocation("/perfil")}>
                <UserCircle className="mr-2 h-4 w-4" /> Meu perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
