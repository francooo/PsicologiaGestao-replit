import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AgentPanel } from "./AgentPanel";

// Pages without the logged-in app around them (public links, login, company picker)
const OUTSIDE_APP = ["/auth", "/auth-page", "/password-recovery", "/reset-password", "/quick-booking", "/responder", "/selecionar-empresa"];

/** Floating button (bottom right) that opens the assistant, on every page of the app. */
export function AgentLauncher() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const inApp = !!user?.activeCompany && !OUTSIDE_APP.some((p) => location === p || location.startsWith(`${p}/`));

  const { data: status } = useQuery<{ enabled: boolean }>({ queryKey: ["/api/agent/status"], enabled: inApp, staleTime: 5 * 60_000 });
  if (!inApp || !status?.enabled) return null;

  if (open) return <AgentPanel onClose={() => setOpen(false)} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cp-action text-white shadow-[0_12px_30px_-8px_rgba(36,54,71,0.55)] transition-transform hover:scale-105 hover:bg-cp-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action focus-visible:ring-offset-2 md:bottom-6 md:right-6"
      aria-label="Abrir assistente"
      title="Assistente"
      data-testid="button-agent"
    >
      <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" aria-hidden="true" />
    </button>
  );
}
