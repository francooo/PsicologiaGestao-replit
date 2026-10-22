import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Patient, type InsertPatient } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, Plus, Search, FileText, UserPlus } from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { IconField, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { patientStatus, statusOf } from "@/components/cp/status";
import { cn } from "@/lib/utils";

// Soft alternating row tints from the mockup (white / lavender / white / sand)
const rowTint = ["", "bg-cp-lavender-soft/70", "", "bg-cp-sand-soft/80"];

type PatientWithPsychologist = Patient & { psychologistName?: string | null };

export default function PatientsList() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    // Fetch patients
    const { data: patients, isLoading } = useQuery<PatientWithPsychologist[]>({
        queryKey: ["/api/patients"],
    });

    // Filter patients
    const filteredPatients = patients?.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.cpf && patient.cpf.includes(searchTerm)) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Form setup
    const form = useForm<InsertPatient>({
        resolver: zodResolver(insertPatientSchema),
        defaultValues: {
            fullName: "",
            cpf: "",
            phone: "",
            email: "",
            gender: "other", // Default value matching schema enum if possible, or string
            maritalStatus: "single",
            address: "",
            profession: "",
            status: "active"
        }
    });

    // Create patient mutation
    const createPatientMutation = useMutation({
        mutationFn: async (data: InsertPatient) => {
            const res = await apiRequest("POST", "/api/patients", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
            setIsOpen(false);
            form.reset();
            toast({
                title: "Sucesso",
                description: "Paciente cadastrado com sucesso!",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    function onSubmit(data: InsertPatient) {
        // Transform empty strings to null for nullable fields
        const formattedData: any = {
            ...data,
            birthDate: data.birthDate === "" ? null : data.birthDate,
            cpf: data.cpf === "" ? null : data.cpf,
            email: data.email === "" ? null : data.email,
            address: data.address === "" ? null : data.address,
            profession: data.profession === "" ? null : data.profession,
        };
        createPatientMutation.mutate(formattedData);
    }

    return (
        <div className="flex h-screen bg-cp-bg">
            <Sidebar />
            <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
                <MobileNav />
                <main className="p-4 sm:px-7 sm:py-6">
                    <PageHeader
                        className="mb-6"
                        title="Pacientes"
                        subtitle="Gerencie seus pacientes e prontuários."
                        phrase
                        actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <button type="button" className={cpButton.primary} data-testid="button-new-patient">
                                    <Plus className="h-4 w-4" /> Novo Paciente
                                </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                                <ModalHeader icon={UserPlus} title="Cadastrar Novo Paciente" description="Preencha os dados básicos; o restante pode ser completado no prontuário." />
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-cp-border [&_input]:focus-visible:ring-cp-action">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="fullName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nome Completo*</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Nome do paciente" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="cpf"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>CPF</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="000.000.000-00" {...field} value={field.value || ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="birthDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Data de Nascimento</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Telefone*</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="(00) 00000-0000" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="email@exemplo.com" {...field} value={field.value || ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="profession"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Profissão</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ex: Engenheiro" {...field} value={field.value || ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <button type="submit" className={cn(cpButton.primary, "w-full")} disabled={createPatientMutation.isPending}>
                                            {createPatientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                            Cadastrar
                                        </button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                        }
                    />

                    <div className="rounded-2xl border border-cp-divider bg-white p-4 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] sm:p-6">
                        <div className="mb-5">
                            <IconField icon={Search} className="max-w-md">
                                <Input
                                    className="bg-white"
                                    placeholder="Buscar por nome, CPF ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </IconField>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="border-separate border-spacing-y-1">
                                    <TableHeader className="[&_tr]:border-0">
                                        <TableRow className="bg-cp-sand-soft hover:bg-cp-sand-soft [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                                            <TableHead className="h-12 text-[14px] font-medium text-cp-ink">Nome</TableHead>
                                            {isAdmin && <TableHead className="text-[14px] font-medium text-cp-ink">Psicóloga</TableHead>}
                                            <TableHead className="text-[14px] font-medium text-cp-ink">CPF</TableHead>
                                            <TableHead className="text-[14px] font-medium text-cp-ink">Telefone</TableHead>
                                            <TableHead className="text-[14px] font-medium text-cp-ink">Status</TableHead>
                                            <TableHead className="text-right text-[14px] font-medium text-cp-ink">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPatients?.length === 0 ? (
                                            <TableRow className="border-0 hover:bg-transparent">
                                                <TableCell colSpan={isAdmin ? 6 : 5} className="py-10 text-center text-cp-muted">
                                                    Nenhum paciente encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPatients?.map((patient, i) => {
                                                const st = statusOf(patientStatus, patient.status ?? "active");
                                                return (
                                                <TableRow
                                                    key={patient.id}
                                                    className={cn(
                                                        "cursor-pointer border-0 transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl",
                                                        rowTint[i % rowTint.length],
                                                    )}
                                                    onClick={() => setLocation(`/patients/${patient.id}/record`)}
                                                    data-testid={`row-patient-${patient.id}`}
                                                >
                                                    <TableCell className="py-4 font-semibold text-cp-ink" data-testid={`text-patient-name-${patient.id}`}>{patient.fullName}</TableCell>
                                                    {isAdmin && (
                                                        <TableCell className="text-cp-ink" data-testid={`text-psychologist-name-${patient.id}`}>
                                                            {patient.psychologistName ?? "—"}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-cp-ink">{patient.cpf || '-'}</TableCell>
                                                    <TableCell className="text-cp-ink">{patient.phone}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge label={st.label} tone={st.tone} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLocation(`/patients/${patient.id}/record`);
                                                            }}
                                                            className="font-medium text-cp-action hover:bg-cp-action-soft hover:text-cp-action-hover"
                                                            data-testid={`btn-prontuario-${patient.id}`}
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            Prontuário
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
