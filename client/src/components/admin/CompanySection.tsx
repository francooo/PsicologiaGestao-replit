import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CalendarClock, FileText, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cpButton } from "@/components/cp/PageHeader";
import { IconField, InfoBanner } from "@/components/cp/fields";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { accessState, endingLabel, formatDay } from "@/lib/company-access";
import { cn } from "@/lib/utils";

type CurrentCompany = {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  logoUrl: string | null;
  // Set by the platform admin; read-only here
  accessValidUntil: string | null;
  accessExpired: boolean;
  aiEnabled: boolean;
};

const QUERY_KEY = ["/api/companies/current"];

const formatCnpj = (v: string | null) =>
  v && v.length === 14 ? v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : (v ?? "");

/** Configurações → Dados da empresa (admin of the active company): name, CNPJ and logo. */
export function CompanySection({ className }: { className?: string }) {
  const { data: company, isLoading } = useQuery<CurrentCompany>({ queryKey: QUERY_KEY });

  return (
    <section className={className} aria-labelledby="company-title">
      <h2 id="company-title" className="flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
        <Building2 className="h-5 w-5 text-cp-muted" />
        Dados da empresa
      </h2>
      <p className="mb-5 text-sm text-cp-muted">Nome e logo aparecem no menu e nas páginas que os pacientes abrem (agendamento e formulários).</p>
      {isLoading || !company ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
      ) : (
        // Re-created after a save, so the fields start from the saved values
        <CompanyForm key={`${company.name}|${company.cnpj}|${company.logoUrl}`} company={company} />
      )}
    </section>
  );
}

function CompanyForm({ company }: { company: CurrentCompany }) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(formatCnpj(company.cnpj));

  // The active company's name/logo also live in /api/user (menu)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/companies/current", { name, cnpj }),
    onSuccess: () => {
      refresh();
      toast({ title: "Dados da empresa salvos" });
    },
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch("/api/companies/current/logo", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Logo atualizado" });
    },
    onError: (error) => toast({ title: "Não foi possível enviar o logo", description: errorMessage(error), variant: "destructive" }),
  });

  const removeLogo = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/companies/current/logo"),
    onSuccess: () => {
      refresh();
      toast({ title: "Logo removido" });
    },
    onError: (error) => toast({ title: "Não foi possível remover o logo", description: errorMessage(error), variant: "destructive" }),
  });

  const changed = name.trim() !== company.name || cnpj.replace(/\D/g, "") !== (company.cnpj ?? "");
  const busyLogo = uploadLogo.isPending || removeLogo.isPending;

  return (
    <div className="grid gap-6 md:grid-cols-[auto,1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-cp-divider bg-cp-hover">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={`Logo de ${company.name}`} className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-10 w-10 text-cp-subtle" aria-hidden="true" />
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) uploadLogo.mutate(file);
          }}
        />
        <div className="flex gap-2">
          <button type="button" className={`${cpButton.secondary} h-9 px-3 text-[13px]`} onClick={() => fileInput.current?.click()} disabled={busyLogo}>
            {uploadLogo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {company.logoUrl ? "Trocar logo" : "Enviar logo"}
          </button>
          {company.logoUrl && (
            <button
              type="button"
              className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-danger-soft hover:text-cp-danger"
              onClick={() => removeLogo.mutate()}
              disabled={busyLogo}
              aria-label="Remover logo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-cp-muted">PNG, JPG ou WEBP, até 2MB</p>
      </div>

      <form
        id="company-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Nome da clínica</Label>
          <IconField icon={Building2}>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
          </IconField>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-cnpj">CNPJ</Label>
          <IconField icon={FileText}>
            <Input id="company-cnpj" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </IconField>
        </div>
        {company.name === "Empresa 1" && (
          <InfoBanner variant="info">Esta clínica ainda está com o nome padrão. Troque pelo nome real para ele aparecer no menu.</InfoBanner>
        )}
      </form>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:col-span-2">
        <AccessInfo company={company} />
        <button type="submit" form="company-form" className={cn(cpButton.primary, "shrink-0 self-end sm:self-auto")} disabled={!changed || !name.trim() || save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar dados
        </button>
      </div>
    </div>
  );
}

const badgeTone = {
  active: "bg-cp-sage-soft text-cp-success",
  ending: "bg-cp-warning-soft text-cp-warning",
  expired: "bg-cp-danger-soft text-cp-danger",
};

/** How long the clinic's access lasts and whether AI is in its plan (both set by the platform). */
function AccessInfo({ company }: { company: CurrentCompany }) {
  const state = accessState(company);
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-cp-divider bg-cp-hover px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
        <CalendarClock className="h-5 w-5 text-cp-muted" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-1">
        {company.accessValidUntil ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-cp-ink">
            <span>
              Acesso válido até <strong className="font-semibold">{formatDay(company.accessValidUntil)}</strong>
            </span>
            {state !== "unlimited" && (
              <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", badgeTone[state])}>
                {state === "expired" ? "Vencido" : state === "ending" ? endingLabel(company.accessValidUntil) : "Ativo"}
              </span>
            )}
          </p>
        ) : (
          <p className="text-[14px] text-cp-ink">Acesso sem data de vencimento</p>
        )}
        {!company.aiEnabled && (
          <p className="flex items-center gap-1.5 text-[13px] text-cp-muted">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Recursos de inteligência artificial não incluídos no plano
          </p>
        )}
      </div>
    </div>
  );
}
