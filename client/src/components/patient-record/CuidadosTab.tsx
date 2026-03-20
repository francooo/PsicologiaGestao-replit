import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Copy,
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  Send,
  Heart,
  Pencil,
} from "lucide-react";
import { type Patient } from "@shared/patient-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareTemplate {
  id: number;
  psychologistId: number | null;
  title: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CareTemplateQuestion {
  id: number;
  templateId: number;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  orderIndex: number;
}

interface CareDispatch {
  id: number;
  psychologistId: number;
  patientId: number;
  templateId: number | null;
  subject: string;
  customMessage: string | null;
  responseToken: string;
  tokenExpiresAt: string;
  status: "sent" | "opened" | "answered" | "expired";
  sentToEmail: string;
  sentAt: string;
  responseCount?: number;
}

interface DispatchResponse {
  dispatch: CareDispatch;
  questions: Array<{
    id: number;
    dispatchId: number;
    questionText: string;
    questionType: string;
    options: string[] | null;
    isRequired: boolean;
    orderIndex: number;
    response: {
      id: number;
      answerText: string | null;
      answerChoice: string | null;
      answerScale: number | null;
    } | null;
  }>;
}

// Editable question used in both the template editor and the inline dispatch preview
export interface EditableQuestion {
  _id: string;
  questionText: string;
  questionType: string;
  options: string[];
  isRequired: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function substituteVars(text: string, patient: Patient): string {
  const firstName = patient.fullName.split(" ")[0];
  return text
    .replace(/\{patient_name\}/g, firstName)
    .replace(/\{patient_full_name\}/g, patient.fullName);
}

function newQuestion(): EditableQuestion {
  return {
    _id: crypto.randomUUID(),
    questionText: "",
    questionType: "text",
    options: [],
    isRequired: true,
  };
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent:     { label: "Enviado",    color: "bg-blue-100 text-blue-700" },
  opened:   { label: "Aberto",     color: "bg-yellow-100 text-yellow-700" },
  answered: { label: "Respondido", color: "bg-green-100 text-green-700" },
  expired:  { label: "Expirado",   color: "bg-gray-100 text-gray-500" },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-500" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
      data-testid={`chip-status-${status}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Shared QuestionEditor ─────────────────────────────────────────────────────
// Used by BOTH SortableQuestionRow (template modal) and the inline dispatch preview

interface QuestionEditorProps {
  question: EditableQuestion;
  onUpdate: (field: string, value: string | boolean | string[]) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function QuestionEditor({
  question,
  onUpdate,
  onRemove,
  showRemove = true,
  dragHandleProps,
}: QuestionEditorProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-2 text-neutral-400 cursor-grab active:cursor-grabbing flex-shrink-0"
            data-testid="btn-drag-question"
            type="button"
            aria-label="Arrastar pergunta"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 space-y-2">
          <Input
            data-testid="input-question-text"
            placeholder="Texto da pergunta"
            value={question.questionText}
            onChange={(e) => onUpdate("questionText", e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={question.questionType}
              onValueChange={(v) => onUpdate("questionType", v)}
            >
              <SelectTrigger className="w-44" data-testid="select-question-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto curto</SelectItem>
                <SelectItem value="textarea">Texto longo</SelectItem>
                <SelectItem value="scale">Escala 1–10</SelectItem>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Switch
                id={`req-${question._id}`}
                checked={question.isRequired}
                onCheckedChange={(v) => onUpdate("isRequired", v)}
                data-testid="switch-required"
              />
              <Label htmlFor={`req-${question._id}`} className="text-xs text-muted-foreground cursor-pointer">
                Obrigatória
              </Label>
            </div>
          </div>
          {question.questionType === "multiple_choice" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Opções (uma por linha):</p>
              <Textarea
                data-testid="textarea-options"
                rows={3}
                placeholder={"Sim\nNão\nÀs vezes"}
                value={question.options.join("\n")}
                onChange={(e) => onUpdate("options", e.target.value.split("\n"))}
                className="text-sm"
              />
            </div>
          )}
        </div>
        {showRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-1 text-neutral-400 hover:text-destructive transition-colors flex-shrink-0"
            data-testid="btn-remove-question"
            aria-label="Remover pergunta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sortable row wrapper (template modal only) ───────────────────────────────

function SortableQuestionRow({
  id,
  question,
  onUpdate,
  onRemove,
}: {
  id: string;
  question: EditableQuestion;
  onUpdate: (id: string, field: string, value: string | boolean | string[]) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <QuestionEditor
        question={question}
        onUpdate={(field, value) => onUpdate(id, field, value)}
        onRemove={() => onRemove(id)}
        dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
      />
    </div>
  );
}

// ─── Template modal (create + edit) ──────────────────────────────────────────

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (t: CareTemplate) => void;
  existing?: CareTemplate & { questions?: CareTemplateQuestion[] };
}

function TemplateModal({ open, onClose, onSaved, existing }: TemplateModalProps) {
  const { toast } = useToast();
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [questions, setQuestions] = useState<EditableQuestion[]>(() => {
    if (existing?.questions?.length) {
      return [...existing.questions]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((q) => ({
          _id: crypto.randomUUID(),
          questionText: q.questionText,
          questionType: q.questionType,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          isRequired: q.isRequired,
        }));
    }
    return [newQuestion()];
  });

  // Reset state when modal reopened with new data
  useEffect(() => {
    if (open) {
      setTitle(existing?.title ?? "");
      setDescription(existing?.description ?? "");
      if (existing?.questions?.length) {
        setQuestions(
          [...existing.questions]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((q) => ({
              _id: crypto.randomUUID(),
              questionText: q.questionText,
              questionType: q.questionType,
              options: Array.isArray(q.options) ? (q.options as string[]) : [],
              isRequired: q.isRequired,
            }))
        );
      } else {
        setQuestions([newQuestion()]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        // 1. Update title + description
        const metaRes = await apiRequest("PATCH", `/api/care/templates/${existing!.id}`, {
          title,
          description,
        });
        const updatedTemplate = await metaRes.json() as CareTemplate;

        // 2. Atomically replace all questions via PUT endpoint
        await apiRequest(
          "PUT",
          `/api/care/templates/${existing!.id}/questions`,
          questions.map((q, i) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.questionType === "multiple_choice" ? q.options.filter(Boolean) : null,
            isRequired: q.isRequired,
            orderIndex: i,
          }))
        );
        return updatedTemplate;
      }
      // Create template with questions in a single request
      const res = await apiRequest("POST", "/api/care/templates", {
        title,
        description,
        questions: questions.map((q, i) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === "multiple_choice" ? q.options.filter(Boolean) : null,
          isRequired: q.isRequired,
          orderIndex: i,
        })),
      });
      const data = await res.json() as CareTemplate & { template?: CareTemplate };
      return data.template ?? data;
    },
    onSuccess: (data: CareTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/care/templates"] });
      onSaved(data);
      toast({ title: isEditing ? "Template atualizado" : "Template criado com sucesso" });
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((qs) => {
      const oldIdx = qs.findIndex((q) => q._id === String(active.id));
      const newIdx = qs.findIndex((q) => q._id === String(over.id));
      return arrayMove(qs, oldIdx, newIdx);
    });
  }

  function updateQuestion(id: string, field: string, value: string | boolean | string[]) {
    setQuestions((qs) => qs.map((q) => (q._id === id ? { ...q, [field]: value } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q._id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "Editar Template" : "Criar Novo Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="tpl-title">Nome do template *</Label>
            <Input
              id="tpl-title"
              data-testid="input-template-title"
              placeholder="Ex: Check-in Semanal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tpl-desc">Descrição (opcional)</Label>
            <Input
              id="tpl-desc"
              data-testid="input-template-description"
              placeholder="Breve descrição do propósito do formulário"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Variable hint */}
          <div className="text-xs text-muted-foreground bg-neutral-50 border border-neutral-200 rounded-md p-2">
            <strong>Variáveis:</strong>{" "}
            <code className="bg-white px-1 rounded border border-neutral-200">{"{patient_name}"}</code>{" "}
            ·{" "}
            <code className="bg-white px-1 rounded border border-neutral-200">{"{patient_full_name}"}</code>{" "}
            ·{" "}
            <code className="bg-white px-1 rounded border border-neutral-200">{"{psychologist_name}"}</code>
          </div>

          {/* Questions (editable in both create and edit modes) */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Perguntas</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questions.map((q) => (
                    <SortableQuestionRow
                      key={q._id}
                      id={q._id}
                      question={q}
                      onUpdate={updateQuestion}
                      onRemove={removeQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
              data-testid="btn-add-question"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar pergunta
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
            data-testid="btn-save-template"
            type="button"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar alterações" : "Criar template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Responses modal ──────────────────────────────────────────────────────────

function ResponsesModal({
  dispatchId,
  open,
  onClose,
}: {
  dispatchId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<DispatchResponse>({
    queryKey: ["/api/care/dispatches", dispatchId, "responses"],
    queryFn: async () => {
      const res = await fetch(`/api/care/dispatches/${dispatchId}/responses`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar respostas");
      return res.json() as Promise<DispatchResponse>;
    },
    enabled: open && !!dispatchId,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Respostas do Paciente</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 pr-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {data && data.questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma resposta registrada.
            </p>
          )}
          {data && (
            <div className="space-y-4">
              {data.questions.map((q, i) => (
                <div
                  key={q.id}
                  className="bg-neutral-50 rounded-lg p-3 space-y-1"
                  data-testid={`response-item-${q.id}`}
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {i + 1}. {q.questionText}
                    {q.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                  </p>
                  {!q.response ? (
                    <p className="text-sm text-muted-foreground italic">Não respondida</p>
                  ) : q.questionType === "scale" ? (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-teal-600" data-testid={`scale-answer-${q.id}`}>
                        {q.response.answerScale}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                  ) : q.questionType === "multiple_choice" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(q.options ?? []).map((opt) => (
                        <span
                          key={opt}
                          className={`px-2 py-0.5 rounded-full text-xs border ${
                            q.response?.answerChoice === opt
                              ? "bg-teal-100 border-teal-400 text-teal-700 font-semibold"
                              : "bg-white border-neutral-200 text-neutral-400"
                          }`}
                          data-testid={`choice-option-${q.id}-${opt}`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="bg-white border border-neutral-200 rounded p-2 text-sm"
                      data-testid={`text-answer-${q.id}`}
                    >
                      {q.response.answerText ?? (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main CuidadosTab ─────────────────────────────────────────────────────────

interface CuidadosTabProps {
  patient: Patient;
}

export default function CuidadosTab({ patient }: CuidadosTabProps) {
  const { toast } = useToast();
  const patientId = patient.id;

  const emailValid = !!patient.email && isValidEmail(patient.email);
  const firstName = patient.fullName.split(" ")[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  // Questions that the psychologist can edit inline before dispatch
  const [pendingQuestions, setPendingQuestions] = useState<EditableQuestion[]>([]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<
    (CareTemplate & { questions?: CareTemplateQuestion[] }) | undefined
  >(undefined);
  const [responsesDispatchId, setResponsesDispatchId] = useState<number | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<
    Array<CareTemplate & { questions: CareTemplateQuestion[] }>
  >({
    queryKey: ["/api/care/templates"],
  });

  const { data: dispatches = [], isLoading: loadingHistory } = useQuery<CareDispatch[]>({
    queryKey: ["/api/care/patients", patientId, "dispatches"],
    queryFn: async () => {
      const res = await fetch(`/api/care/patients/${patientId}/dispatches`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar histórico");
      return res.json() as Promise<CareDispatch[]>;
    },
  });

  // ── Template selection ────────────────────────────────────────────────────

  const handleTemplateChange = (val: string) => {
    if (val === "__new__") {
      setEditingTemplate(undefined);
      setShowTemplateModal(true);
      return;
    }
    setSelectedTemplateId(val);
    const tpl = templates.find((t) => t.id === parseInt(val));
    if (tpl) {
      setSubject(`${tpl.title} — ${firstName}`);
      // Populate editable inline questions with variable substitution
      setPendingQuestions(
        [...(tpl.questions ?? [])]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({
            _id: crypto.randomUUID(),
            questionText: substituteVars(q.questionText, patient),
            questionType: q.questionType,
            options: Array.isArray(q.options) ? (q.options as string[]) : [],
            isRequired: q.isRequired,
          }))
      );
    }
  };

  function updatePendingQuestion(id: string, field: string, value: string | boolean | string[]) {
    setPendingQuestions((qs) => qs.map((q) => (q._id === id ? { ...q, [field]: value } : q)));
  }

  function removePendingQuestion(id: string) {
    setPendingQuestions((qs) => qs.filter((q) => q._id !== id));
  }

  function addPendingQuestion() {
    setPendingQuestions((qs) => [...qs, newQuestion()]);
  }

  // ── Dispatch mutation ─────────────────────────────────────────────────────

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/care/patients/${patientId}/dispatch`, {
        template_id: parseInt(selectedTemplateId),
        subject: subject.trim() || undefined,
        custom_message: customMessage.trim() || undefined,
        // Include the inline-edited questions so backend can use the overridden text
        // (backend currently takes the snapshot from template; for pontual edits we
        //  send the preview questions as override_questions)
        override_questions: pendingQuestions.map((q, i) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === "multiple_choice" ? q.options.filter(Boolean) : null,
          isRequired: q.isRequired,
          orderIndex: i,
        })),
      });
      return res.json() as Promise<{ success: boolean; dispatch: CareDispatch; warning?: string; responseUrl?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/care/patients", patientId, "dispatches"] });
      if (data.warning) {
        toast({ title: "Formulário salvo", description: data.warning });
      } else {
        toast({ title: "Formulário enviado!", description: `E-mail enviado para ${patient.email}` });
      }
      setSubject("");
      setCustomMessage("");
      setSelectedTemplateId("");
      setPendingQuestions([]);
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!selectedTemplateId || !emailValid) return;
    dispatchMutation.mutate();
  };

  // ── Copy link ─────────────────────────────────────────────────────────────

  const copyLink = useCallback(
    (token: string) => {
      const url = `${window.location.origin}/responder/${token}`;
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: "Link copiado!", description: url });
      });
    },
    [toast]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* ── Left: Send panel (40%) ─────────────────────────────────────── */}
      <div className="md:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <Send className="h-4 w-4 text-teal-600" />
            Enviar Formulário
          </h3>

          {/* Email banner */}
          {emailValid ? (
            <div
              className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700"
              data-testid="banner-email-valid"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>E-mail válido:</strong> {patient.email}
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800"
              data-testid="banner-email-invalid"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Paciente sem e-mail válido.{" "}
                <a
                  href="#"
                  className="underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector<HTMLButtonElement>("[data-testid='tab-details']")?.click();
                  }}
                >
                  Atualizar perfil
                </a>
              </span>
            </div>
          )}

          {/* Template selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Template *</label>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger data-testid="select-template" disabled={loadingTemplates} className="flex-1">
                  <SelectValue placeholder={loadingTemplates ? "Carregando…" : "Selecione um template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.title}
                      {t.isDefault && (
                        <span className="ml-1 text-xs text-muted-foreground">(padrão)</span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__" className="text-teal-600 font-medium">
                    <Plus className="h-3 w-3 inline mr-1" />
                    Criar novo template…
                  </SelectItem>
                </SelectContent>
              </Select>
              {/* Edit template button — only for owned (non-system) templates */}
              {selectedTemplateId && (() => {
                const tpl = templates.find((t) => t.id === parseInt(selectedTemplateId));
                return tpl && tpl.psychologistId !== null ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setShowTemplateModal(true);
                    }}
                    data-testid="btn-edit-template"
                    title="Editar template"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Inline editable question preview */}
          {pendingQuestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500">
                Perguntas — edite antes de enviar:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pendingQuestions.map((q) => (
                  <QuestionEditor
                    key={q._id}
                    question={q}
                    onUpdate={(field, value) => updatePendingQuestion(q._id, field, value)}
                    onRemove={() => removePendingQuestion(q._id)}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addPendingQuestion}
                data-testid="btn-add-inline-question"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar pergunta
              </Button>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Assunto do e-mail</label>
            <Input
              data-testid="input-subject"
              placeholder={`Check-in — ${firstName}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Custom message */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">
              Mensagem personalizada (opcional)
            </label>
            <Textarea
              data-testid="textarea-custom-message"
              rows={3}
              placeholder="Uma mensagem curta que aparece no início do formulário…"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          {/* Send button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full block">
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={!selectedTemplateId || !emailValid || dispatchMutation.isPending}
                    onClick={handleSend}
                    data-testid="btn-send-form"
                  >
                    {dispatchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar Formulário para {firstName} ✉️
                  </Button>
                </span>
              </TooltipTrigger>
              {!emailValid && (
                <TooltipContent>
                  Adicione um e-mail válido ao perfil do paciente antes de enviar.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Right: History (60%) ─────────────────────────────────────────── */}
      <div className="md:col-span-3 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-400" />
          Histórico de Envios
        </h3>

        {loadingHistory && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loadingHistory && dispatches.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground bg-white rounded-xl border border-neutral-100 shadow-sm">
            <Heart className="h-8 w-8 mx-auto mb-2 text-teal-200" />
            Nenhum formulário enviado ainda.
          </div>
        )}

        <div className="space-y-2">
          {dispatches.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-neutral-100 shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-2"
              data-testid={`dispatch-card-${d.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusChip status={d.status} />
                  <span className="text-sm font-medium text-neutral-700 truncate">{d.subject}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(d.sentAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {d.sentToEmail}
                  {d.responseCount !== undefined && d.responseCount > 0 && (
                    <span className="ml-1 text-teal-600">· {d.responseCount} resp.</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.status === "answered" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setResponsesDispatchId(d.id)}
                    data-testid={`btn-ver-respostas-${d.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Respostas
                  </Button>
                )}
                {(d.status === "expired" || d.status === "opened" || d.status === "sent") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (d.templateId) setSelectedTemplateId(String(d.templateId));
                      setSubject(d.subject);
                    }}
                    data-testid={`btn-reenviar-${d.id}`}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reenviar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => copyLink(d.responseToken)}
                  data-testid={`btn-copy-link-${d.id}`}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      <TemplateModal
        open={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setEditingTemplate(undefined);
        }}
        onSaved={(t) => {
          setSelectedTemplateId(String(t.id));
          setSubject(`${t.title} — ${firstName}`);
        }}
        existing={editingTemplate}
      />

      {responsesDispatchId !== null && (
        <ResponsesModal
          dispatchId={responsesDispatchId}
          open={true}
          onClose={() => setResponsesDispatchId(null)}
        />
      )}
    </div>
  );
}
