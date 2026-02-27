import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Brain, ChevronDown, Save, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { type MedicalRecord } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AnamnesisTabProps {
    patientId: number;
}

type AnamnesisStatus = "empty" | "incomplete" | "in-progress" | "complete";

const statusConfig: Record<AnamnesisStatus, { label: string; color: string; icon: React.ReactNode }> = {
    empty: { label: "Não iniciada", color: "border-neutral-200 bg-neutral-50 text-neutral-500", icon: <AlertCircle className="h-3 w-3" /> },
    incomplete: { label: "Incompleta", color: "border-amber-200 bg-amber-50 text-amber-700", icon: <AlertCircle className="h-3 w-3" /> },
    "in-progress": { label: "Em andamento", color: "border-blue-200 bg-blue-50 text-blue-700", icon: <Clock className="h-3 w-3" /> },
    complete: { label: "Finalizada", color: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
};

function getStatus(record: MedicalRecord | null | undefined): AnamnesisStatus {
    if (!record) return "empty";
    const filled = [record.chiefComplaint, record.familyHistory, record.personalHistory, record.therapeuticObjectives].filter(Boolean).length;
    if (filled === 0) return "empty";
    if (filled < 2) return "incomplete";
    if (filled < 4) return "in-progress";
    return "complete";
}

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    field: keyof MedicalRecord;
    value: string;
    onChange: (field: keyof MedicalRecord, val: string) => void;
    placeholder?: string;
}

function Section({ title, icon, field, value, onChange, placeholder }: SectionProps) {
    const [open, setOpen] = useState(true);
    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="border border-neutral-100 rounded-xl overflow-hidden">
                <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-neutral-50 transition-colors text-left">
                        <span className="flex items-center gap-2 text-foreground">
                            {icon}
                            {title}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4">
                        <Textarea
                            rows={4}
                            className="resize-none text-sm border-neutral-200 focus:ring-primary/20"
                            placeholder={placeholder || `Descreva ${title.toLowerCase()}...`}
                            value={value}
                            onChange={(e) => onChange(field, e.target.value)}
                        />
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export default function AnamnesisTab({ patientId }: AnamnesisTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: record, isLoading } = useQuery<MedicalRecord | null>({
        queryKey: [`/api/patients/${patientId}/medical-record`],
        enabled: !!patientId,
    });

    const [form, setForm] = useState({
        chiefComplaint: "",
        familyHistory: "",
        personalHistory: "",
        currentMedications: false,
        medicationDetails: "",
        therapeuticObjectives: "",
    });

    useEffect(() => {
        if (record) {
            setForm({
                chiefComplaint: record.chiefComplaint || "",
                familyHistory: record.familyHistory || "",
                personalHistory: record.personalHistory || "",
                currentMedications: record.currentMedications || false,
                medicationDetails: record.medicationDetails || "",
                therapeuticObjectives: record.therapeuticObjectives || "",
            });
        }
    }, [record]);

    const saveMutation = useMutation({
        mutationFn: async (data: typeof form) => {
            return apiRequest("POST", `/api/patients/${patientId}/medical-record`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-record`] });
            const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            setSavedAt(now);
            setIsSaving(false);
        },
        onError: () => {
            setIsSaving(false);
            toast({ title: "Erro ao salvar", description: "Não foi possível salvar a anamnese.", variant: "destructive" });
        },
    });

    const handleChange = (field: keyof MedicalRecord, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setIsSaving(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            saveMutation.mutate({ ...form, [field]: value });
        }, 1200);
    };

    const status = getStatus(record);
    const statusCfg = statusConfig[status];

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Anamnese</span>
                    <Badge variant="outline" className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isSaving ? (
                        <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Salvando...
                        </span>
                    ) : savedAt ? (
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Salvo às {savedAt}
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Sections */}
            <Section
                title="Queixa Principal"
                icon={<span className="text-primary">🎯</span>}
                field="chiefComplaint"
                value={form.chiefComplaint}
                onChange={handleChange}
                placeholder="Descreva o motivo da busca pelo atendimento..."
            />
            <Section
                title="Histórico Pessoal"
                icon={<span className="text-primary">📖</span>}
                field="personalHistory"
                value={form.personalHistory}
                onChange={handleChange}
                placeholder="Histórico de vida, desenvolvimento e eventos relevantes..."
            />
            <Section
                title="Histórico Familiar"
                icon={<span className="text-primary">👨‍👩‍👧</span>}
                field="familyHistory"
                value={form.familyHistory}
                onChange={handleChange}
                placeholder="Dinâmica familiar, histórico de saúde mental na família..."
            />
            <Section
                title="Objetivos Terapêuticos"
                icon={<span className="text-primary">🎯</span>}
                field="therapeuticObjectives"
                value={form.therapeuticObjectives}
                onChange={handleChange}
                placeholder="Metas e objetivos para o processo terapêutico..."
            />

            {/* Save Button */}
            <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                id="btn-save-anamnesis"
            >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Anamnese
            </Button>
        </div>
    );
}
