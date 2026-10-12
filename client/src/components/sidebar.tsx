import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  CalendarDays,
  Users,
  DoorOpen,
  BarChart3,
  Lock,
  Settings,
  LogOut,
  UserCircle,
  LineChart,
  FileText,
  ClipboardList,
  ContactRound,
  ChevronDown,
  CalendarCheck2,
  BookOpen,
  Video,
  HandCoins,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const searchString = useSearch();
  const [agendamentosOpen, setAgendamentosOpen] = useState(false);

  const { data: meetings = [] } = useQuery<Array<{ status: string }>>({
    queryKey: ["/api/meetings"],
    queryFn: async () => {
      const res = await fetch("/api/meetings");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!(user),
  });
  const hasActiveMeeting = meetings.some((m) => m.status === "active");

  const isAppointmentsPath = location === '/appointments' || location.startsWith('/appointments');

  useEffect(() => {
    if (isAppointmentsPath) setAgendamentosOpen(true);
  }, [isAppointmentsPath]);

  const isActive = (path: string) => location === path;
  const isActiveTab = (tab: string) => {
    if (!isAppointmentsPath) return false;
    const params = new URLSearchParams(searchString);
    const currentTab = params.get('tab') || 'consultas';
    return currentTab === tab;
  };

  const handleLogout = () => logoutMutation.mutate();

  const userRole = user?.role || "";

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case "admin": return "Admin";
      case "psychologist": return "Psicóloga";
      case "receptionist": return "Recepção";
      default: return role || "Usuário";
    }
  };

  const mainItems = [
    {
      name: "Pacientes",
      icon: <ContactRound className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/patients",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Psicólogas",
      icon: <Users className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/admin/psicologas",
      roles: ["admin"],
    },
    {
      name: "Salas",
      icon: <DoorOpen className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/rooms",
      roles: ["admin"],
    },
  ];

  const financialItems = [
    {
      name: "Financeiro",
      icon: <BarChart3 className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/financial",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Fluxo de Caixa",
      icon: <LineChart className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/cash-flow",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Minhas Notas Fiscais",
      icon: <FileText className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/invoices",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Gestão de Notas",
      icon: <ClipboardList className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/admin/invoices",
      roles: ["admin"],
    },
    {
      name: "Comissões",
      icon: <HandCoins className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/admin/comissoes",
      roles: ["admin"],
    },
  ];

  const systemItems = [
    {
      name: "Permissões",
      icon: <Lock className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/permissions",
      roles: ["admin"],
    },
    {
      name: "Meu Perfil",
      icon: <UserCircle className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/perfil",
      roles: ["psychologist"],
    },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />,
      href: "/profile",
      roles: ["admin", "psychologist", "receptionist"],
    },
  ];

  const visibleMain = mainItems.filter(i => i.roles.includes(userRole));
  const visibleFinancial = financialItems.filter(i => i.roles.includes(userRole));
  const visibleSystem = systemItems.filter(i => i.roles.includes(userRole));

  // "Acolhimento" look: active item on soft sage, navy text
  const navLinkClass = (active: boolean) => cn(
    "flex items-center rounded-xl px-3 py-2.5 mb-0.5 text-[14px] font-medium text-[#3D4B5C] hover:bg-[#F4EFE8] transition-colors",
    active && "bg-[#DCE2D3]/70 text-[#1F3347] hover:bg-[#DCE2D3]/70"
  );

  return (
    // Same fixed w-64 slot as before (pages keep md:ml-64); the floating card lives inside it
    <aside className="hidden md:block w-64 h-screen fixed left-0 top-0 z-20 bg-[#FAF6F1] p-3">
      <div className="flex h-full flex-col overflow-y-auto rounded-2xl bg-white shadow-[0_10px_40px_-14px_rgba(31,51,71,0.18)]">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <BrandLogo size="sm" />
      </div>

      {/* User */}
      <div className="mx-3 px-2 pb-4 border-b border-[#ECE8E3]">
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11 border border-[#ECE8E3] bg-[#2E729B] text-white">
            <AvatarImage src={user?.profileImage || undefined} alt={user?.fullName || "Usuário"} />
            <AvatarFallback showPsychologySymbol={false} className="text-sm font-semibold bg-primary text-white">
              {user?.fullName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[14px] font-semibold text-[#1F3347] leading-snug">{user?.fullName || "Usuário"}</h3>
            <p className="text-[12px] text-[#6B7178]">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="py-3 text-sm flex-1">
        <ul className="px-2">
          {/* Dashboard */}
          <li>
            <Link href="/dashboard" className={navLinkClass(isActive('/dashboard') || isActive('/'))}>
              <LayoutGrid className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />
              Dashboard
            </Link>
          </li>

          {/* Agendamentos — grupo expansível */}
          <li className="mb-1">
            <button
              onClick={() => setAgendamentosOpen(o => !o)}
              className={cn(
                "flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3D4B5C] hover:bg-[#F4EFE8] transition-colors",
                isAppointmentsPath && "bg-[#DCE2D3]/70 text-[#1F3347]"
              )}
            >
              <span className="flex items-center">
                <CalendarDays className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />
                Agendamentos
              </span>
              <ChevronDown
                className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", agendamentosOpen && "rotate-180")}
              />
            </button>

            {agendamentosOpen && (
              <ul className="mt-1 ml-7 border-l-2 border-[#DCE2D3] pl-3 space-y-0.5">
                <li>
                  <Link
                    href="/appointments"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-r-md text-[13px] font-medium text-slate-500 hover:text-[#1F3347] hover:bg-[#F4EFE8] transition-colors",
                      isAppointmentsPath && !isActiveTab('rooms') && "text-[#1F3347] font-semibold bg-[#DCE2D3]/60"
                    )}
                  >
                    <CalendarCheck2 className="w-4 h-4 flex-shrink-0" />
                    Minhas Consultas
                  </Link>
                </li>
                <li>
                  <Link
                    href="/appointments?tab=rooms"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-r-md text-[13px] font-medium text-slate-500 hover:text-[#1F3347] hover:bg-[#F4EFE8] transition-colors",
                      isActiveTab('rooms') && "text-[#1F3347] font-semibold bg-[#DCE2D3]/60"
                    )}
                  >
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    Reservas de Salas
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Reuniões */}
          <li>
            <Link
              href="/reunioes"
              className={cn(navLinkClass(isActive('/reunioes')), "justify-between")}
              data-testid="nav-reunioes"
            >
              <span className="flex items-center">
                <Video className="w-5 h-5 mr-3 text-[#2E729B] flex-shrink-0" />
                Reuniões
              </span>
              {hasActiveMeeting && (
                <span className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Ativa
                </span>
              )}
            </Link>
          </li>

          {visibleMain.map(item => (
            <li key={item.href}>
              <Link href={item.href} className={navLinkClass(isActive(item.href))}>
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        {visibleFinancial.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 px-5 text-[10px] font-semibold tracking-[0.22em] text-[#8A8F96] uppercase">Financeiro</p>
            <ul className="px-2">
              {visibleFinancial.map(item => (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass(isActive(item.href))}>
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {visibleSystem.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 px-5 text-[10px] font-semibold tracking-[0.22em] text-[#8A8F96] uppercase">Sistema</p>
            <ul className="px-2">
              {visibleSystem.map(item => (
                <li key={item.href}>
                  <Link href={item.href} className={navLinkClass(isActive(item.href))}>
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="mx-3 border-t border-[#ECE8E3] py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#3D4B5C] hover:bg-[#F4EFE8]"
        >
          <LogOut className="w-5 h-5 mr-3 text-[#2E729B]" />
          <span>Sair</span>
        </button>
      </div>
      </div>
    </aside>
  );
}
