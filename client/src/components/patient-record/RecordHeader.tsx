import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { patientStatus, statusOf } from "@/components/cp/status";
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
            <nav className="mb-4 flex items-center gap-1 text-sm text-cp-muted">
                <button
                    onClick={() => setLocation("/patients")}
                    className="font-medium transition-colors hover:text-cp-action"
                >
                    Pacientes
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="max-w-[160px] truncate font-medium text-cp-ink">
                    {patient.fullName}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-cp-action">Prontuário</span>
            </nav>

            {/* Header Content */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cp-action to-cp-action/70 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                        {initials}
                    </div>

                    {/* Name + Info */}
                    <div>
                        <h1 className="text-[28px] font-bold leading-tight text-cp-ink">{patient.fullName}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {patient.birthDate && (
                                <span className="flex items-center gap-1 text-sm text-cp-muted">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {calculateAge(patient.birthDate)}
                                </span>
                            )}
                            {(() => {
                                const st = statusOf(patientStatus, patient.status ?? "active");
                                return <StatusBadge label={st.label} tone={st.tone} />;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl border-cp-border bg-white text-[14px] text-cp-action hover:bg-cp-action-soft"
                        onClick={onNewEvolution}
                        id="btn-new-evolution"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Evolução
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl border-cp-border bg-white text-[14px] text-cp-action hover:bg-cp-action-soft"
                        onClick={onNewDocument}
                        id="btn-new-document"
                    >
                        <FileUp className="h-3.5 w-3.5" />
                        Documento
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-10 gap-1.5 rounded-xl border-cp-border bg-white text-[14px] text-cp-action hover:bg-cp-action-soft"
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
                            className="h-10 gap-1.5 rounded-xl border-cp-sand-ink/30 bg-cp-sand-soft text-[14px] text-cp-sand-ink hover:bg-cp-sand"
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

