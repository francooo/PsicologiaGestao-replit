import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Phone } from "lucide-react";
import { MESSAGE_MAX_LENGTH, toWhatsAppNumber, whatsappLink } from "@shared/whatsapp-message";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { cpButton } from "@/components/cp/PageHeader";
import { WhatsAppIcon } from "@/components/cp/WhatsAppIcon";
import { WhatsAppPreview, WhatsAppTextarea } from "@/components/whatsapp/WhatsAppEditor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { PHONE_ISSUE_TEXT, REMINDERS_KEY, reminderDay, reminderKey, sentLabel, type ReminderItem } from "@/lib/whatsapp";

const labelCls = "mb-1.5 block text-[13px] font-medium text-cp-ink";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? `${res.status}`);
  return res.json();
}

/**
 * "Lembrar pelo WhatsApp": the clinic's text already filled for this appointment, editable, and a
 * button that opens the WhatsApp of whoever is using the system in the chat with the patient.
 */
export function ReminderDialog({ appointmentId, onClose }: { appointmentId: number | null; onClose: () => void }) {
  return (
    <Dialog open={appointmentId !== null} onOpenChange={(open) => !open && onClose()}>
      {appointmentId !== null && <ReminderContent key={appointmentId} appointmentId={appointmentId} onClose={onClose} />}
    </Dialog>
  );
}

function ReminderContent({ appointmentId, onClose }: { appointmentId: number; onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: reminderKey(appointmentId),
    queryFn: () => getJson<ReminderItem>(`/api/whatsapp/appointments/${appointmentId}/reminder`),
  });
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data) return;
    setPhone(data.phoneDisplay ?? "");
    setMessage(data.message);
  }, [data]);

  const markSent = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/whatsapp/appointments/${appointmentId}/reminder-sent`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: reminderKey(appointmentId) });
    },
    onError: (e) => toast({ title: "WhatsApp aberto, mas o lembrete não foi marcado", description: errorMessage(e), variant: "destructive" }),
  });

  const number = phone.trim() ? toWhatsAppNumber(phone) : null;
  const phoneInvalid = !!phone.trim() && !number;
  const tooLong = message.length > MESSAGE_MAX_LENGTH;

  const open = () => {
    // Opened synchronously in the click so the browser doesn't block the new tab
    window.open(whatsappLink(number, message), "_blank", "noopener,noreferrer");
    markSent.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "WhatsApp aberto", description: "Confira a mensagem e toque em enviar. O lembrete ficou marcado como enviado." });
        onClose();
      },
    });
  };

  const when = data ? `${reminderDay(data.date)} às ${data.startTime}` : "";
  const sent = data ? sentLabel(data) : null;

  return (
    <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col overflow-hidden rounded-2xl p-0">
      <div className="border-b border-cp-divider px-6 py-4">
        <ModalHeader
          icon={WhatsAppIcon}
          tone="sage"
          title="Lembrar pelo WhatsApp"
          description={data ? `${data.patientName} · ${when}` : "Lembrete da consulta"}
        />
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cp-action" />
        </div>
      ) : error || !data ? (
        <div className="p-6">
          <InfoBanner variant="warning" title="Não foi possível montar o lembrete">
            {error instanceof Error ? error.message : "Tente novamente."}
          </InfoBanner>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {sent && <InfoBanner variant="success" title={sent}>Você pode enviar de novo, se quiser.</InfoBanner>}

          <div>
            <label htmlFor="wa-phone" className={labelCls}>WhatsApp do paciente</label>
            <IconField icon={Phone}>
              <Input id="wa-phone" inputMode="tel" placeholder="DDD + número" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </IconField>
            {phoneInvalid ? (
              <p className="mt-1.5 text-[13px] text-cp-danger">Digite o número com DDD, por exemplo (51) 99999-8888.</p>
            ) : (
              !phone.trim() && (
                <p className="mt-1.5 text-[13px] text-cp-muted">
                  {data.phoneIssue ? `${PHONE_ISSUE_TEXT[data.phoneIssue]} ` : ""}
                  Digite o número com DDD ou deixe em branco para escolher o contato no WhatsApp.
                </p>
              )
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="wa-message" className={labelCls}>Mensagem</label>
              <WhatsAppTextarea id="wa-message" value={message} onChange={setMessage} maxLength={MESSAGE_MAX_LENGTH} rows={12} />
              <p className="mt-1.5 text-[12px] text-cp-subtle">Os ajustes valem só para esta mensagem.</p>
            </div>
            <div>
              <span className={labelCls}>Como vai aparecer</span>
              <WhatsAppPreview text={message} className="min-h-[200px]" />
            </div>
          </div>

          <InfoBanner variant="info" title="Sai do seu WhatsApp">
            Abre o WhatsApp conectado neste aparelho, já na conversa com o paciente. Confira e toque em enviar.
          </InfoBanner>
        </div>
      )}

      <DialogFooter className="flex-row justify-between gap-3 border-t border-cp-divider px-6 py-4 sm:justify-between">
        <button type="button" onClick={onClose} className={cpButton.subtle}>Cancelar</button>
        <button
          type="button"
          onClick={open}
          disabled={!data || phoneInvalid || tooLong || !message.trim() || markSent.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25A244] px-5 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[#1E8A39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A244] focus-visible:ring-offset-2 disabled:opacity-60"
          data-testid="button-open-whatsapp"
        >
          {markSent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-5 w-5" />}
          Abrir no WhatsApp
        </button>
      </DialogFooter>
    </DialogContent>
  );
}
