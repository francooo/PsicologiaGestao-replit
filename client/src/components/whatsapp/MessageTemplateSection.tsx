import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { MESSAGE_MAX_LENGTH, MESSAGE_VARIABLES, exampleVars, fillMessage } from "@shared/whatsapp-message";
import { cpButton } from "@/components/cp/PageHeader";
import { InfoBanner } from "@/components/cp/fields";
import { WhatsAppIcon } from "@/components/cp/WhatsAppIcon";
import { WhatsAppPreview, WhatsAppTextarea } from "@/components/whatsapp/WhatsAppEditor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { REMINDERS_KEY } from "@/lib/whatsapp";

type Template = { key: string; body: string; isDefault: boolean; defaultBody: string };

const KEY = "appointment_reminder" as const;
const QUERY_KEY = ["/api/whatsapp/templates", KEY];

/** Configurações → Mensagens do WhatsApp (admin): the clinic's reminder text, with {variables} and preview. */
export function MessageTemplateSection({ className }: { className?: string }) {
  const { toast } = useToast();
  const ref = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading } = useQuery<Template>({
    queryKey: QUERY_KEY,
    queryFn: async () => (await apiRequest("GET", `/api/whatsapp/templates/${KEY}`)).json(),
  });
  const [body, setBody] = useState("");

  useEffect(() => {
    if (data) setBody(data.body);
  }, [data]);

  const save = useMutation({
    mutationFn: async (value: string) => (await apiRequest("PUT", `/api/whatsapp/templates/${KEY}`, { body: value })).json(),
    onSuccess: (saved: Template) => {
      queryClient.setQueryData(QUERY_KEY, saved);
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/appointments"] });
      toast({ title: saved.isDefault ? "Mensagem padrão restaurada" : "Mensagem salva", description: "Os próximos lembretes já usam este texto." });
    },
    onError: (e) => toast({ title: "Não foi possível salvar", description: errorMessage(e), variant: "destructive" }),
  });

  const insert = (name: string) => {
    const el = ref.current;
    const token = `{${name}}`;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const dirty = !!data && body.trim() !== data.body.trim();
  const tooLong = body.length > MESSAGE_MAX_LENGTH;

  return (
    <section className={className} aria-labelledby="wa-messages-title">
      <h2 id="wa-messages-title" className="flex items-center gap-2 text-[18px] font-semibold text-cp-ink">
        <WhatsAppIcon className="h-5 w-5 text-[#25A244]" />
        Mensagens do WhatsApp
      </h2>
      <p className="mb-5 text-sm text-cp-muted">
        Texto do <strong className="font-medium text-cp-ink">lembrete de consulta</strong>, usado em "Lembrar pelo WhatsApp" e em "Lembretes de
        amanhã". Quem envia ainda pode ajustar cada mensagem antes de abrir o WhatsApp.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <WhatsAppTextarea value={body} onChange={setBody} maxLength={MESSAGE_MAX_LENGTH} rows={13} inputRef={ref} />
              <p className="mb-2 mt-4 text-[13px] font-medium text-cp-ink">Inserir informação da consulta</p>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_VARIABLES[KEY].map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insert(v.name)}
                    title={`{${v.name}} → ${v.example}`}
                    className="rounded-full border border-cp-border bg-white px-3 py-1 text-[13px] text-cp-ink hover:bg-cp-hover"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-cp-ink">Exemplo de como chega ao paciente</p>
              <WhatsAppPreview text={fillMessage(body, exampleVars(KEY))} className="min-h-[240px]" />
              <InfoBanner variant="info" className="mt-3">
                Formatação do WhatsApp: *negrito*, _itálico_ e ~tachado~. Emojis também funcionam. Não coloque informações clínicas na mensagem.
              </InfoBanner>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            {!data?.isDefault && (
              <button type="button" className={cpButton.secondary} disabled={save.isPending} onClick={() => save.mutate("")}>
                <RotateCcw className="h-4 w-4" />
                Voltar ao texto padrão
              </button>
            )}
            <button type="button" className={cpButton.primary} disabled={!dirty || tooLong || save.isPending} onClick={() => save.mutate(body)}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar mensagem
            </button>
          </div>
        </>
      )}
    </section>
  );
}
