import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  DoorOpen,
  BarChart3,
  Lock,
  Settings,
  LogOut,
  UserCircle,
  LineChart,
  DollarSign,
  FileText,
  ClipboardList,
  Contact
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navigationItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5 mr-3 text-primary" />,
      href: "/dashboard",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "main" as const,
    },
    {
      name: "Agendamentos",
      icon: <CalendarDays className="w-5 h-5 mr-3 text-primary" />,
      href: "/appointments",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "main" as const,
    },
    {
      name: "Pacientes",
      icon: <Contact className="w-5 h-5 mr-3 text-primary" />,
      href: "/patients",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "main" as const,
    },
    {
      name: "Psicólogas",
      icon: <Users className="w-5 h-5 mr-3 text-primary" />,
      href: "/psychologists",
      allowedRoles: ["admin", "receptionist"],
      section: "main" as const,
    },
    {
      name: "Salas",
      icon: <DoorOpen className="w-5 h-5 mr-3 text-primary" />,
      href: "/rooms",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "main" as const,
    },
    {
      name: "Financeiro",
      icon: <BarChart3 className="w-5 h-5 mr-3 text-primary" />,
      href: "/financial",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "financial" as const,
    },
    {
      name: "Fluxo de Caixa",
      icon: <LineChart className="w-5 h-5 mr-3 text-primary" />,
      href: "/cash-flow",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "financial" as const,
    },
    {
      name: "Minhas Notas Fiscais",
      icon: <FileText className="w-5 h-5 mr-3 text-primary" />,
      href: "/invoices",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "financial" as const,
    },
    {
      name: "Gestão de Notas",
      icon: <ClipboardList className="w-5 h-5 mr-3 text-primary" />,
      href: "/admin/invoices",
      allowedRoles: ["admin"],
      section: "financial" as const,
    },
    {
      name: "Permissões",
      icon: <Lock className="w-5 h-5 mr-3 text-primary" />,
      href: "/permissions",
      allowedRoles: ["admin"],
      section: "system" as const,
    },
    {
      name: "Meu Perfil",
      icon: <UserCircle className="w-5 h-5 mr-3 text-primary" />,
      href: "/profile",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "system" as const,
    },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5 mr-3 text-primary" />,
      href: "/settings",
      allowedRoles: ["admin", "psychologist", "receptionist"],
      section: "system" as const,
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Filter items based on user role
  const filteredItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(user?.role || "")
  );

  const mainItems = filteredItems.filter((item) => item.section === "main");
  const financialItems = filteredItems.filter(
    (item) => item.section === "financial"
  );
  const systemItems = filteredItems.filter((item) => item.section === "system");

  const getRoleLabel = (role?: string | null) => {
    if (!role) return "Usuário";
    switch (role) {
      case "admin":
        return "Admin";
      case "psychologist":
        return "Psicóloga";
      case "receptionist":
        return "Recepção";
      default:
        return role;
    }
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-neutral-light z-20 overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-neutral-light">
        <h1 className="text-primary font-bold text-[17px] leading-tight tracking-[-0.02em]">
          ConsultaPsi
        </h1>
        <p className="mt-0.5 text-xs text-neutral-dark">
          Gestão de Consultório
        </p>
      </div>

      {/* User Profile Section */}
      <div className="px-5 py-3.5 border-b border-neutral-light">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-primary/30 bg-primary text-white">
            <AvatarImage
              src={user?.profileImage || undefined}
              alt={user?.fullName || "Usuário"}
            />
            <AvatarFallback
              showPsychologySymbol={false}
              className="text-sm font-semibold bg-primary text-white"
            >
              {user?.fullName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[13px] font-semibold text-neutral-darkest leading-snug">
              {user?.fullName || "Usuário"}
            </h3>
            <p className="text-[11px] text-neutral-dark">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="py-3 text-sm text-neutral-dark">
        <ul className="px-2">
          {mainItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 mb-1 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest",
                  isActive(item.href) &&
                    "bg-primary/10 text-primary"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        {financialItems.length > 0 && (
          <>
            <p className="mt-3 mb-1 px-5 text-[10px] font-semibold tracking-[0.12em] text-neutral-dark uppercase">
              Financeiro
            </p>
            <ul className="px-2">
              {financialItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 mb-1 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest",
                      isActive(item.href) &&
                        "bg-primary/10 text-primary"
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {systemItems.length > 0 && (
          <>
            <p className="mt-3 mb-1 px-5 text-[10px] font-semibold tracking-[0.12em] text-neutral-dark uppercase">
              Sistema
            </p>
            <ul className="px-2">
              {systemItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 mb-1 text-[13px] font-medium text-slate-600 hover:bg-neutral-lightest",
                      isActive(item.href) &&
                        "bg-primary/10 text-primary"
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Logout footer */}
      <div className="mt-auto border-t border-neutral-light px-3 py-3">
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
