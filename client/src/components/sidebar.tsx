import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Lock,
  Settings,
  LogOut,
  UserCircle,
  LineChart,
  FileText,
  ClipboardList,
  Contact,
  ChevronDown,
  CalendarCheck2,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const searchString = useSearch();
  const [agendamentosOpen, setAgendamentosOpen] = useState(false);

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
      icon: <Contact className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/patients",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Psicólogas",
      icon: <Users className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/psychologists",
      roles: ["admin", "receptionist"],
    },
  ];

  const financialItems = [
    {
      name: "Financeiro",
      icon: <BarChart3 className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/financial",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Fluxo de Caixa",
      icon: <LineChart className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/cash-flow",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Minhas Notas Fiscais",
      icon: <FileText className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/invoices",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Gestão de Notas",
      icon: <ClipboardList className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/admin/invoices",
      roles: ["admin"],
    },
  ];

  const systemItems = [
    {
      name: "Permissões",
      icon: <Lock className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/permissions",
      roles: ["admin"],
    },
    {
      name: "Meu Perfil",
      icon: <UserCircle className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/profile",
      roles: ["admin", "psychologist", "receptionist"],
    },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5 mr-3 text-primary flex-shrink-0" />,
      href: "/settings",
      roles: ["admin", "psychologist", "receptionist"],
    },
  ];

  const userRole = user?.role || "";

  const visibleMain = mainItems.filter(i => i.roles.includes(userRole));
  const visibleFinancial = financialItems.filter(i => i.roles.includes(userRole));
  const visibleSystem = systemItems.filter(i => i.roles.includes(userRole));

  const navLinkClass = (active: boolean) => cn(
    "flex items-center rounded-md px-3 py-2 mb-1 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest transition-colors",
    active && "bg-primary/10 text-primary"
  );

  return (
    <aside className="hidden md:flex md:flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-neutral-light z-20 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-neutral-light">
        <h1 className="text-primary font-bold text-[17px] leading-tight tracking-[-0.02em]">
          ConsultaPsi
        </h1>
        <p className="mt-0.5 text-xs text-neutral-dark">Gestão de Consultório</p>
      </div>

      {/* User */}
      <div className="px-5 py-3.5 border-b border-neutral-light">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-primary/30 bg-primary text-white">
            <AvatarImage src={user?.profileImage || undefined} alt={user?.fullName || "Usuário"} />
            <AvatarFallback showPsychologySymbol={false} className="text-sm font-semibold bg-primary text-white">
              {user?.fullName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[13px] font-semibold text-neutral-darkest leading-snug">{user?.fullName || "Usuário"}</h3>
            <p className="text-[11px] text-neutral-dark">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="py-3 text-sm text-neutral-dark flex-1">
        <ul className="px-2">
          {/* Dashboard */}
          <li>
            <Link href="/dashboard" className={navLinkClass(isActive('/dashboard') || isActive('/'))}>
              <LayoutDashboard className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
              Dashboard
            </Link>
          </li>

          {/* Agendamentos — grupo expansível */}
          <li className="mb-1">
            <button
              onClick={() => setAgendamentosOpen(o => !o)}
              className={cn(
                "flex items-center justify-between w-full rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest transition-colors",
                isAppointmentsPath && "bg-primary/10 text-primary"
              )}
            >
              <span className="flex items-center">
                <CalendarDays className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                Agendamentos
              </span>
              <ChevronDown
                className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", agendamentosOpen && "rotate-180")}
              />
            </button>

            {agendamentosOpen && (
              <ul className="mt-1 ml-7 border-l-2 border-[#c4dfe3] pl-3 space-y-0.5">
                <li>
                  <Link
                    href="/appointments"
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-r-md text-[13px] font-medium text-slate-500 hover:text-[#1e7e8c] hover:bg-[#e8f4f6] transition-colors",
                      isAppointmentsPath && !isActiveTab('rooms') && "text-[#1e7e8c] font-semibold bg-[#e8f4f6]"
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
                      "flex items-center gap-2 px-2 py-1.5 rounded-r-md text-[13px] font-medium text-slate-500 hover:text-[#1e7e8c] hover:bg-[#e8f4f6] transition-colors",
                      isActiveTab('rooms') && "text-[#1e7e8c] font-semibold bg-[#e8f4f6]"
                    )}
                  >
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    Reservas de Salas
                  </Link>
                </li>
              </ul>
            )}
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
            <p className="mt-3 mb-1 px-5 text-[10px] font-semibold tracking-[0.12em] text-neutral-dark uppercase">Financeiro</p>
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
            <p className="mt-3 mb-1 px-5 text-[10px] font-semibold tracking-[0.12em] text-neutral-dark uppercase">Sistema</p>
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
      <div className="border-t border-neutral-light px-3 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest"
        >
          <LogOut className="w-5 h-5 mr-3 text-primary" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
