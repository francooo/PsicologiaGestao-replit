import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Activity, FileText, FolderOpen, ClipboardList, Lock, ArrowLeft, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { insertPatientSchema, type Patient, type InsertPatient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import RecordHeader from "@/components/patient-record/RecordHeader";
import PersonalDataTab from "@/components/patient-record/PersonalDataTab";
import AnamnesisTab from "@/components/patient-record/AnamnesisTab";
import EvolutionsTab from "@/components/patient-record/EvolutionsTab";
import DocumentsTab from "@/components/patient-record/DocumentsTab";
import AssessmentsTab from "@/components/patient-record/AssessmentsTab";

const TAB_KEY = "prontuario_active_tab";

const TABS = [
    { value: "details", label: "Dados Pessoais", icon: User, countKey: null },
    { value: "anamnesis", label: "Anamnese", icon: Activity, countKey: null },
    { value: "sessions", label: "Evoluções", icon: FileText, countKey: "sessions" },
    { value: "documents", label: "Documentos", icon: FolderOpen, countKey: "documents" },
    { value: "assessments", label: "Avaliações", icon: ClipboardList, countKey: "assessments" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface TabCounts {
    sessions: number;
    documents: number;
    assessments: number;
}

export default function PatientRecord() {
    const [, params] = useRoute("/patients/:id/record");
    const [, setLocation] = useLocation();
    const id = params ? parseInt(params.id) : 0;
    const contentRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<TabValue>(() => {
        const saved = localStorage.getItem(TAB_KEY);
        return (saved as TabValue) || "details";
    });

    const [editOpen, setEditOpen] = useState(false);

    // New Evolution / Document / Assessment triggers
    const [triggerNewEvolution, setTriggerNewEvolution] = useState(0);
    const [triggerNewDocument, setTriggerNewDocument] = useState(0);
    const [triggerNewAssessment, setTriggerNewAssessment] = useState(0);

    const { data: patient, isLoading, error } = useQuery<Patient>({
        queryKey: [`/api/patients/${id}`],
        enabled: !!id,
        retry: (failureCount, err: any) => {
            if (err?.status === 403 || err?.status === 404) return false;
            return failureCount < 2;
        },
    });

    const { data: counts } = useQuery<TabCounts>({
        queryKey: [`/api/patients/${id}/counts`],
        enabled: !!id,
    });

    // Edit form
    const editForm = useForm<InsertPatient>({
        resolver: zodResolver(insertPatientSchema),
        defaultValues: {
            fullName: "",
            cpf: "",
            birthDate: "",
            gender: "",
            maritalStatus: "",
            profession: "",
            address: "",
            phone: "",
            email: "",
            emergencyContactName: "",
            emergencyContactPhone: "",
            insuranceProvider: "",
            legalGuardianName: "",
            legalGuardianCpf: "",
            status: "active",
        },
    });

    // When patient data loads, populate the form
    useEffect(() => {
        if (patient) {
            editForm.reset({
                fullName: patient.fullName ?? "",
                cpf: patient.cpf ?? "",
                birthDate: patient.birthDate
                    ? new Date(patient.birthDate).toISOString().split("T")[0]
                    : "",
                gender: patient.gender ?? "",
                maritalStatus: patient.maritalStatus ?? "",
                profession: patient.profession ?? "",
                address: patient.address ?? "",
                phone: patient.phone ?? "",
                email: patient.email ?? "",
                emergencyContactName: patient.emergencyContactName ?? "",
                emergencyContactPhone: patient.emergencyContactPhone ?? "",
                insuranceProvider: patient.insuranceProvider ?? "",
                legalGuardianName: patient.legalGuardianName ?? "",
                legalGuardianCpf: patient.legalGuardianCpf ?? "",
                status: patient.status ?? "active",
            });
        }
    }, [patient]);

    const updatePatientMutation = useMutation({
        mutationFn: async (data: InsertPatient) => {
            const payload: any = {
                ...data,
                birthDate: data.birthDate === "" ? null : data.birthDate,
                cpf: data.cpf === "" ? null : data.cpf,
                email: data.email === "" ? null : data.email,
                address: data.address === "" ? null : data.address,
                profession: data.profession === "" ? null : data.profession,
                gender: data.gender === "" ? null : data.gender,
                maritalStatus: data.maritalStatus === "" ? null : data.maritalStatus,
                emergencyContactName: data.emergencyContactName === "" ? null : data.emergencyContactName,
                emergencyContactPhone: data.emergencyContactPhone === "" ? null : data.emergencyContactPhone,
                insuranceProvider: data.insuranceProvider === "" ? null : data.insuranceProvider,
                legalGuardianName: data.legalGuardianName === "" ? null : data.legalGuardianName,
                legalGuardianCpf: data.legalGuardianCpf === "" ? null : data.legalGuardianCpf,
            };
            const res = await apiRequest("PUT", `/api/patients/${id}`, payload);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
            setEditOpen(false);
            toast({ title: "Dados atualizados", description: "As informações do paciente foram salvas com sucesso." });
        },
        onError: (err: any) => {
            toast({ title: "Erro ao salvar", description: err.message ?? "Tente novamente.", variant: "destructive" });
        },
    });

    function handleTabChange(tab: TabValue) {
        setActiveTab(tab);
        localStorage.setItem(TAB_KEY, tab);
        setTimeout(() => {
            contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }, 50);
    }

    function handleNewEvolution() {
        handleTabChange("sessions");
        setTimeout(() => setTriggerNewEvolution((n) => n + 1), 300);
    }
    function handleNewDocument() {
        handleTabChange("documents");
        setTimeout(() => setTriggerNewDocument((n) => n + 1), 300);
    }
    function handleNewAssessment() {
        handleTabChange("assessments");
        setTimeout(() => setTriggerNewAssessment((n) => n + 1), 300);
    }

    const isForbidden = (error as any)?.status === 403 || (error as any)?.message?.includes("403");

    if (isForbidden) {
        return (
            <div className="flex h-screen bg-neutral-lightest">
                <Sidebar />
                <div className="flex-1 overflow-y-auto ml-0 md:ml-64 pt-16 md:pt-0">
                    <MobileNav />
                    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
                        <div className="w-full max-w-md text-center">
                            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                                <ShieldX className="h-10 w-10 text-destructive" />
                            </div>
                            <h1 className="text-2xl font-bold text-neutral-800 mb-2">Acesso Negado</h1>
                            <p className="text-neutral-500 mb-1">
                                Você não possui permissão para visualizar este prontuário.
                            </p>
                            <p className="text-sm text-muted-foreground mb-8">
                                Este conteúdo é restrito ao psicólogo responsável ou ao administrador do sistema.
                            </p>
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => setLocation("/patients")}
                                data-testid="btn-voltar-pacientes"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para Pacientes
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) return <div className="p-8 text-neutral-500">Paciente não encontrado</div>;

    return (
        <div className="flex h-screen bg-neutral-lightest">
            <Sidebar />
            <div ref={contentRef} className="flex-1 overflow-y-auto overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
                <MobileNav />
                <main className="p-4 md:p-6 max-w-5xl mx-auto">
                    <RecordHeader
                        patient={patient}
                        onNewEvolution={handleNewEvolution}
                        onNewDocument={handleNewDocument}
                        onNewAssessment={handleNewAssessment}
                    />

                    <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabValue)} className="w-full">
                        <TabsList className="w-full justify-start flex-nowrap overflow-x-auto h-auto p-1 bg-white border border-neutral-100 rounded-xl shadow-sm mb-6 gap-0.5">
                            {TABS.map(({ value, label, icon: Icon, countKey }) => {
                                const count = countKey && counts ? counts[countKey as keyof TabCounts] : null;
                                return (
                                    <TabsTrigger
                                        key={value}
                                        value={value}
                                        data-testid={`tab-${value}`}
                                        className={[
                                            "relative flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                            "text-muted-foreground hover:text-primary hover:bg-primary/5",
                                            "data-[state=active]:text-primary data-[state=active]:bg-primary/10",
                                            "data-[state=active]:shadow-sm",
                                            "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full",
                                            "after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100",
                                            "after:transition-transform after:duration-300",
                                        ].join(" ")}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="whitespace-nowrap">{label}</span>
                                        {count !== null && count > 0 && (
                                            <span className="ml-0.5 bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                                {count}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        <div className="animate-in fade-in-0 duration-200">
                            <TabsContent value="details" className="mt-0">
                                <PersonalDataTab patient={patient} onEdit={() => setEditOpen(true)} />
                            </TabsContent>

                            <TabsContent value="anamnesis" className="mt-0">
                                <AnamnesisTab patientId={id} />
                            </TabsContent>

                            <TabsContent value="sessions" className="mt-0">
                                <EvolutionsTab
                                    patientId={id}
                                    onNewEvolution={() => { }}
                                />
                            </TabsContent>

                            <TabsContent value="documents" className="mt-0">
                                <DocumentsTab patientId={id} />
                            </TabsContent>

                            <TabsContent value="assessments" className="mt-0">
                                <AssessmentsTab
                                    patientId={id}
                                    onNewAssessment={() => { }}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
                </main>
            </div>

            {/* Edit Patient Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Editar Dados do Paciente</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        <Form {...editForm}>
                            <form
                                id="edit-patient-form"
                                onSubmit={editForm.handleSubmit((data) => updatePatientMutation.mutate(data))}
                                className="space-y-6 py-2"
                            >
                                {/* Informações Básicas */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações Básicas</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={editForm.control}
                                            name="fullName"
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>Nome Completo *</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-fullName" placeholder="Nome completo do paciente" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="cpf"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>CPF</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-cpf" placeholder="000.000.000-00" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="birthDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Data de Nascimento</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-birthDate" type="date" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="gender"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Gênero</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                                        <FormControl>
                                                            <SelectTrigger data-testid="select-gender">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="masculino">Masculino</SelectItem>
                                                            <SelectItem value="feminino">Feminino</SelectItem>
                                                            <SelectItem value="outro">Outro</SelectItem>
                                                            <SelectItem value="prefiro não informar">Prefiro não informar</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="maritalStatus"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Estado Civil</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                                        <FormControl>
                                                            <SelectTrigger data-testid="select-maritalStatus">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                                                            <SelectItem value="casado">Casado(a)</SelectItem>
                                                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                                                            <SelectItem value="viúvo">Viúvo(a)</SelectItem>
                                                            <SelectItem value="união estável">União Estável</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="profession"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Profissão</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-profession" placeholder="Ex: Engenheiro" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value ?? "active"}>
                                                        <FormControl>
                                                            <SelectTrigger data-testid="select-status">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="active">Ativo</SelectItem>
                                                            <SelectItem value="inactive">Inativo</SelectItem>
                                                            <SelectItem value="discharged">Alta</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Contato */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contato</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={editForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Telefone *</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-phone" placeholder="(00) 00000-0000" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>E-mail</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-email" type="email" placeholder="email@exemplo.com" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="address"
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>Endereço</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-address" placeholder="Rua, número, bairro, cidade, estado" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Administrativo */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações Administrativas</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={editForm.control}
                                            name="insuranceProvider"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Convênio</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-insuranceProvider" placeholder="Ex: Unimed" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="emergencyContactName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contato de Emergência</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-emergencyContactName" placeholder="Nome do contato" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="emergencyContactPhone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Telefone de Emergência</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-emergencyContactPhone" placeholder="(00) 00000-0000" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="legalGuardianName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Responsável Legal</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-legalGuardianName" placeholder="Nome do responsável" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="legalGuardianCpf"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>CPF do Responsável</FormLabel>
                                                    <FormControl>
                                                        <Input data-testid="input-legalGuardianCpf" placeholder="000.000.000-00" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>

                    <DialogFooter className="flex-shrink-0 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                            disabled={updatePatientMutation.isPending}
                            data-testid="btn-cancel-edit"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="edit-patient-form"
                            disabled={updatePatientMutation.isPending}
                            data-testid="btn-save-patient"
                        >
                            {updatePatientMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                            ) : (
                                "Salvar Alterações"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
