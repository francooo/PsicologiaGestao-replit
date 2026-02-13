import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, FileText, Activity, FolderOpen, ClipboardList, Plus } from "lucide-react";
import { Loader2 } from "lucide-react";
import { type Patient, type ClinicalSession } from "@shared/schema";

function SessionsList({ patientId }: { patientId: number }) {
    const { data: sessions, isLoading } = useQuery<ClinicalSession[]>({
        queryKey: [`/api/patients/${patientId}/sessions`],
        enabled: !!patientId
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!sessions || sessions.length === 0) {
        return (
            <div className="text-center py-8 bg-white rounded-lg border border-dashed border-neutral-light">
                <p className="text-neutral-dark">Nenhuma evolução registrada para este paciente.</p>
                <Button variant="link" className="text-primary mt-2">
                    Criar primeira evolução
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => (
                <Card key={session.id} className="overflow-hidden">
                    <div className="bg-neutral-lightest px-6 py-3 border-b border-neutral-light flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-darkest">
                                {new Date(session.sessionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                            <span className="text-neutral-dark text-sm">• {session.sessionTime}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${session.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : 'bg-neutral-dark/10 text-neutral-dark'
                            }`}>
                            {session.status === 'completed' ? 'Realizada' : session.status}
                        </span>
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm text-neutral-darkest whitespace-pre-wrap leading-relaxed">
                            {session.evolutionNotes}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function PatientRecord() {
    const [, params] = useRoute("/patients/:id/record");
    const [, setLocation] = useLocation();
    const id = params ? parseInt(params.id) : 0;

    const { data: patient, isLoading } = useQuery<Patient>({
        queryKey: [`/api/patients/${id}`],
        enabled: !!id
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-lightest">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!patient) return <div>Paciente não encontrado</div>;

    return (
        <div className="flex h-screen bg-neutral-lightest">
            <Sidebar />
            <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
                <MobileNav />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Button variant="ghost" onClick={() => setLocation("/patients")} className="mb-4 pl-0 hover:pl-2 transition-all">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Pacientes
                        </Button>

                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-darkest">{patient.fullName}</h1>
                                <p className="text-neutral-dark">Prontuário Eletrônico</p>
                            </div>
                            <div className="flex space-x-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${patient.status === 'active'
                                    ? 'bg-success bg-opacity-10 text-success'
                                    : 'bg-neutral-dark bg-opacity-10 text-neutral-dark'
                                    }`}>
                                    {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="details" className="w-full space-y-6">
                        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-white border border-neutral-light rounded-lg">
                            <TabsTrigger value="details" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <User className="mr-2 h-4 w-4" /> Dados Pessoais
                            </TabsTrigger>
                            <TabsTrigger value="anamnesis" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <Activity className="mr-2 h-4 w-4" /> Anamnese
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <FileText className="mr-2 h-4 w-4" /> Evoluções
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <FolderOpen className="mr-2 h-4 w-4" /> Documentos
                            </TabsTrigger>
                            <TabsTrigger value="assessments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <ClipboardList className="mr-2 h-4 w-4" /> Avaliações
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados do Paciente</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-neutral-dark">CPF</p>
                                            <p>{patient.cpf || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-dark">Data de Nascimento</p>
                                            <p>{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-dark">Telefone</p>
                                            <p>{patient.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-dark">Email</p>
                                            <p>{patient.email || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium text-neutral-dark">Endereço</p>
                                            <p>{patient.address || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-dark">Profissão</p>
                                            <p>{patient.profession || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="anamnesis">
                            <div className="text-center py-8 text-neutral-dark">Módulo de Anamnese em desenvolvimento</div>
                        </TabsContent>

                        <TabsContent value="sessions">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-neutral-darkest">Evoluções e Sessões</h3>
                                <Button className="bg-primary hover:bg-primary-dark text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Nova Evolução
                                </Button>
                            </div>
                            <SessionsList patientId={id} />
                        </TabsContent>

                        <TabsContent value="documents">
                            <div className="text-center py-8 text-neutral-dark">Módulo de Documentos em desenvolvimento</div>
                        </TabsContent>

                        <TabsContent value="assessments">
                            <div className="text-center py-8 text-neutral-dark">Módulo de Avaliações em desenvolvimento</div>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}
