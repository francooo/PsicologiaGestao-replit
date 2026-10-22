import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDays, CheckCircle2, Clock, Link2Off, Loader2, Mail, Phone, Send, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cpButton } from "@/components/cp/PageHeader";
import { CharCountTextarea, IconField } from "@/components/cp/fields";
import { PublicShell, PublicState } from "@/components/cp/PublicShell";
import { fromDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

const quickBookingSchema = z.object({
  patientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  patientEmail: z.string().email("Email inválido"),
  patientPhone: z.string().min(8, "Telefone inválido"),
  notes: z.string().max(500).optional(),
});

type QuickBookingFormValues = z.infer<typeof quickBookingSchema>;
type Phase = "loading" | "invalid" | "form" | "done";

const fieldLabel = "text-[13px] font-semibold text-cp-ink";

/** "2026-10-22" -> "quinta-feira, 22 de outubro de 2026" (local date, no UTC shift). */
function longDate(key: string) {
  const d = fromDateKey(key);
  return d ? format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : key;
}

function BookingSummary({ date, time, psychologistName }: { date: string; time: string; psychologistName: string }) {
  return (
    <div className="space-y-2 rounded-xl bg-cp-sage-soft/60 p-4 text-sm text-cp-ink">
      <p className="flex items-center gap-2 first-letter:uppercase"><CalendarDays className="h-4 w-4 text-cp-sage-ink" /><span className="first-letter:uppercase">{longDate(date)}</span></p>
      <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-cp-sage-ink" />{time}</p>
      <p className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-cp-sage-ink" />{psychologistName}</p>
    </div>
  );
}

export default function QuickBooking() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [bookingData, setBookingData] = useState({ date: "", time: "", psychologistId: "", psychologistName: "" });

  // The link carries ?date=yyyy-MM-dd&time=HH:mm - HH:mm&psychologist=<id>
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search || location.split("?")[1]);
    const date = searchParams.get("date") || "";
    const time = searchParams.get("time") || "";
    const psychologistId = searchParams.get("psychologist") || "";

    // Without these the page used to spin forever; now it says the link is invalid
    if (!date || !time || !psychologistId || !fromDateKey(date)) {
      setPhase("invalid");
      return;
    }

    (async () => {
      try {
        const response = await fetch(`/api/psychologists/${psychologistId}`);
        if (!response.ok) throw new Error();
        const psychologist = await response.json();
        setBookingData({ date, time, psychologistId, psychologistName: psychologist.user?.fullName || "Psicóloga" });
        setPhase("form");
      } catch {
        setPhase("invalid");
      }
    })();
  }, [location]);

  const form = useForm<QuickBookingFormValues>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: { patientName: "", patientEmail: "", patientPhone: "", notes: "" },
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: QuickBookingFormValues) => {
      const [startTime, endTime] = bookingData.time.split(" - ");
      // No roomId: the server assigns the default room and staff can change it later
      const response = await apiRequest("POST", "/api/appointments/quick-book", {
        date: bookingData.date,
        startTime,
        endTime,
        patientName: data.patientName,
        psychologistId: parseInt(bookingData.psychologistId),
        status: "scheduled",
        notes: `Email: ${data.patientEmail}\nTelefone: ${data.patientPhone}\n${data.notes || ""}`,
      });
      return response.json();
    },
    onSuccess: () => {
      setPhase("done");
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Erro no agendamento", description: error.message || "Não foi possível realizar o agendamento", variant: "destructive" });
    },
  });

  if (phase === "loading") {
    return (
      <PublicShell>
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-cp-action" /></div>
      </PublicShell>
    );
  }

  if (phase === "invalid") {
    return (
      <PublicShell>
        <PublicState icon={<Link2Off className="h-8 w-8 text-cp-sage-ink" />} title="Link de agendamento inválido">
          O link está incompleto ou o horário não está mais disponível. Peça um novo link para a sua psicóloga.
        </PublicState>
      </PublicShell>
    );
  }

  if (phase === "done") {
    return (
      <PublicShell psychologistName={bookingData.psychologistName}>
        <PublicState icon={<CheckCircle2 className="h-8 w-8 text-cp-success" />} title="Agendamento solicitado!">
          Recebemos sua solicitação. A equipe entrará em contato para confirmar a consulta em breve.
        </PublicState>
        <BookingSummary {...bookingData} />
        <p className="mt-4 text-center text-xs text-cp-muted">Você já pode fechar esta página.</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell psychologistName={bookingData.psychologistName}>
      <h1 className="text-[22px] font-bold text-cp-ink">Agendamento de Consulta</h1>
      <p className="mb-4 mt-1 text-sm text-cp-muted">Preencha seus dados para reservar este horário com {bookingData.psychologistName}.</p>
      <BookingSummary {...bookingData} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => bookAppointmentMutation.mutate(d))} className="mt-5 space-y-4">
          <FormField control={form.control} name="patientName" render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Nome completo <span className="text-cp-danger">*</span></FormLabel>
              <IconField icon={UserIcon}><FormControl><Input autoComplete="name" placeholder="Seu nome" {...field} /></FormControl></IconField>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="patientEmail" render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>E-mail <span className="text-cp-danger">*</span></FormLabel>
                <IconField icon={Mail}><FormControl><Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...field} /></FormControl></IconField>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="patientPhone" render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Telefone <span className="text-cp-danger">*</span></FormLabel>
                <IconField icon={Phone}><FormControl><Input type="tel" autoComplete="tel" placeholder="(51) 91234-5678" {...field} /></FormControl></IconField>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Observações (opcional)</FormLabel>
              <FormControl>
                <CharCountTextarea max={500} placeholder="Algo que a psicóloga deva saber antes da consulta?" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <button type="submit" className={cn(cpButton.primary, "h-12 w-full")} disabled={bookAppointmentMutation.isPending}>
            {bookAppointmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {bookAppointmentMutation.isPending ? "Enviando..." : "Solicitar Agendamento"}
          </button>
        </form>
      </Form>
    </PublicShell>
  );
}
