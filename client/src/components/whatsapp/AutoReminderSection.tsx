import { useMutation, useQuery } from "@tanstack/react-query";
import { BellRing, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { InfoBanner } from "@/components/cp/fields";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { REMINDERS_KEY } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type AutoSettings = {
  enabled: boolean;
  leadHours: number;
  leadOptions: number[];
  twilioConfigured: boolean;
  approvedTemplate: boolean;
};

const QUERY_KEY = ["/api/whatsapp/auto-settings"];
const leadLabel = (h: number) => (h === 24 ? "1 dia antes (24 h)" : `${h} horas antes`);

/** Configurações → Lembrete automático (admin): the system sends the WhatsApp reminder by itself (Twilio). */
export function AutoReminderSection({ className }: { className?: string }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AutoSettings>({ queryKey: QUERY_KEY });

  const save = useMutation({
    mutationFn: async (next: { enabled: boolean; leadHours: number }) =>
      (await apiRequest("PUT", "/api/whatsapp/auto-settings", next)).json(),
    onSuccess: (saved: AutoSettings) => {
      queryClient.setQueryData(QUERY_KEY, saved);
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      toast({
        title: saved.enabled ? "Lembrete automático ligado" : "Lembrete automático desligado",
        description: saved.enabled ? `Os pacientes recebem o lembrete ${leadLabel(saved.leadHours).toLowerCase()} da consulta.` : undefined,
      });
    },
    onError: (e) => toast({ title: "Não foi possível salvar", description: errorMessage(e), variant: "destructive" }),
  });

  const update = (patch: Partial<{ enabled: boolean; leadHours: number }>) =>
    data && save.mutate({ enabled: data.enabled, leadHours: data.leadHours, ...patch });

  return (
    <section className={className} aria-labelledby="auto-reminder-title">
      <h2 id="auto-reminder-title" className="flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
        <BellRing className="h-5 w-5 text-cp-muted" />
        Lembrete automático
      </h2>
      <p className="mb-5 text-sm text-cp-muted">
        O sistema envia sozinho o lembrete da consulta pelo WhatsApp, sem ninguém precisar abrir o celular. Só recebe quem tem telefone no cadastro de
        pacientes.
      </p>

      {isLoading || !data ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
      ) : (
        <div className="space-y-5">
          <label className="flex items-start justify-between gap-4 rounded-xl border border-cp-divider p-4">
            <span>
              <span className="block font-medium text-cp-ink">Enviar lembretes automaticamente</span>
              <span className="block text-sm text-cp-muted">
                Ao ligar, você confirma que os pacientes autorizaram receber avisos da clínica pelo WhatsApp (LGPD).
              </span>
            </span>
            <Switch
              checked={data.enabled}
              disabled={save.isPending}
              onCheckedChange={(enabled) => update({ enabled })}
              aria-label="Enviar lembretes automaticamente"
              data-testid="switch-auto-reminder"
            />
          </label>

          <div>
            <p className="mb-2 text-[13px] font-medium text-cp-ink">Quando enviar</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quando enviar">
              {data.leadOptions.map((h) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={data.leadHours === h}
                  disabled={save.isPending}
                  onClick={() => update({ leadHours: h })}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                    data.leadHours === h
                      ? "border-cp-action bg-cp-action-soft text-cp-action"
                      : "border-cp-border bg-white text-cp-ink hover:bg-cp-hover",
                  )}
                >
                  {leadLabel(h)}
                </button>
              ))}
            </div>
          </div>

          {!data.twilioConfigured ? (
            <InfoBanner variant="warning" title="Envio ainda não ativado na plataforma">
              A configuração fica salva, mas nenhum lembrete sai até o WhatsApp da plataforma (Twilio) ser conectado.
            </InfoBanner>
          ) : !data.approvedTemplate ? (
            <InfoBanner variant="info" title="Modo de teste">
              Enquanto o modelo oficial não é aprovado pelo WhatsApp, só recebem os celulares cadastrados no ambiente de teste.
            </InfoBanner>
          ) : null}
        </div>
      )}
    </section>
  );
}
