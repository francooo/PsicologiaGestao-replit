import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, Home, CalendarDays, Users, DoorOpen, BarChart3, Lock, Settings, LogOut, UserCircle, FileText, ClipboardList, Contact } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    closeMenu();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navigationItems = [
    {
      name: "Dashboard",
      icon: <Home className="w-5 h-5" />,
      href: "/dashboard",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Agendamentos",
      icon: <CalendarDays className="w-5 h-5" />,
      href: "/appointments",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Pacientes",
      icon: <Contact className="w-5 h-5" />,
      href: "/patients",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Psicólogas",
      icon: <Users className="w-5 h-5" />,
      href: "/psychologists",
      allowedRoles: ["admin", "receptionist"]
    },
    {
      name: "Salas",
      icon: <DoorOpen className="w-5 h-5" />,
      href: "/rooms",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Financeiro",
      icon: <BarChart3 className="w-5 h-5" />,
      href: "/financial",
      allowedRoles: ["admin", "receptionist"]
    },
    {
      name: "Minhas Notas Fiscais",
      icon: <FileText className="w-5 h-5" />,
      href: "/invoices",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Gestão de Notas",
      icon: <ClipboardList className="w-5 h-5" />,
      href: "/admin/invoices",
      allowedRoles: ["admin"]
    },
    {
      name: "Permissões",
      icon: <Lock className="w-5 h-5" />,
      href: "/permissions",
      allowedRoles: ["admin"]
    },
    {
      name: "Meu Perfil",
      icon: <UserCircle className="w-5 h-5" />,
      href: "/profile",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5" />,
      href: "/settings",
      allowedRoles: ["admin", "psychologist", "receptionist"]
    }
  ];

  // Filter items based on user role
  const filteredItems = navigationItems.filter(item =>
    item.allowedRoles.includes(user?.role || "")
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white shadow-md py-3 px-4 fixed top-0 w-full z-10 flex items-center justify-between md:hidden">
        <div className="flex items-center">
          <button onClick={toggleMenu} className="text-neutral-dark mr-3">
            {isOpen ? <X className="text-xl" /> : <Menu className="text-xl" />}
          </button>
          <h1 className="text-primary font-bold text-lg">ConsultaPsi</h1>
        </div>
        <div className="flex items-center">
          <div className="relative">
            <button className="flex items-center">
              <img
                src={user?.profileImage || "https://via.placeholder.com/32"}
                alt="Foto de perfil"
                className="w-8 h-8 rounded-full mr-2 border-2 border-primary"
              />
              <span className="text-neutral-dark text-sm hidden sm:block">{user?.fullName}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMenu}
      ></div>

      {/* Mobile Navigation Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-neutral-light">
          <h1 className="text-primary font-bold text-2xl">ConsultaPsi</h1>
          <p className="text-neutral-dark text-sm">Gestão de Consultório</p>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-neutral-light">
          <div className="flex items-center">
            <img
              src={user?.profileImage || "https://via.placeholder.com/40"}
              alt="Foto de perfil"
              className="w-12 h-12 rounded-full mr-3 border-2 border-primary"
            />
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
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center py-3 px-4 text-neutral-darkest hover:bg-neutral-lightest",
                    isActive(item.href) && "border-l-4 border-primary bg-primary/5"
                  )}
                >
                  <div className="w-5 h-5 mr-3 text-primary">{item.icon}</div>
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
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white shadow-md py-2 px-6 md:hidden z-10">
        <ul className="flex justify-between">
          <li>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center ${isActive("/dashboard") ? "text-primary" : "text-neutral-dark"}`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/appointments"
              className={`flex flex-col items-center ${isActive("/appointments") ? "text-primary" : "text-neutral-dark"}`}
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs mt-1">Agenda</span>
            </Link>
          </li>
          <li>
            <Link
              href="/profile"
              className={`flex flex-col items-center ${isActive("/profile") ? "text-primary" : "text-neutral-dark"}`}
            >
              <UserCircle className="h-5 w-5" />
              <span className="text-xs mt-1">Perfil</span>
            </Link>
          </li>
          <li>
            <Link
              href="/rooms"
              className={`flex flex-col items-center ${isActive("/rooms") ? "text-primary" : "text-neutral-dark"}`}
            >
              <DoorOpen className="h-5 w-5" />
              <span className="text-xs mt-1">Salas</span>
            </Link>
          </li>
          <li>
            <button onClick={toggleMenu} className="flex flex-col items-center text-neutral-dark">
              <Menu className="h-5 w-5" />
              <span className="text-xs mt-1">Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
