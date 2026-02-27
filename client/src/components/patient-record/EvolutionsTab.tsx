import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Archive, Monitor, Users, Calendar, Loader2 } from "lucide-react";
import { type ClinicalSession } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

interface EvolutionsTabProps {
    patientId: number;
    onNewEvolution: () => void;
}

function SkeletonTimeline() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-neutral-200 animate-pulse mt-1" />
                        <div className="w-0.5 flex-1 bg-neutral-100 mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                        <div className="h-4 w-32 bg-neutral-200 animate-pulse rounded mb-2" />
                        <div className="h-20 bg-neutral-100 animate-pulse rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function EvolutionsTab({ patientId, onNewEvolution }: EvolutionsTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [archiveTarget, setArchiveTarget] = useState<number | null>(null);

    const { data: sessions, isLoading } = useQuery<ClinicalSession[]>({
        queryKey: [`/api/patients/${patientId}/sessions`],
        enabled: !!patientId,
    });

    const archiveMutation = useMutation({
        mutationFn: (sessionId: number) =>
            apiRequest("PATCH", `/api/patients/sessions/${sessionId}/archive`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/sessions`] });
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/counts`] });
            toast({ title: "Evolução arquivada", description: "A evolução foi arquivada com sucesso." });
            setArchiveTarget(null);
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível arquivar a evolução.", variant: "destructive" });
        },
    });

    const filtered = (sessions || [])
        .filter((s) => s.isActive !== false)
        .filter((s) => {
            const matchesSearch = !search || s.evolutionNotes?.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === "all" || s.sessionType === typeFilter;
            return matchesSearch && matchesType;
        })
        .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    if (isLoading) return <SkeletonTimeline />;

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar nas evoluções..."
                        className="pl-9 h-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="in-person">Presencial</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90 h-9"
                    onClick={onNewEvolution}
                    id="btn-new-evolution-tab"
                >
                    <Plus className="h-4 w-4" />
                    Nova Evolução
                </Button>
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 rounded-xl">
                    <Calendar className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-neutral-500">Nenhuma evolução encontrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Registre a primeira sessão clínica</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onNewEvolution}>
                        <Plus className="h-3.5 w-3.5" />
                        Nova Evolução
                    </Button>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-primary/15 rounded-full" />
                    <div className="space-y-6 pl-8">
                        {filtered.map((session) => (
                            <div key={session.id} className="relative group">
                                {/* Dot */}
                                <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-primary/80 border-2 border-white shadow-sm" />

                                {/* Card */}
                                <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-sm text-foreground">
                                                {format(new Date(session.sessionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </span>
                                            <span className="text-muted-foreground text-xs">· {session.sessionTime?.slice(0, 5)}</span>
                                            <Badge
                                                variant="outline"
                                                className={`flex items-center gap-1 text-xs ${session.sessionType === "online"
                                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    }`}
                                            >
                                                {session.sessionType === "online" ? (
                                                    <Monitor className="h-2.5 w-2.5" />
                                                ) : (
                                                    <Users className="h-2.5 w-2.5" />
                                                )}
                                                {session.sessionType === "online" ? "Online" : "Presencial"}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive gap-1.5"
                                            onClick={() => setArchiveTarget(session.id)}
                                        >
                                            <Archive className="h-3.5 w-3.5" />
                                            <span className="text-xs">Arquivar</span>
                                        </Button>
                                    </div>
                                    {/* Content */}
                                    <div className="px-4 py-4">
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {session.evolutionNotes}
                                        </p>
                                        {session.nextSteps && (
                                            <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                                <p className="text-xs font-semibold text-primary mb-1">Próximos passos</p>
                                                <p className="text-xs text-foreground">{session.nextSteps}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Archive Confirmation */}
            <AlertDialog open={archiveTarget !== null} onOpenChange={() => setArchiveTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar evolução?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta evolução será arquivada e não aparecerá mais na lista. Esta ação pode ser revertida
                            pelo administrador.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
                            disabled={archiveMutation.isPending}
                        >
                            {archiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Arquivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
