import { Redirect, useLocation } from "wouter";
import { Building2, Check, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicState } from "@/components/cp/PublicShell";
import { cpButton } from "@/components/cp/PageHeader";
import { roleName } from "@/components/cp/status";

/** Chooses the active company — shown after login when there is more than one, or none yet. */
export default function SelectCompanyPage() {
  const { user, isLoading, switchCompanyMutation, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cp-bg">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  if (!user) return <Redirect to="/auth" />;

  const choose = (companyId: number) => {
    if (companyId === user.activeCompany?.id) return navigate("/");
    switchCompanyMutation.mutate(companyId, { onSuccess: () => navigate("/") });
  };

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
          {user.companies.length === 0 ? (
            <PublicState icon={<Building2 className="h-8 w-8 text-cp-ink" />} title="Nenhuma clínica vinculada">
              <p>
                Sua conta foi criada, mas você ainda não faz parte de nenhuma clínica. Peça ao administrador da sua clínica
                um convite para o e-mail <strong>{user.email}</strong>.
              </p>
            </PublicState>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-cp-ink">Escolha a clínica</h1>
              <p className="mt-1 text-sm text-cp-muted">Você pode trocar depois, pelo menu.</p>
              <ul className="mt-6 space-y-3">
                {user.companies.map((company) => {
                  const isActive = company.id === user.activeCompany?.id;
                  const isPending = switchCompanyMutation.isPending && switchCompanyMutation.variables === company.id;
                  return (
                    <li key={company.id}>
                      <button
                        type="button"
                        onClick={() => choose(company.id)}
                        disabled={switchCompanyMutation.isPending}
                        className="flex w-full items-center gap-4 rounded-xl border border-cp-border bg-white p-4 text-left transition-colors hover:bg-cp-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-action disabled:opacity-60"
                      >
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cp-sage-soft">
                            <Building2 className="h-5 w-5 text-cp-ink" aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-cp-ink">{company.name}</span>
                          <span className="block text-sm text-cp-muted">{roleName(company.role)}</span>
                        </span>
                        {isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin text-cp-muted" />
                        ) : (
                          isActive && <Check className="h-5 w-5 text-cp-action" aria-label="Empresa atual" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              className={cpButton.secondary}
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
