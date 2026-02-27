import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Patient, type InsertPatient } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Loader2, Plus, Search, FileText } from "lucide-react";

export default function PatientsList() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    // Fetch patients
    const { data: patients, isLoading } = useQuery<Patient[]>({
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
        <div className="flex h-screen bg-neutral-lightest">
            <Sidebar />
            <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
                <MobileNav />
                <main className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-darkest">Pacientes</h1>
                            <p className="text-neutral-dark">Gerencie seus pacientes e prontuários</p>
                        </div>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="mt-4 md:mt-0 bg-primary hover:bg-primary-dark text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Novo Paciente
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                                        <Button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white" disabled={createPatientMutation.isPending}>
                                            {createPatientMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Cadastrar
                                        </Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center mb-6">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-dark" />
                                <Input
                                    className="pl-9"
                                    placeholder="Buscar por nome, CPF ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>CPF</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPatients?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-neutral-dark">
                                                    Nenhum paciente encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPatients?.map((patient) => (
                                                <TableRow
                                                    key={patient.id}
                                                    className="cursor-pointer hover:bg-neutral-lightest"
                                                    onClick={() => setLocation(`/patients/${patient.id}/record`)}
                                                >
                                                    <TableCell className="font-medium text-neutral-darkest">{patient.fullName}</TableCell>
                                                    <TableCell className="text-neutral-darkest">{patient.cpf || '-'}</TableCell>
                                                    <TableCell className="text-neutral-darkest">{patient.phone}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-xs ${patient.status === 'active'
                                                            ? 'bg-success bg-opacity-10 text-success'
                                                            : 'bg-neutral-dark bg-opacity-10 text-neutral-dark'
                                                            }`}>
                                                            {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLocation(`/patients/${patient.id}/record`);
                                                            }}
                                                            className="text-primary hover:text-primary-dark hover:bg-primary-light/10"
                                                        >
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            Prontuário
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
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
