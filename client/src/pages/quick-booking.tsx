import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute, Route, Switch, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Extend appointment schema for form validation
const quickBookingSchema = z.object({
  patientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  patientEmail: z.string().email("Email inválido"),
  patientPhone: z.string().min(8, "Telefone inválido"),
  notes: z.string().optional(),
});

type QuickBookingFormValues = z.infer<typeof quickBookingSchema>;

export default function QuickBooking() {
  const [location] = useLocation();
  const [_, params] = useRoute("/quick-booking");
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    date: "",
    time: "",
    psychologistId: "",
    psychologistName: "",
  });

  // Parse URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    const date = searchParams.get("date") || "";
    const time = searchParams.get("time") || "";
    const psychologistId = searchParams.get("psychologist") || "";

    if (!date || !time || !psychologistId) {
      toast({
        title: "Erro",
        description: "Informações de agendamento incompletas no link",
        variant: "destructive",
      });
      return;
    }

    // Fetch psychologist data
    const fetchPsychologist = async () => {
      try {
        const response = await fetch(`/api/psychologists/${psychologistId}`);
        if (!response.ok) throw new Error("Erro ao buscar dados do psicólogo");
        
        const psychologist = await response.json();
        
        setBookingData({
          date,
          time,
          psychologistId,
          psychologistName: psychologist.user.fullName || "Psicólogo",
        });
        
        setIsLoading(false);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do profissional",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchPsychologist();
  }, [location, toast]);

  // Form setup
  const form = useForm<QuickBookingFormValues>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      patientPhone: "",
      notes: "",
    },
  });

  // Create appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: QuickBookingFormValues) => {
      // Extract start and end time from time slot (e.g., "09:00 - 10:00")
      const [startTime, endTime] = bookingData.time.split(" - ");
      
      const appointmentData = {
        date: bookingData.date,
        startTime,
        endTime,
        patientName: data.patientName,
        psychologistId: parseInt(bookingData.psychologistId),
        roomId: 1, // Default room, can be changed by staff later
        status: "scheduled",
        notes: `Email: ${data.patientEmail}\nTelefone: ${data.patientPhone}\n${data.notes || ""}`,
      };
      
      const response = await apiRequest("POST", "/api/appointments/quick-book", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro no agendamento",
        description: error.message || "Não foi possível realizar o agendamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickBookingFormValues) => {
    bookAppointmentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Agendamento Solicitado!</CardTitle>
            <CardDescription className="text-center">
              Sua solicitação de agendamento foi recebida com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">
              Um membro da nossa equipe entrará em contato para confirmar sua consulta em breve.
            </p>
            <div className="text-sm p-4 bg-gray-50 rounded-md">
              <p className="font-medium">Detalhes do agendamento:</p>
              <p>Data: {new Date(bookingData.date).toLocaleDateString('pt-BR')}</p>
              <p>Horário: {bookingData.time}</p>
              <p>Profissional: {bookingData.psychologistName}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">Ir para a página inicial</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Agendamento de Consulta</CardTitle>
          <CardDescription>
            Preencha seus dados para agendar um horário com {bookingData.psychologistName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <p className="text-sm font-medium">Detalhes da consulta:</p>
            <p className="text-sm">Data: {new Date(bookingData.date).toLocaleDateString('pt-BR')}</p>
            <p className="text-sm">Horário: {bookingData.time}</p>
            <p className="text-sm">Profissional: {bookingData.psychologistName}</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="patientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="patientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={bookAppointmentMutation.isPending}
              >
                {bookAppointmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : "Solicitar Agendamento"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/">
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}