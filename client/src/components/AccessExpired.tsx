import { Link } from "wouter";
import { ArrowLeftRight, CalendarX2, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicState } from "@/components/cp/PublicShell";
import { cpButton } from "@/components/cp/PageHeader";
import { SUPPORT_EMAIL, formatDay } from "@/lib/company-access";

/** Shown instead of every page while the active clinic's access is expired. */
export function AccessExpired() {
  const { user, logoutMutation } = useAuth();
  const company = user?.activeCompany;
  if (!user || !company) return null;
  const others = user.companies.filter((c) => c.id !== company.id && !c.accessExpired);
  const subject = encodeURIComponent(`Renovação do acesso – ${company.name}`);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cp-bg">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cp-sage-soft" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-80 rounded-full bg-cp-lavender-soft" />

      <header className="relative px-4 pt-6">
        <div className="mx-auto max-w-xl">
          <BrandLogo size="sm" />
        </div>
      </header>

      <main className="relative flex-1 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-cp-divider bg-white p-6 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] md:p-8">
          <PublicState icon={<CalendarX2 className="h-8 w-8 text-cp-danger" />} title="Acesso da clínica vencido">
            <p>
              O acesso de <strong className="text-cp-ink">{company.name}</strong> ao ConsultaPsi
              {company.accessValidUntil ? ` foi até ${formatDay(company.accessValidUntil)}` : " venceu"}. Os dados continuam
              guardados e voltam a ficar disponíveis assim que o acesso for renovado.
            </p>
          </PublicState>

          <div className="flex flex-wrap justify-center gap-3">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`} className={cpButton.primary}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              Falar com o suporte
            </a>
            {others.length > 0 && (
              <Link href="/selecionar-empresa" className={cpButton.secondary}>
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                Trocar clínica
              </Link>
            )}
            <button type="button" className={cpButton.secondary} onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </div>
          <p className="mt-6 text-center text-xs text-cp-muted">{SUPPORT_EMAIL}</p>
        </div>
      </main>
    </div>
  );
}
