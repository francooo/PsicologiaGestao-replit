import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, ClockAlert, Send, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cpButton } from "@/components/cp/PageHeader";
import { InfoBanner } from "@/components/cp/fields";
import { PublicShell, PublicState } from "@/components/cp/PublicShell";
import { cn } from "@/lib/utils";

interface PublicQuestion {
  id: number;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  orderIndex: number;
}

interface PublicFormData {
  clinicName: string;
  patientFirstName: string;
  psychologistName: string;
  subject: string;
  customMessage: string | null;
  questions: PublicQuestion[];
}

interface AnswerValue {
  text?: string;
  choice?: string;
  scale?: number;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export default function ResponderPage() {
  const [, params] = useRoute("/responder/:token");
  const token = params?.token ?? "";

  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const { data, isLoading, error } = useQuery<PublicFormData, ApiError>({
    queryKey: ["/api/care/respond", token],
    queryFn: async () => {
      const res = await fetch(`/api/care/respond/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
        const err = new Error(body.message ?? "Erro") as ApiError;
        err.status = res.status;
        err.code = body.error;
        throw err;
      }
      return res.json() as Promise<PublicFormData>;
    },
    retry: false,
    enabled: !!token,
  });

  interface SubmitPayload {
    answers: Array<{
      dispatch_question_id: number;
      answer_text: string | null;
      answer_choice: string | null;
      answer_scale: number | null;
    }>;
  }

  const submitMutation = useMutation({
    mutationFn: async (payload: SubmitPayload) => {
      const res = await fetch(`/api/care/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
        const err = new Error(body.message ?? "Erro ao enviar") as ApiError;
        err.status = res.status;
        err.code = body.error;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  function setAnswer(qId: number, type: "text" | "choice" | "scale", value: string | number) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], [type]: value },
    }));
    if (validationErrors[qId]) {
      setValidationErrors((prev) => {
        const n = { ...prev };
        delete n[qId];
        return n;
      });
    }
  }

  function validate(questions: PublicQuestion[]): boolean {
    const errors: Record<number, string> = {};
    for (const q of questions) {
      if (!q.isRequired) continue;
      const ans = answers[q.id];
      const hasValue =
        (ans?.text && ans.text.trim()) ||
        (ans?.choice && ans.choice.trim()) ||
        ans?.scale != null;
      if (!hasValue) {
        errors[q.id] = "Esta pergunta é obrigatória.";
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!data) return;
    if (!validate(data.questions)) return;

    const payload: SubmitPayload = {
      answers: data.questions.map((q) => {
        const ans = answers[q.id] ?? {};
        return {
          dispatch_question_id: q.id,
          answer_text:
            q.questionType === "text" || q.questionType === "textarea"
              ? ans.text ?? null
              : null,
          answer_choice: q.questionType === "multiple_choice" ? ans.choice ?? null : null,
          answer_scale: q.questionType === "scale" ? ans.scale ?? null : null,
        };
      }),
    };
    submitMutation.mutate(payload);
  }

  const apiError = error as ApiError | null;
  const status = apiError?.status;
  const code = apiError?.code;

  if (!isLoading && (status === 410 || code === "expired")) {
    return (
      <PublicShell>
        <PublicState icon={<ClockAlert className="h-8 w-8 text-cp-warning" />} title="Este link expirou">
          O prazo para responder este formulário já passou. Se precisar, entre em contato com sua psicóloga.
        </PublicState>
      </PublicShell>
    );
  }

  if (!isLoading && (status === 409 || code === "already_answered")) {
    return (
      <PublicShell>
        <PublicState icon={<CheckCircle2 className="h-8 w-8 text-cp-success" />} title="Formulário já respondido">
          Você já enviou suas respostas para este formulário. Obrigada!
        </PublicState>
      </PublicShell>
    );
  }

  if (!isLoading && error && status !== 410 && status !== 409) {
    return (
      <PublicShell>
        <PublicState icon={<SearchX className="h-8 w-8 text-cp-sage-ink" />} title="Formulário não encontrado">
          O link pode ser inválido ou ter expirado.
        </PublicState>
      </PublicShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PublicShell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
        </div>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell clinicName={data.clinicName} psychologistName={data.psychologistName}>
        <PublicState icon={<CheckCircle2 className="h-8 w-8 text-cp-success" />} title={`Obrigada, ${data.patientFirstName}!`}>
          Suas respostas foram registradas com sucesso. Sua psicóloga irá analisá-las.
        </PublicState>
      </PublicShell>
    );
  }

  const sortedQuestions = [...data.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <PublicShell clinicName={data.clinicName} psychologistName={data.psychologistName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-bold text-cp-ink">{data.subject}</h1>
          <p className="mt-1 text-sm text-cp-muted">
            Olá, <strong>{data.patientFirstName}</strong>!{" "}
            {data.psychologistName} enviou este formulário para você.
          </p>
          {data.customMessage && (
            <InfoBanner variant="success" className="mt-3">
              <span className="whitespace-pre-wrap text-cp-ink">{data.customMessage}</span>
            </InfoBanner>
          )}
        </div>

        <div className="space-y-5">
          {sortedQuestions.map((q, i) => (
            <QuestionField
              key={q.id}
              index={i + 1}
              question={q}
              value={answers[q.id]}
              onChange={(type, val) => setAnswer(q.id, type, val)}
              error={validationErrors[q.id]}
            />
          ))}
        </div>

        {submitMutation.isError && (
          <div role="alert" className="rounded-xl border border-cp-danger/30 bg-cp-danger-soft px-4 py-3 text-sm text-cp-danger">
            {(submitMutation.error as ApiError)?.message ?? "Erro ao enviar. Tente novamente."}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className={cn(cpButton.primary, "h-12 w-full")}
          data-testid="btn-submit-form"
        >
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar Respostas
        </button>
      </div>
    </PublicShell>
  );
}

interface QuestionFieldProps {
  index: number;
  question: PublicQuestion;
  value?: AnswerValue;
  onChange: (type: "text" | "choice" | "scale", value: string | number) => void;
  error?: string;
}

function QuestionField({ index, question, value, onChange, error }: QuestionFieldProps) {
  return (
    <div className="space-y-2" data-testid={`question-field-${question.id}`}>
      <label className="block text-[15px] font-medium text-cp-ink">
        {index}. {question.questionText}
        {question.isRequired && <span className="ml-0.5 text-cp-danger">*</span>}
      </label>

      {question.questionType === "text" && (
        <Input
          data-testid={`input-answer-${question.id}`}
          placeholder="Sua resposta…"
          value={value?.text ?? ""}
          onChange={(e) => onChange("text", e.target.value)}
          aria-invalid={!!error}
          className={cn("h-11 rounded-xl border-cp-border focus-visible:ring-cp-action", error && "border-cp-danger")}
        />
      )}

      {question.questionType === "textarea" && (
        <Textarea
          data-testid={`textarea-answer-${question.id}`}
          placeholder="Sua resposta…"
          rows={4}
          value={value?.text ?? ""}
          onChange={(e) => onChange("text", e.target.value)}
          aria-invalid={!!error}
          className={cn("resize-none rounded-xl border-cp-border focus-visible:ring-cp-action", error && "border-cp-danger")}
        />
      )}

      {question.questionType === "scale" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.questionText}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange("scale", n)}
                role="radio"
                aria-checked={value?.scale === n}
                data-testid={`scale-btn-${question.id}-${n}`}
                className={cn(
                  "h-11 w-11 rounded-full border text-sm font-semibold transition-colors",
                  value?.scale === n
                    ? "border-cp-action bg-cp-action text-white"
                    : "border-cp-border bg-white text-cp-ink hover:border-cp-sage hover:bg-cp-sage-soft/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {value?.scale !== undefined && (
            <p className="text-xs font-medium text-cp-action">
              Você selecionou: {value.scale}
            </p>
          )}
        </div>
      )}

      {question.questionType === "multiple_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange("choice", opt)}
              aria-pressed={value?.choice === opt}
              data-testid={`choice-btn-${question.id}-${opt}`}
              className={cn(
                "min-h-[44px] w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors",
                value?.choice === opt
                  ? "border-cp-sage bg-cp-sage-soft font-medium text-cp-sage-ink"
                  : "border-cp-border bg-white text-cp-ink hover:border-cp-sage",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-0.5 text-xs text-cp-danger">{error}</p>}
    </div>
  );
}
