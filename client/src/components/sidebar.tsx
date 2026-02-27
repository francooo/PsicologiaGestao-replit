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
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Agendamentos",
      icon: <CalendarDays className="w-5 h-5 mr-3 text-primary" />,
      href: "/appointments",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Pacientes",
      icon: <Contact className="w-5 h-5 mr-3 text-primary" />,
      href: "/patients",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Psicólogas",
      icon: <Users className="w-5 h-5 mr-3 text-primary" />,
      href: "/psychologists",
      allowedRoles: ["admin", "receptionist"]
    },
    {
      name: "Salas",
      icon: <DoorOpen className="w-5 h-5 mr-3 text-primary" />,
      href: "/rooms",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Financeiro",
      icon: <BarChart3 className="w-5 h-5 mr-3 text-primary" />,
      href: "/financial",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Fluxo de Caixa",
      icon: <LineChart className="w-5 h-5 mr-3 text-primary" />,
      href: "/cash-flow",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Minhas Notas Fiscais",
      icon: <FileText className="w-5 h-5 mr-3 text-primary" />,
      href: "/invoices",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Gestão de Notas",
      icon: <ClipboardList className="w-5 h-5 mr-3 text-primary" />,
      href: "/admin/invoices",
      allowedRoles: ["admin"]
    },
    {
      name: "Permissões",
      icon: <Lock className="w-5 h-5 mr-3 text-primary" />,
      href: "/permissions",
      allowedRoles: ["admin"]
    },
    {
      name: "Meu Perfil",
      icon: <UserCircle className="w-5 h-5 mr-3 text-primary" />,
      href: "/profile",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5 mr-3 text-primary" />,
      href: "/settings",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Filter items based on user role
  const filteredItems = navigationItems.filter(item =>
    item.allowedRoles.includes(user?.role || "")
  );

  return (
    <aside className="sidebar bg-white shadow-md w-64 h-screen fixed left-0 top-0 overflow-y-auto z-20 hidden md:block">
      <div className="p-4 border-b border-neutral-light">
        <h1 className="text-primary font-bold text-2xl">ConsultaPsi</h1>
        <p className="text-neutral-dark text-sm">Gestão de Consultório</p>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-neutral-light">
        <div className="flex items-center">
          <Avatar className="w-12 h-12 mr-3 border-2 border-primary">
            <AvatarImage src={user?.profileImage || undefined} alt={user?.fullName || "Usuário"} />
            <AvatarFallback
              showPsychologySymbol={user?.role === "psychologist"}
              className={`text-lg font-semibold ${user?.role === "psychologist" ? "bg-primary/10" : ""}`}
            >
              {user?.fullName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-neutral-darkest">{user?.fullName || "Usuário"}</h3>
            <p className="text-xs text-neutral-dark capitalize">{user?.role || "Usuário"}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="py-4">
        <ul>
          {filteredItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center py-3 px-4 text-neutral-darkest hover:bg-neutral-lightest",
                  isActive(item.href) && "border-l-4 border-primary bg-primary/5"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}

          <li>
            <button
              onClick={handleLogout}
              className="w-full flex items-center py-3 px-4 text-neutral-darkest hover:bg-neutral-lightest"
            >
              <LogOut className="w-5 h-5 mr-3 text-primary" />
              <span>Sair</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
