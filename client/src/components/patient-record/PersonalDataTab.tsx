import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit, Phone, Mail, MapPin, Briefcase, User, Shield, Heart, ChevronDown, Clock } from "lucide-react";
import { type Patient } from "@shared/schema";
import { useState } from "react";

interface PersonalDataTabProps {
    patient: Patient;
    onEdit: () => void;
}

const genderMap: Record<string, string> = {
    masculino: "Masculino",
    feminino: "Feminino",
    outro: "Outro",
    "prefiro não informar": "Prefiro não informar",
};
const maritalMap: Record<string, string> = {
    solteiro: "Solteiro(a)",
    casado: "Casado(a)",
    divorciado: "Divorciado(a)",
    viúvo: "Viúvo(a)",
    "união estável": "União Estável",
};

function Field({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-foreground font-medium">{value || "—"}</p>
        </div>
    );
}

export default function PersonalDataTab({ patient, onEdit }: PersonalDataTabProps) {
    const [obsOpen, setObsOpen] = useState(false);
    const updatedAt = patient.updatedAt
        ? new Date(patient.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <div className="space-y-4">
            {/* Last updated + Edit */}
            <div className="flex items-center justify-between">
                {updatedAt && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Última atualização: {updatedAt}
                    </span>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 ml-auto"
                    onClick={onEdit}
                    id="btn-edit-patient"
                >
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                </Button>
            </div>

            {/* Card 1 – Informações Básicas */}
            <Card className="border-neutral-100 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <User className="h-4 w-4 text-primary" />
                        Informações Básicas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nome Completo" value={patient.fullName} />
                    <Field label="CPF" value={patient.cpf} />
                    <Field
                        label="Data de Nascimento"
                        value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null}
                    />
                    <Field label="Gênero" value={patient.gender ? genderMap[patient.gender] ?? patient.gender : null} />
                    <Field label="Estado Civil" value={patient.maritalStatus ? maritalMap[patient.maritalStatus] ?? patient.maritalStatus : null} />
                    <Field label="Profissão" value={patient.profession} />
                </CardContent>
            </Card>

            {/* Card 2 – Contato */}
            <Card className="border-neutral-100 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        Contato
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <Field label="Telefone" value={patient.phone} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <Field label="E-mail" value={patient.email} />
                    </div>
                    <div className="md:col-span-2 flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                        <Field label="Endereço" value={patient.address} />
                    </div>
                </CardContent>
            </Card>

            {/* Card 3 – Administrativo */}
            <Card className="border-neutral-100 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        Informações Administrativas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Convênio" value={patient.insuranceProvider} />
                    <Field label="Contato de Emergência" value={patient.emergencyContactName} />
                    <Field label="Telefone de Emergência" value={patient.emergencyContactPhone} />
                    {patient.legalGuardianName && (
                        <>
                            <Field label="Responsável Legal" value={patient.legalGuardianName} />
                            <Field label="CPF do Responsável" value={patient.legalGuardianCpf} />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Observações Administrativas – colapsável */}
            <Collapsible open={obsOpen} onOpenChange={setObsOpen}>
                <Card className="border-neutral-100 shadow-sm">
                    <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-neutral-50 transition-colors rounded-xl">
                            <span className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-primary" />
                                Observações Administrativas
                            </span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${obsOpen ? "rotate-180" : ""}`} />
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="px-5 pb-5 pt-0">
                            <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        </div>
    );
}
