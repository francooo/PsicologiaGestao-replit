import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { BellRing, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PhoneOff } from "lucide-react";
import { WhatsAppIcon } from "@/components/cp/WhatsAppIcon";
import { ReminderDialog } from "@/components/whatsapp/ReminderDialog";
import { AUTO_STATUS_TEXT, REMINDERS_KEY, autoSent, reminderDay, sentLabel, type RemindersResponse } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

const shift = (date: string, days: number) => format(addDays(new Date(`${date}T12:00:00`), days), "yyyy-MM-dd");

/** Dashboard: tomorrow's appointments, each with its WhatsApp reminder (sent ✓ or "Lembrar"). */
export function RemindersCard({ showPsychologist, className }: { showPsychologist: boolean; className?: string }) {
  // null = let the server pick tomorrow (São Paulo time)
  const [date, setDate] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...REMINDERS_KEY, date],
    queryFn: () => getJson<RemindersResponse>(`/api/whatsapp/reminders${date ? `?date=${date}` : ""}`),
  });

  const items = data?.items ?? [];
  const sentCount = items.filter((i) => i.reminderSentAt || autoSent(i)).length;
  const title = !data || data.date === data.tomorrow ? "Lembretes de amanhã" : `Lembretes de ${format(new Date(`${data.date}T12:00:00`), "dd/MM")}`;

  return (
    <section className={cn("rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-18px_rgba(31,51,71,0.18)]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-cp-divider px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25A244]/10 text-[#25A244]">
            <WhatsAppIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold text-cp-ink">{title}</h2>
            {data && (
              <p className="truncate text-[13px] capitalize text-cp-muted">
                {reminderDay(data.date)}
                {items.length > 0 && <span className="normal-case"> · {sentCount} de {items.length} enviados</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Dia anterior"
            disabled={!data}
            onClick={() => data && setDate(shift(data.date, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cp-divider hover:bg-cp-hover disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 text-cp-ink" />
          </button>
          <button
            type="button"
            aria-label="Próximo dia"
            disabled={!data}
            onClick={() => data && setDate(shift(data.date, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cp-divider hover:bg-cp-hover disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4 text-cp-ink" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-28 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cp-action" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-cp-subtle">Nenhuma consulta neste dia.</p>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto">
          {items.map((item, i) => {
            const sent = sentLabel(item);
            return (
              <li key={item.appointmentId} className={cn("flex items-center gap-3 px-6 py-3", i > 0 && "border-t border-cp-divider")}>
                <span className="w-12 shrink-0 text-[15px] font-medium text-cp-ink">{item.startTime}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-cp-ink">{item.patientName}</p>
                  <p className="flex items-center gap-1.5 truncate text-[13px] text-cp-muted">
                    {!item.phone && <PhoneOff className="h-3.5 w-3.5 shrink-0 text-cp-warning" aria-label="Sem telefone no cadastro" />}
                    {[showPsychologist ? item.psychologistName : null, item.phoneDisplay ?? "Sem telefone"].filter(Boolean).join(" · ")}
                  </p>
                  {item.autoStatus && (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 truncate text-[12px]",
                        autoSent(item) ? "text-cp-sage-ink" : "text-cp-warning",
                      )}
                      title={item.autoError ?? undefined}
                    >
                      <BellRing className="h-3.5 w-3.5 shrink-0" />
                      {AUTO_STATUS_TEXT[item.autoStatus] ?? item.autoStatus}
                      {item.autoError && !autoSent(item) ? ` · ${item.autoError}` : ""}
                    </p>
                  )}
                </div>
                {sent || autoSent(item) ? (
                  <button
                    type="button"
                    onClick={() => setOpenId(item.appointmentId)}
                    title={sent ?? (item.autoStatus ? AUTO_STATUS_TEXT[item.autoStatus] : undefined)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cp-sage-soft px-3 py-1.5 text-xs font-medium text-cp-sage-ink hover:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Enviado
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenId(item.appointmentId)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#25A244] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1E8A39]"
                    data-testid={`button-remind-${item.appointmentId}`}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    Lembrar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ReminderDialog appointmentId={openId} onClose={() => setOpenId(null)} />
    </section>
  );
}
