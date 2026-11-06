import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Loader2, FilePlus2, Calendar as CalendarIcon, Clock, Timer, Monitor, CircleCheck } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cpButton } from "@/components/cp/PageHeader";
import { CharCountTextarea, IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ApiError, errorMessage } from "@/lib/api-error";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Same values/labels as the app (mobile/src/app/(app)/pacientes/[id]/evolucao.tsx)
const statusOptions = [
  { label: "Realizada", value: "completed" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Falta", value: "no-show" },
];
const typeOptions = [
  { label: "Presencial", value: "in-person" },
  { label: "Online", value: "online" },
];

const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-cp-ink";
const errorText = "mt-1 text-[13px] font-medium text-cp-danger";

const initial = () => ({
  sessionDate: format(new Date(), "yyyy-MM-dd"),
  sessionTime: format(new Date(), "HH:mm"),
  duration: "50",
  sessionType: "in-person",
  status: "completed",
  notes: "",
  observations: "",
  nextSteps: "",
});
type FormState = ReturnType<typeof initial>;
type Field = keyof FormState;

// Order used to focus the first invalid field; ids match the inputs below
const fieldIds: Partial<Record<Field, string>> = {
  sessionDate: "ne-date",
  sessionTime: "ne-time",
  duration: "ne-duration",
  notes: "ne-notes",
};
// API field name -> form field (ApiError.field)
const apiFieldMap: Record<string, Field> = {
  sessionDate: "sessionDate",
  sessionTime: "sessionTime",
  durationMinutes: "duration",
  evolutionNotes: "notes",
  clinicalObservations: "observations",
  nextSteps: "nextSteps",
};

/**
 * New clinical session (evolution): POST /api/patients/:id/sessions with the same payload as the app.
 * The session belongs to the logged psychologist, or to the patient's psychologist when an admin registers it.
 */
export function NewEvolutionDialog({
  open,
  onOpenChange,
  patientId,
  patientPsychologistId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientPsychologistId: number | null;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isPsychologist = user?.role === "psychologist";
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: psychologists, isLoading: loadingPsychs } = useQuery<{ id: number; userId: number }[]>({
    queryKey: ["/api/psychologists"],
    enabled: open && isPsychologist,
  });
  const me = isPsychologist ? psychologists?.find((p) => p.userId === user?.id) ?? null : null;
  const psychologistId = me?.id ?? patientPsychologistId ?? null;

  const set = (k: Field) => (value: string) => {
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError(null);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setForm(initial());
      setErrors({});
      setServerError(null);
    }
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    const date = parse(form.sessionDate, "yyyy-MM-dd", new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.sessionDate) || !isValid(date)) e.sessionDate = "Informe uma data válida";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.sessionTime)) e.sessionTime = "Informe um horário válido";
    if (!/^\d+$/.test(form.duration.trim()) || Number(form.duration) < 1) e.duration = "Informe a duração em minutos";
    if (!form.notes.trim()) e.notes = "Descreva a evolução da sessão";
    return e;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/sessions`, {
        psychologistId,
        sessionDate: form.sessionDate,
        sessionTime: form.sessionTime,
        durationMinutes: Number(form.duration),
        sessionType: form.sessionType,
        status: form.status,
        evolutionNotes: form.notes.trim(),
        clinicalObservations: form.observations.trim() || null,
        nextSteps: form.nextSteps.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/sessions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/counts`] });
      toast({ title: "Evolução registrada" });
      close(false);
    },
    onError: (e: Error) => {
      const field = e instanceof ApiError && e.field ? apiFieldMap[e.field] : undefined;
      if (field) {
        setErrors({ [field]: e.message });
        return;
      }
      // Zod errors come back as a JSON array: show a readable message instead
      const msg = errorMessage(e);
      setServerError(msg.trim().startsWith("[") ? "Confira os campos e tente novamente." : msg);
    },
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setServerError(null);
    const first = (Object.keys(fieldIds) as Field[]).find((k) => e[k]);
    if (first) {
      document.getElementById(fieldIds[first]!)?.focus();
      return;
    }
    createMutation.mutate();
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const noPsychologist = !psychologistId && !(isPsychologist && loadingPsychs);
  const fieldError = (k: Field) =>
    errors[k] ? (
      <p className={errorText} role="alert" id={`ne-${k}-error`}>{errors[k]}</p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <ModalHeader icon={FilePlus2} title="Nova Evolução" description="Registre a sessão clínica do paciente." />

        <form id="new-evolution-form" noValidate onSubmit={submit} className="mt-2 space-y-4">
          {noPsychologist && (
            <InfoBanner variant="warning" title="Paciente sem psicóloga vinculada">
              Vincule uma psicóloga ao paciente antes de registrar evoluções.
            </InfoBanner>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="ne-date">Data <span className="text-cp-danger">*</span></label>
              <IconField icon={CalendarIcon}>
                <Input id="ne-date" type="date" value={form.sessionDate} onChange={(e) => set("sessionDate")(e.target.value)} aria-invalid={!!errors.sessionDate} aria-describedby={errors.sessionDate ? "ne-sessionDate-error" : undefined} />
              </IconField>
              {fieldError("sessionDate")}
            </div>
            <div>
              <label className={fieldLabel} htmlFor="ne-time">Horário <span className="text-cp-danger">*</span></label>
              <IconField icon={Clock}>
                <Input id="ne-time" type="time" value={form.sessionTime} onChange={(e) => set("sessionTime")(e.target.value)} aria-invalid={!!errors.sessionTime} aria-describedby={errors.sessionTime ? "ne-sessionTime-error" : undefined} />
              </IconField>
              {fieldError("sessionTime")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={fieldLabel} htmlFor="ne-duration">Duração (min) <span className="text-cp-danger">*</span></label>
              <IconField icon={Timer}>
                <Input id="ne-duration" inputMode="numeric" value={form.duration} onChange={(e) => set("duration")(e.target.value)} aria-invalid={!!errors.duration} aria-describedby={errors.duration ? "ne-duration-error" : undefined} placeholder="50" />
              </IconField>
              {fieldError("duration")}
            </div>
            <div>
              <span className={fieldLabel}>Modalidade</span>
              <IconField icon={Monitor}>
                <Select value={form.sessionType} onValueChange={set("sessionType")}>
                  <SelectTrigger aria-label="Modalidade"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </IconField>
            </div>
            <div>
              <span className={fieldLabel}>Situação</span>
              <IconField icon={CircleCheck}>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger aria-label="Situação"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </IconField>
            </div>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="ne-notes">Evolução <span className="text-cp-danger">*</span></label>
            <CharCountTextarea id="ne-notes" max={5000} value={form.notes} onChange={(e) => set("notes")(e.target.value)} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? "ne-notes-error" : undefined} placeholder="Registro da sessão..." className="min-h-[140px]" />
            {fieldError("notes")}
          </div>
          <div>
            <label className={fieldLabel} htmlFor="ne-observations">Observações clínicas</label>
            <CharCountTextarea id="ne-observations" max={2000} value={form.observations} onChange={(e) => set("observations")(e.target.value)} aria-invalid={!!errors.observations} />
            {fieldError("observations")}
          </div>
          <div>
            <label className={fieldLabel} htmlFor="ne-next">Próximos passos</label>
            <CharCountTextarea id="ne-next" max={2000} value={form.nextSteps} onChange={(e) => set("nextSteps")(e.target.value)} aria-invalid={!!errors.nextSteps} />
            {fieldError("nextSteps")}
          </div>

          {errorCount > 0 && (
            <InfoBanner variant="danger" title={errorCount === 1 ? "Ajuste o campo marcado em vermelho" : `Ajuste os ${errorCount} campos marcados em vermelho`} />
          )}
          {serverError && <InfoBanner variant="danger" title="Não foi possível registrar a evolução">{serverError}</InfoBanner>}
        </form>

        <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
          <button type="button" className={cpButton.subtle} onClick={() => close(false)}>Cancelar</button>
          <button type="submit" form="new-evolution-form" className={cpButton.primary} disabled={createMutation.isPending || !psychologistId} data-testid="button-create-evolution">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
            {createMutation.isPending ? "Salvando..." : "Salvar evolução"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
