import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

/** Frame for the pages patients open from a link (no sidebar, no login): logo, centered card, privacy footer. */
export function PublicShell({
  children,
  clinicName,
  clinicLogoUrl,
  psychologistName,
}: {
  children: ReactNode;
  clinicName?: string;
  clinicLogoUrl?: string | null;
  psychologistName?: string;
}) {
  const showClinic = clinicName && clinicName !== "ConsultaPsi";
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cp-bg">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cp-sage-soft" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-80 rounded-full bg-cp-lavender-soft" />

      <header className="relative px-4 pt-6">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3">
          <BrandLogo size="sm" />
          {(showClinic || psychologistName) && (
            <div className="flex items-center gap-3">
              <div className="text-right text-xs text-cp-muted">
                {showClinic && <p className="font-semibold text-cp-ink">{clinicName}</p>}
                {psychologistName && <p>Psicóloga: {psychologistName}</p>}
              </div>
              {clinicLogoUrl && <img src={clinicLogoUrl} alt="" className="h-10 w-10 rounded-lg bg-white object-contain" />}
            </div>
          )}
        </div>
      </header>

      <main className="relative flex-1 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-cp-divider bg-white p-6 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] md:p-8">
          {children}
        </div>
      </main>

      <footer className="relative flex items-center justify-center gap-1.5 px-4 pb-6 text-center text-xs text-cp-muted">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Suas informações são confidenciais e usadas apenas para acompanhamento clínico.
      </footer>
    </div>
  );
}

/** Centered icon + title + text, used for the success / error / expired states. */
export function PublicState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="space-y-3 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cp-sage-soft">{icon}</div>
      <h2 className="text-xl font-semibold text-cp-ink">{title}</h2>
      {children && <div className="mx-auto max-w-sm text-sm text-cp-muted">{children}</div>}
    </div>
  );
}
