import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, CalendarDays, Plus, FileUp, ClipboardCheck, ArrowRightLeft } from "lucide-react";
import { type Patient } from "@shared/schema";
import TransferPatientModal from "./TransferPatientModal";

interface RecordHeaderProps {
    patient: Patient;
    onNewEvolution: () => void;
    onNewDocument: () => void;
    onNewAssessment: () => void;
}

function calculateAge(birthDate: string | null | undefined): string {
    if (!birthDate) return "—";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} anos`;
}

export default function RecordHeader({ patient, onNewEvolution, onNewDocument, onNewAssessment }: RecordHeaderProps) {
    const [, setLocation] = useLocation();
    const [transferOpen, setTransferOpen] = useState(false);

    const { data: currentUser } = useQuery<any>({ queryKey: ["/api/user"] });
    const isAdmin = currentUser?.role === "admin";

    const initials = patient.fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div className="mb-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <button
                    onClick={() => setLocation("/patients")}
                    className="hover:text-primary transition-colors font-medium"
                >
                    Pacientes
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="truncate max-w-[160px] text-foreground font-medium">
                    {patient.fullName}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-primary font-semibold">Prontuário</span>
            </nav>

            {/* Header Content */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                        {initials}
                    </div>

                    {/* Name + Info */}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">{patient.fullName}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {patient.birthDate && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {calculateAge(patient.birthDate)}
                                </span>
                            )}
                            <Badge
                                variant="outline"
                                className={
                                    patient.status === "active"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
                                        : "border-neutral-200 bg-neutral-100 text-neutral-600 text-xs"
                                }
                            >
                                {patient.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={onNewEvolution}
                        id="btn-new-evolution"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nova Evolução
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={onNewDocument}
                        id="btn-new-document"
                    >
                        <FileUp className="h-3.5 w-3.5" />
                        Documento
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={onNewAssessment}
                        id="btn-new-assessment"
                    >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Avaliação
                    </Button>

                    {/* Botão de transferência — somente admin */}
                    {isAdmin && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8 border-amber-400/50 text-amber-700 hover:bg-amber-50"
                            onClick={() => setTransferOpen(true)}
                            id="btn-transfer-patient"
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Transferir Paciente
                        </Button>
                    )}
                </div>
            </div>

            {/* Modal de transferência */}
            {isAdmin && (
                <TransferPatientModal
                    open={transferOpen}
                    onClose={() => setTransferOpen(false)}
                    patientId={patient.id}
                    patientName={patient.fullName}
                    currentPsychologistId={(patient as any).psychologistId ?? null}
                />
            )}
        </div>
    );
}

