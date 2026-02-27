import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardCheck, Calendar, FileText, Loader2 } from "lucide-react";
import { type PsychologicalAssessment } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

interface AssessmentsTabProps {
    patientId: number;
    onNewAssessment: () => void;
}

function SkeletonAssessments() {
    return (
        <div className="space-y-3">
            {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-neutral-100 animate-pulse rounded-xl" />
            ))}
        </div>
    );
}

export default function AssessmentsTab({ patientId, onNewAssessment }: AssessmentsTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        assessmentName: "",
        assessmentDate: new Date().toISOString().slice(0, 10),
        results: "",
        observations: "",
        psychologistId: 1, // default, idealmente pego do contexto do usuário
    });

    const { data: assessments, isLoading } = useQuery<PsychologicalAssessment[]>({
        queryKey: [`/api/patients/${patientId}/assessments`],
        enabled: !!patientId,
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof form) =>
            apiRequest("POST", `/api/patients/${patientId}/assessments`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/assessments`] });
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/counts`] });
            toast({ title: "Avaliação criada", description: "Avaliação registrada com sucesso." });
            setShowForm(false);
            setForm({ assessmentName: "", assessmentDate: new Date().toISOString().slice(0, 10), results: "", observations: "", psychologistId: 1 });
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível criar a avaliação.", variant: "destructive" });
        },
    });

    if (isLoading) return <SkeletonAssessments />;

    // Group by assessment name for comparisons
    const grouped = (assessments || []).reduce<Record<string, PsychologicalAssessment[]>>((acc, a) => {
        const key = a.assessmentName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(a);
        return acc;
    }, {});

    return (
        <div>
            {/* Toolbar */}
            <div className="flex justify-end mb-5">
                <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90 h-9"
                    onClick={() => setShowForm(true)}
                    id="btn-new-assessment-tab"
                >
                    <Plus className="h-4 w-4" />
                    Nova Avaliação
                </Button>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 rounded-xl">
                    <ClipboardCheck className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-neutral-500">Nenhuma avaliação registrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Adicione instrumentos de avaliação psicológica</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setShowForm(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Nova Avaliação
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(grouped).map(([name, apps]) => (
                        <div key={name} className="space-y-2">
                            {/* Instrument header */}
                            <div className="flex items-center gap-2 px-1">
                                <ClipboardCheck className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                                <Badge variant="outline" className="text-xs border-primary/20 bg-primary/5 text-primary">
                                    {apps.length} aplicação{apps.length !== 1 ? "ões" : ""}
                                </Badge>
                            </div>

                            {/* Applications */}
                            <div className="space-y-2">
                                {apps.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()).map((a, idx) => (
                                    <div
                                        key={a.id}
                                        className="flex items-start gap-4 p-4 bg-white border border-neutral-100 rounded-xl shadow-sm"
                                    >
                                        {/* Application number marker */}
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                            #{apps.length - idx}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(a.assessmentDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                            {a.results && (
                                                <div className="mt-1 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                                                    <p className="text-xs font-semibold text-primary mb-0.5">Resultado</p>
                                                    <p className="text-sm text-foreground">{a.results}</p>
                                                </div>
                                            )}
                                            {a.observations && (
                                                <div className="mt-2 flex items-start gap-1.5">
                                                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-muted-foreground">{a.observations}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Assessment Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Avaliação Psicológica</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="assessment-name" className="text-sm">Nome do Instrumento *</Label>
                            <Input
                                id="assessment-name"
                                placeholder="Ex: BDI-II, WAIS, HTP..."
                                value={form.assessmentName}
                                onChange={(e) => setForm((p) => ({ ...p, assessmentName: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="assessment-date" className="text-sm">Data da Aplicação *</Label>
                            <Input
                                id="assessment-date"
                                type="date"
                                value={form.assessmentDate}
                                onChange={(e) => setForm((p) => ({ ...p, assessmentDate: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="assessment-results" className="text-sm">Resultado Principal</Label>
                            <Input
                                id="assessment-results"
                                placeholder="Ex: Depressão grave (escore: 38)"
                                value={form.results}
                                onChange={(e) => setForm((p) => ({ ...p, results: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="assessment-obs" className="text-sm">Observações</Label>
                            <Textarea
                                id="assessment-obs"
                                rows={3}
                                placeholder="Notas clínicas sobre a aplicação..."
                                value={form.observations}
                                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                                className="mt-1 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => createMutation.mutate(form)}
                            disabled={!form.assessmentName || !form.assessmentDate || createMutation.isPending}
                        >
                            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
