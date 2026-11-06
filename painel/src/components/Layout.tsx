import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Building2, FileText, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/assinantes", label: "Assinantes", icon: Building2, match: (p: string) => p.startsWith("/assinantes") || p.startsWith("/clinicas") },
  { href: "/administradores", label: "Administradores", icon: Users, match: (p: string) => p.startsWith("/administradores") },
  { href: "/relatorios", label: "Relatórios", icon: FileText, match: (p: string) => p.startsWith("/relatorios") },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="shell" data-drawer={open ? "open" : "closed"}>
      <header className="topbar">
        <Logo />
        <button className="btn btn--secondary btn--icon" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu />
        </button>
      </header>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} />
      <aside className="sidebar" aria-label="Menu principal">
        <div className="sidebar__brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo />
          {open ? (
            <button className="btn btn--ghost btn--icon btn--sm" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              <X />
            </button>
          ) : null}
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={n.match(location) ? "page" : undefined}>
              <n.icon aria-hidden="true" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="who">
            <div className="who__name">{user?.fullName}</div>
            <div className="who__mail">{user?.email}</div>
          </div>
          <button className="btn btn--ghost" style={{ justifyContent: "flex-start" }} onClick={() => void signOut()}>
            <LogOut />
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export function PageHead({ title, sub, actions, back }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <>
      {back}
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {sub ? <div className="page-sub">{sub}</div> : null}
        </div>
        {actions ? <div className="head-actions">{actions}</div> : null}
      </div>
    </>
  );
}
