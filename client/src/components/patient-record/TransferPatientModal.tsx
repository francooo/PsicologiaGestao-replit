import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PsychologistWithUser {
    id: number;
    userId: number;
    specialization: string | null;
    hourlyRate: string;
    user: {
        id: number;
        fullName: string;
        email: string;
        role: string;
        status: string;
    } | null;
}

interface TransferPatientModalProps {
    open: boolean;
    onClose: () => void;
    patientId: number;
    patientName: string;
    currentPsychologistId: number | null;
}

export default function TransferPatientModal({
    open,
    onClose,
    patientId,
    patientName,
    currentPsychologistId,
}: TransferPatientModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedPsychologistId, setSelectedPsychologistId] = useState<string>("");
    const [reason, setReason] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    // Buscar todos os psicólogos (já inclui o user embutido)
    const { data: psychologists = [], isLoading: loadingPsych } = useQuery<PsychologistWithUser[]>({
        queryKey: ["/api/psychologists"],
        enabled: open,
    });

    // Psicólogos disponíveis: excluir o atual e os sem usuário ativo
    const availablePsychologists = psychologists
        .filter((p) => p.id !== currentPsychologistId && p.user?.status === "active");

    const currentPsychologistName = psychologists.find((p) => p.id === currentPsychologistId)?.user?.fullName || null;


    const transferMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("PATCH", `/api/patients/${patientId}/transfer`, {
                toPsychologistId: parseInt(selectedPsychologistId),
                reason: reason.trim() || null,
            });
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Paciente transferido com sucesso",
                description: `${patientName} foi transferido para o novo psicólogo.`,
            });
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
            setShowConfirm(false);
            setSelectedPsychologistId("");
            setReason("");
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao transferir",
                description: error?.message || "Não foi possível realizar a transferência.",
                variant: "destructive",
            });
            setShowConfirm(false);
        },
    });

    function handleConfirm() {
        if (!selectedPsychologistId) return;
        setShowConfirm(true);
    }

    function handleClose() {
        setSelectedPsychologistId("");
        setReason("");
        onClose();
    }

    return (
        <>
            <Dialog open={open && !showConfirm} onOpenChange={(v) => !v && handleClose()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                            Transferir Paciente
                        </DialogTitle>
                        <DialogDescription>
                            Transfere <strong>{patientName}</strong> e todo o seu prontuário para outro psicólogo. O psicólogo anterior perderá o acesso imediatamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Psicólogo atual */}
                        <div>
                            <Label className="text-sm text-muted-foreground">Psicólogo atual</Label>
                            <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium text-foreground">
                                {currentPsychologistName || "Não vinculado"}
                            </div>
                        </div>

                        {/* Novo psicólogo */}
                        <div>
                            <Label className="text-sm mb-1.5 block">Transferir para *</Label>
                            {loadingPsych ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                                </div>
                            ) : (
                                <Select value={selectedPsychologistId} onValueChange={setSelectedPsychologistId}>
                                    <SelectTrigger id="select-target-psychologist">
                                        <SelectValue placeholder="Selecione o psicólogo de destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availablePsychologists.length === 0 ? (
                                            <SelectItem value="none" disabled>
                                                Nenhum outro psicólogo disponível
                                            </SelectItem>
                                        ) : (
                                            availablePsychologists.map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.user?.fullName || `Psicólogo #${p.userId}`}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Motivo */}
                        <div>
                            <Label className="text-sm mb-1.5 block">
                                Motivo da transferência <span className="text-muted-foreground">(opcional)</span>
                            </Label>
                            <Textarea
                                id="transfer-reason"
                                placeholder="Ex: Mudança de especialidade, encerramento de contrato..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={handleClose} id="btn-cancel-transfer">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!selectedPsychologistId}
                            className="gap-2 bg-amber-600 hover:bg-amber-700"
                            id="btn-confirm-transfer"
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                            Transferir Paciente
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AlertDialog de confirmação obrigatória */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar transferência</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação transferirá <strong>{patientName}</strong> e todo o seu prontuário para outro psicólogo.
                            O psicólogo anterior <strong>perderá o acesso imediatamente</strong>.
                            <br /><br />
                            <strong>Deseja continuar?</strong> Esta ação será registrada no histórico de auditoria.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel id="btn-cancel-transfer-confirm">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => transferMutation.mutate()}
                            disabled={transferMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700"
                            id="btn-execute-transfer"
                        >
                            {transferMutation.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Transferindo...</>
                            ) : (
                                "Sim, transferir"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
