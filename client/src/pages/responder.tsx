import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, ClockAlert, Heart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Public page (no auth, no sidebar) ────────────────────────────────────────

export default function ResponderPage() {
  const [, params] = useRoute("/responder/:token");
  const token = params?.token ?? "";

  const [answers, setAnswers] = useState<Record<number, { text?: string; choice?: string; scale?: number }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  // Fetch form
  const { data, isLoading, error } = useQuery<PublicFormData>({
    queryKey: ["/api/care/respond", token],
    queryFn: async () => {
      const res = await fetch(`/api/care/respond/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err: any = new Error(body.message ?? "Erro");
        err.status = res.status;
        err.code = body.error;
        throw err;
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch(`/api/care/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err: any = new Error(body.message ?? "Erro ao enviar");
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

  // Update an answer
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

    const payload = {
      answers: data.questions.map((q) => {
        const ans = answers[q.id] ?? {};
        return {
          dispatch_question_id: q.id,
          answer_text: q.questionType === "text" || q.questionType === "textarea" ? ans.text ?? null : null,
          answer_choice: q.questionType === "multiple_choice" ? ans.choice ?? null : null,
          answer_scale: q.questionType === "scale" ? ans.scale ?? null : null,
        };
      }),
    };
    submitMutation.mutate(payload);
  }

  // ─── Error: status 410 (expired) ─────────────────────────────────────────
  const status = (error as any)?.status;
  const code = (error as any)?.code;

  if (!isLoading && (status === 410 || code === "expired")) {
    return (
      <PublicShell clinicName="ConsultaPsi">
        <div className="text-center py-12 space-y-3">
          <ClockAlert className="h-12 w-12 mx-auto text-amber-400" />
          <h2 className="text-xl font-semibold text-neutral-700">Este link expirou</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            O prazo para responder este formulário já passou. Se precisar, entre em contato com sua psicóloga.
          </p>
        </div>
      </PublicShell>
    );
  }

  // ─── Error: status 409 (already answered) ────────────────────────────────
  if (!isLoading && (status === 409 || code === "already_answered")) {
    return (
      <PublicShell clinicName="ConsultaPsi">
        <div className="text-center py-12 space-y-3">
          <CheckCircle2 className="h-12 w-12 mx-auto text-teal-500" />
          <h2 className="text-xl font-semibold text-neutral-700">Formulário já respondido</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Você já enviou suas respostas para este formulário. Obrigada!
          </p>
        </div>
      </PublicShell>
    );
  }

  // ─── Error: not found / other ─────────────────────────────────────────────
  if (!isLoading && error && status !== 410 && status !== 409) {
    return (
      <PublicShell clinicName="ConsultaPsi">
        <div className="text-center py-12 space-y-3">
          <h2 className="text-xl font-semibold text-neutral-700">Formulário não encontrado</h2>
          <p className="text-sm text-muted-foreground">O link pode ser inválido ou ter expirado.</p>
        </div>
      </PublicShell>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !data) {
    return (
      <PublicShell clinicName="ConsultaPsi">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      </PublicShell>
    );
  }

  // ─── Success (after submission) ───────────────────────────────────────────
  if (submitted) {
    return (
      <PublicShell clinicName={data.clinicName} psychologistName={data.psychologistName}>
        <div className="text-center py-12 space-y-3">
          <CheckCircle2 className="h-14 w-14 mx-auto text-teal-500" />
          <h2 className="text-2xl font-semibold text-neutral-700">Obrigada, {data.patientFirstName}!</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Suas respostas foram registradas com sucesso. Sua psicóloga irá analisá-las.
          </p>
        </div>
      </PublicShell>
    );
  }

  // ─── Available form ───────────────────────────────────────────────────────
  const sortedQuestions = [...data.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <PublicShell clinicName={data.clinicName} psychologistName={data.psychologistName}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">{data.subject}</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Olá, <strong>{data.patientFirstName}</strong>! {data.psychologistName} enviou este formulário para você.
          </p>
          {data.customMessage && (
            <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
              {data.customMessage}
            </div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(submitMutation.error as any)?.message ?? "Erro ao enviar. Tente novamente."}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3"
          data-testid="btn-submit-form"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar Respostas
        </Button>
      </div>
    </PublicShell>
  );
}

// ─── Shell layout ─────────────────────────────────────────────────────────────

function PublicShell({
  children,
  clinicName = "ConsultaPsi",
  psychologistName,
}: {
  children: React.ReactNode;
  clinicName?: string;
  psychologistName?: string;
}) {
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {/* Header */}
        <header className="bg-teal-600 text-white px-4 py-4 shadow-md">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <Heart className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-base leading-tight">{clinicName}</p>
              {psychologistName && (
                <p className="text-xs text-teal-100">Psicóloga: {psychologistName}</p>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 py-8 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-4 text-center text-xs text-muted-foreground">
          🔒 Suas informações são confidenciais e usadas apenas para acompanhamento clínico.
        </footer>
      </div>
    </>
  );
}

// ─── Question field renderer ──────────────────────────────────────────────────

interface QuestionFieldProps {
  index: number;
  question: PublicQuestion;
  value?: { text?: string; choice?: string; scale?: number };
  onChange: (type: "text" | "choice" | "scale", value: string | number) => void;
  error?: string;
}

function QuestionField({ index, question, value, onChange, error }: QuestionFieldProps) {
  return (
    <div className="space-y-2" data-testid={`question-field-${question.id}`}>
      <label className="block text-sm font-medium text-neutral-700">
        {index}. {question.questionText}
        {question.isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {question.questionType === "text" && (
        <Input
          data-testid={`input-answer-${question.id}`}
          placeholder="Sua resposta…"
          value={value?.text ?? ""}
          onChange={(e) => onChange("text", e.target.value)}
          className={error ? "border-red-400" : ""}
        />
      )}

      {question.questionType === "textarea" && (
        <Textarea
          data-testid={`textarea-answer-${question.id}`}
          placeholder="Sua resposta…"
          rows={4}
          value={value?.text ?? ""}
          onChange={(e) => onChange("text", e.target.value)}
          className={`resize-none ${error ? "border-red-400" : ""}`}
        />
      )}

      {question.questionType === "scale" && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange("scale", n)}
                data-testid={`scale-btn-${question.id}-${n}`}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                  value?.scale === n
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-teal-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {value?.scale && (
            <p className="text-xs text-teal-600 font-medium">Você selecionou: {value.scale}</p>
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
              data-testid={`choice-btn-${question.id}-${opt}`}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                value?.choice === opt
                  ? "bg-teal-50 border-teal-500 text-teal-700 font-medium"
                  : "bg-white border-neutral-200 text-neutral-700 hover:border-teal-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
