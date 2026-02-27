import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Activity, FileText, FolderOpen, ClipboardList, Lock, ArrowLeft, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Patient } from "@shared/schema";

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

    const [activeTab, setActiveTab] = useState<TabValue>(() => {
        const saved = localStorage.getItem(TAB_KEY);
        return (saved as TabValue) || "details";
    });

    // New Evolution / Document / Assessment triggers
    const [triggerNewEvolution, setTriggerNewEvolution] = useState(0);
    const [triggerNewDocument, setTriggerNewDocument] = useState(0);
    const [triggerNewAssessment, setTriggerNewAssessment] = useState(0);

    const { data: patient, isLoading, error } = useQuery<Patient>({
        queryKey: [`/api/patients/${id}`],
        enabled: !!id,
        retry: (failureCount, err: any) => {
            // Do not retry on 403/404
            if (err?.status === 403 || err?.status === 404) return false;
            return failureCount < 2;
        },
    });

    const { data: counts } = useQuery<TabCounts>({
        queryKey: [`/api/patients/${id}/counts`],
        enabled: !!id,
    });

    function handleTabChange(tab: TabValue) {
        setActiveTab(tab);
        localStorage.setItem(TAB_KEY, tab);
        // Scroll to top on tab switch
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

    // 403 — Acesso negado
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
                                id="btn-voltar-pacientes"
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
                    {/* Enhanced Header */}
                    <RecordHeader
                        patient={patient}
                        onNewEvolution={handleNewEvolution}
                        onNewDocument={handleNewDocument}
                        onNewAssessment={handleNewAssessment}
                    />

                    {/* Enhanced Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabValue)} className="w-full">
                        {/* Tab Navigation */}
                        <TabsList className="w-full justify-start flex-nowrap overflow-x-auto h-auto p-1 bg-white border border-neutral-100 rounded-xl shadow-sm mb-6 gap-0.5">
                            {TABS.map(({ value, label, icon: Icon, countKey }) => {
                                const count = countKey && counts ? counts[countKey as keyof TabCounts] : null;
                                return (
                                    <TabsTrigger
                                        key={value}
                                        value={value}
                                        id={`tab-${value}`}
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

                        {/* Tab Contents with fade animation */}
                        <div className="animate-in fade-in-0 duration-200">
                            <TabsContent value="details" className="mt-0">
                                <PersonalDataTab patient={patient} onEdit={() => { }} />
                            </TabsContent>

                            <TabsContent value="anamnesis" className="mt-0">
                                <AnamnesisTab patientId={id} />
                            </TabsContent>

                            <TabsContent value="sessions" className="mt-0">
                                <EvolutionsTab
                                    patientId={id}
                                    onNewEvolution={() => {
                                        /* open new evolution dialog — to implement */
                                    }}
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
        </div>
    );
}
