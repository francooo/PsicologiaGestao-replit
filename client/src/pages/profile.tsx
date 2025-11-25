import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInYears } from "date-fns";
import {
  CalendarIcon,
  UserCircle,
  Phone,
  Calendar as CalendarIcon2,
  Clock,
  Users,
  Home,
  ArrowLeft,
  CheckCircle,
  Link as LinkIcon,
  Unlink,
  CalendarClock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProfileSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phoneNumber: z.string().optional(),
  birthDate: z.date().optional(),
  profileImage: z.string().optional(),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Dados das estatísticas
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  const form = useForm<z.infer<typeof ProfileSchema>>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: "",
      birthDate: undefined,
      profileImage: user?.profileImage || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phoneNumber: "",
        birthDate: undefined,
        profileImage: user.profileImage || "",
      });
      if (user.profileImage) {
        setImagePreview(user.profileImage);
      }
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof ProfileSchema>) => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value instanceof Date) {
          formData.append(key, value.toISOString().split('T')[0]);
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      if (imageFile) {
        formData.append("profileImageFile", imageFile);
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Falha ao atualizar perfil, pois a extensão da imagem não é permitida");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (values: z.infer<typeof ProfileSchema>) => {
    handleProfileUpdate(values);
  };

  // Calcular estatísticas
  const patientCount = Array.isArray(appointments) ? appointments.length : 0;
  // Como ainda não temos o campo createdAt no banco de dados, usamos um valor padrão temporário
  const createdAt = new Date();
  const platformTimeInMonths = 0; // Valor fixo para demonstração

  // Estado para mostrar notificação de sucesso
  const [showSuccess, setShowSuccess] = useState(false);
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("personal");

  // Estado para verificar a conexão com o Google Calendar
  const { data: googleCalendarStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/google-calendar/status"],
    enabled: !!user,
  });

  // Estado para os próximos eventos do Google Calendar
  const { data: googleCalendarEvents, isLoading: isLoadingEvents } = useQuery<any[]>({
    queryKey: ["/api/google-calendar/events"],
    enabled: !!user && !!googleCalendarStatus?.authenticated,
  });

  // Iniciar a autenticação do Google Calendar
  const connectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google-calendar/auth");
      return response.json();
    },
    onSuccess: (data) => {
      // Abre a URL de autenticação do Google em uma nova janela
      window.open(data.authUrl, "_blank");

      toast({
        title: "Redirecionando para o Google",
        description: "Uma nova janela foi aberta para você autorizar o acesso ao Google Calendar.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao Google Calendar. Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Verificar se viemos de uma redireção da autenticação do Google
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleCalendarConnected = urlParams.get("googleCalendarConnected");
    const googleCalendarError = urlParams.get("googleCalendarError");

    if (googleCalendarConnected === "true") {
      toast({
        title: "Conectado ao Google Calendar",
        description: "Agora você pode sincronizar seus agendamentos com o Google Calendar.",
      });
      // Remover parâmetros da URL
      navigate("/profile", { replace: true });
      // Revalidar o status de autenticação
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
    } else if (googleCalendarError === "true") {
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar ao Google Calendar. Tente novamente.",
        variant: "destructive",
      });
      // Remover parâmetros da URL
      navigate("/profile", { replace: true });
    }
  }, []);

  // Atualiza o tratamento da mutação para exibir a notificação de sucesso
  const handleProfileUpdate = (values: z.infer<typeof ProfileSchema>) => {
    updateProfileMutation.mutate(values, {
      onSuccess: () => {
        setShowSuccess(true);
        // Invalida a consulta do usuário para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seu Perfil</h1>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Dashboard</span>
        </Button>
      </div>

      {/* Notificação de sucesso */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-md p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Ir para Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuccess(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Seção esquerda - Perfil e Integrações */}
        <div className="md:col-span-2">
          <Tabs
            defaultValue="personal"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais e de contato
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="flex flex-col items-center mb-6">
                        <Avatar className="w-24 h-24 mb-4">
                          <AvatarImage src={imagePreview || undefined} />
                          <AvatarFallback
                            showPsychologySymbol={user?.role === "psychologist"}
                            className={`text-2xl font-semibold ${user?.role === "psychologist" ? "bg-primary/10" : ""}`}
                          >
                            {user?.fullName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <Label htmlFor="picture" className="cursor-pointer text-primary font-medium">
                            Alterar imagem de perfil (60x60px)
                          </Label>
                          <Input
                            id="picture"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu nome completo" {...field} />
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
                                <Input placeholder="seu.email@exemplo.com" {...field} disabled />
                              </FormControl>
                              <FormDescription>Email não pode ser alterado</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Data de nascimento</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                    >
                                      {field.value ? (
                                        format(field.value, "dd/MM/yyyy")
                                      ) : (
                                        <span>Selecione uma data</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={updateProfileMutation.isPending || !form.formState.isDirty}
                      >
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle>Integrações</CardTitle>
                  <CardDescription>
                    Conecte sua conta com outras plataformas e serviços
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <CalendarClock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Google Calendar</h3>
                          <p className="text-sm text-muted-foreground">
                            Sincronize seus agendamentos com o Google Calendar
                          </p>
                        </div>
                      </div>

                      {googleCalendarStatus?.authenticated ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 font-medium flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Conectado
                          </span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => connectGoogleCalendarMutation.mutate()}
                          disabled={connectGoogleCalendarMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" />
                          {connectGoogleCalendarMutation.isPending
                            ? "Conectando..."
                            : "Conectar"
                          }
                        </Button>
                      )}
                    </div>

                    {googleCalendarStatus?.authenticated && (
                      <div className="space-y-4 mt-2">
                        <Alert>
                          <CalendarClock className="h-4 w-4" />
                          <AlertTitle>Sincronização ativa</AlertTitle>
                          <AlertDescription>
                            Seus agendamentos serão automaticamente sincronizados com seu Google Calendar.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Próximos eventos</h4>
                          {isLoadingEvents ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">Carregando eventos...</p>
                            </div>
                          ) : googleCalendarEvents && googleCalendarEvents.length > 0 ? (
                            <div className="space-y-2">
                              {googleCalendarEvents.slice(0, 3).map((event: any, index: number) => (
                                <div key={index} className="border rounded p-2 text-sm">
                                  <p className="font-medium">{event.summary}</p>
                                  <p className="text-muted-foreground">
                                    {new Date(event.start?.dateTime).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">Nenhum evento próximo encontrado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Seção direita - Estatísticas */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Estatísticas da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CalendarIcon2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Data de nascimento</p>
                  <p className="text-sm text-muted-foreground">
                    Não informada
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Telefone</p>
                  <p className="text-sm text-muted-foreground">
                    Não informado
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Tempo na plataforma</p>
                  <p className="text-sm text-muted-foreground">
                    Menos de um mês
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pacientes atendidos</p>
                  <p className="text-sm text-muted-foreground">{patientCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Avatar className="w-16 h-16">
                <AvatarImage src={imagePreview || undefined} />
                <AvatarFallback
                  showPsychologySymbol={user?.role === "psychologist"}
                  className={`text-lg font-semibold ${user?.role === "psychologist" ? "bg-primary/10" : ""}`}
                >
                  {user?.fullName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-center font-medium">{user?.fullName}</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}