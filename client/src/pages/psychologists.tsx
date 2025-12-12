import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, insertPsychologistSchema } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, UserCog, User, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Psychologist form schema
const psychologistFormSchema = z
  .object({
    useExistingUser: z.boolean().default(false),
    existingUserId: z.number().optional(),
    fullName: z.string().min(1, "Nome completo é obrigatório"),
    email: z.string().email("Email inválido"),
    username: z.string().optional(),
    password: z.string().optional(),
    specialization: z.string().min(1, "Especialização é obrigatória"),
    bio: z.string().default(""),
    hourlyRate: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Valor deve ser um número válido maior que zero",
    }),
    profileImage: z.string().optional(),
    role: z.string().default("psychologist"),
    status: z.string().default("active"),
  })
  .refine(
    (data) => {
      if (data.useExistingUser) {
        return !!data.existingUserId;
      }
      return !!data.username && data.username.length >= 3;
    },
    {
      message: "Nome de usuário deve ter pelo menos 3 caracteres",
      path: ["username"],
    }
  )
  .refine(
    (data) => {
      if (data.useExistingUser) {
        return true;
      }
      return !!data.password && data.password.length >= 6;
    },
    {
      message: "Senha deve ter pelo menos 6 caracteres",
      path: ["password"],
    }
  );

// Edit schema - apenas campos editáveis
const editPsychologistSchema = z.object({
  specialization: z.string().min(1, "Especialização é obrigatória"),
  bio: z.string(),
  hourlyRate: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Valor deve ser um número válido",
  }),
  profileImage: z.string().optional(),
});

type PsychologistFormValues = z.infer<typeof psychologistFormSchema>;
type EditPsychologistFormValues = z.infer<typeof editPsychologistSchema>;

export default function Psychologists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewPsychologistDialogOpen, setIsNewPsychologistDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [psychologistToDelete, setPsychologistToDelete] = useState<number | null>(null);
  const [useExistingUser, setUseExistingUser] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [newPsychologistPreview, setNewPsychologistPreview] = useState<string | null>(null);

  // Fetch psychologists
  const { data: psychologists, isLoading } = useQuery({
    queryKey: ['/api/psychologists'],
    queryFn: async () => {
      const res = await fetch('/api/psychologists');
      if (!res.ok) throw new Error('Failed to fetch psychologists');
      return res.json();
    }
  });
  
  // Fetch users
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: useExistingUser
  });

  // Psychologist form
  const psychologistForm = useForm<PsychologistFormValues>({
    resolver: zodResolver(psychologistFormSchema),
    defaultValues: {
      useExistingUser: false,
      existingUserId: undefined,
      fullName: "",
      email: "",
      username: "",
      password: "",
      specialization: "",
      bio: "",
      hourlyRate: "",
      profileImage: "",
      role: "psychologist",
      status: "active",
    }
  });

  // Edit form
  const editForm = useForm<EditPsychologistFormValues>({
    resolver: zodResolver(editPsychologistSchema),
    defaultValues: {
      specialization: "",
      bio: "",
      hourlyRate: "",
    }
  });

  // Update psychologist mutation
  const updatePsychologistMutation = useMutation({
    mutationFn: async (data: { id: number; values: Partial<PsychologistFormValues> }) => {
      const psychologistResponse = await apiRequest("PUT", `/api/psychologists/${data.id}`, {
        specialization: data.values.specialization,
        bio: data.values.bio,
        hourlyRate: data.values.hourlyRate ? parseFloat(data.values.hourlyRate) : undefined,
      });
      
      if (!psychologistResponse.ok) {
        const error = await psychologistResponse.json();
        throw new Error(error.message || 'Erro ao atualizar psicóloga');
      }
      
      return psychologistResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
      toast({
        title: "Sucesso!",
        description: "A psicóloga foi atualizada com sucesso.",
        variant: "default",
      });
      setIsEditDialogOpen(false);
      setSelectedPsychologist(null);
      psychologistForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atualização",
        description: error.message || "Houve um erro ao atualizar a psicóloga.",
        variant: "destructive",
      });
    }
  });

  // Create psychologist mutation
  const createPsychologistMutation = useMutation({
    mutationFn: async (data: PsychologistFormValues & { imageFile?: File | null }) => {
      try {
        console.log('Creating psychologist with data:', data);
        let userId;
        
        if (data.useExistingUser && data.existingUserId) {
          userId = data.existingUserId;
          console.log('Using existing user ID:', userId);
        } else {
          console.log('Creating new user...');
          const userResponse = await apiRequest("POST", "/api/register", {
            fullName: data.fullName,
            email: data.email,
            username: data.username,
            password: data.password,
            role: data.role,
            status: data.status,
          });
          
          if (!userResponse.ok) {
            const error = await userResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
            console.error('Error creating user:', error);
            throw new Error(error.message || 'Erro ao criar usuário');
          }
          
          const user = await userResponse.json();
          userId = user.id;
          console.log('User created with ID:', userId);
        }
        
        console.log('Creating psychologist profile...');
        const psychologistResponse = await apiRequest("POST", "/api/psychologists", {
          userId: userId,
          specialization: data.specialization,
          bio: data.bio || "",
          hourlyRate: parseFloat(data.hourlyRate),
        });
        
        if (!psychologistResponse.ok) {
          const error = await psychologistResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
          console.error('Error creating psychologist:', error);
          throw new Error(error.message || 'Erro ao criar perfil da psicóloga');
        }
        
        const result = await psychologistResponse.json();
        console.log('Psychologist created successfully:', result);
        
        // Upload da foto APÓS criar a psicóloga, usando o endpoint específico para psicóloga
        if (data.imageFile) {
          console.log('Uploading photo for new psychologist ID:', result.id);
          const formData = new FormData();
          formData.append('profileImageFile', data.imageFile);
          
          const uploadResponse = await fetch(`/api/psychologists/${result.id}/photo`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            console.error('Error uploading photo, but psychologist was created');
          } else {
            console.log('Photo uploaded successfully');
          }
        }
        
        return result;
      } catch (error) {
        console.error('Error in createPsychologistMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
      toast({
        title: "Sucesso!",
        description: "A psicóloga foi cadastrada com sucesso no sistema.",
        variant: "default",
      });
      setIsNewPsychologistDialogOpen(false);
      psychologistForm.reset();
      setPendingImageFile(null);
      setNewPsychologistPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Houve um erro ao cadastrar a psicóloga. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Delete psychologist mutation
  const deletePsychologistMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/psychologists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
      toast({
        title: "Psicóloga removida",
        description: "A psicóloga foi removida com sucesso.",
        variant: "default",
      });
      setPsychologistToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover psicóloga: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle edit click
  const handleEditClick = (psychologist: any) => {
    setSelectedPsychologist(psychologist.id);
    editForm.reset({
      specialization: psychologist.specialization,
      bio: psychologist.bio,
      hourlyRate: psychologist.hourlyRate.toString(),
    });
    setPreviewImage(psychologist.user.profileImage || null);
    setUploadedImageUrl(null);
    setIsEditDialogOpen(true);
  };

  // Handle edit form submission
  const onEditSubmit = (data: EditPsychologistFormValues) => {
    if (selectedPsychologist) {
      const updateData = { ...data };
      // Se houver uma nova imagem, adicionar ao payload
      if (uploadedImageUrl) {
        updateData.profileImage = uploadedImageUrl;
      }
      updatePsychologistMutation.mutate({ id: selectedPsychologist, values: updateData });
    }
  };

  // Handle edit image upload
  const handleEditImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedPsychologist) {
      toast({
        title: "Erro",
        description: "Nenhuma psicóloga selecionada.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem nos formatos JPG, JPEG ou PNG.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 2MB.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('profileImageFile', file);

      // Usar o endpoint específico para psicóloga, não /api/profile
      const response = await fetch(`/api/psychologists/${selectedPsychologist}/photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorData.message || 'Erro ao fazer upload');
      }

      const data = await response.json();
      setUploadedImageUrl(data.profileImage);
      
      queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
      
      toast({
        title: "Sucesso!",
        description: "Foto atualizada com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : 'Não foi possível fazer upload da imagem.',
        variant: "destructive",
      });
      const psychologist = psychologists?.find((p: any) => p.id === selectedPsychologist);
      if (psychologist) {
        setPreviewImage(psychologist.user.profileImage || null);
      }
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  // Handle psychologist form submission
  const onPsychologistSubmit = (data: PsychologistFormValues) => {
    console.log('Submitting psychologist data:', data);
    // Incluir o arquivo de imagem pendente para upload após criar a psicóloga
    createPsychologistMutation.mutate({ ...data, imageFile: pendingImageFile });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (psychologistToDelete) {
      deletePsychologistMutation.mutate(psychologistToDelete);
    }
  };

  // Handle image upload - guarda o arquivo temporariamente para upload após criar a psicóloga
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem nos formatos JPG, JPEG ou PNG.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 2MB.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Guardar arquivo para upload posterior (após criar a psicóloga)
    setPendingImageFile(file);
    
    // Mostrar preview da imagem
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPsychologistPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    toast({
      title: "Imagem selecionada",
      description: "A imagem será enviada após criar a psicóloga.",
      variant: "default",
    });
    
    // Reset input
    event.target.value = '';
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Psychologists Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Psicólogas</h1>
              <p className="text-neutral-dark">Gerenciamento de profissionais</p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <Dialog 
                open={isNewPsychologistDialogOpen} 
                onOpenChange={(open) => {
                  setIsNewPsychologistDialogOpen(open);
                  if (!open) {
                    psychologistForm.reset();
                    setUseExistingUser(false);
                    setPendingImageFile(null);
                    setNewPsychologistPreview(null);
                  }
                }}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Psicóloga
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Psicóloga</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para adicionar uma nova psicóloga.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...psychologistForm}>
                    <form onSubmit={psychologistForm.handleSubmit(onPsychologistSubmit)} className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-dark border-b pb-2">Informações Pessoais</h3>
                        
                        <FormField
                          control={psychologistForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={psychologistForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={psychologistForm.control}
                            name="profileImage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL da Foto de Perfil</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="https://exemplo.com/foto.jpg" {...field} className="flex-1" />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={uploadingImage}
                                    onClick={() => document.getElementById('profile-image-upload')?.click()}
                                  >
                                    {uploadingImage ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <input
                                    id="profile-image-upload"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-dark border-b pb-2">Credenciais de Acesso</h3>
                        
                        <FormField
                          control={psychologistForm.control}
                          name="useExistingUser"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setUseExistingUser(checked === true);
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Usar usuário existente
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Marque esta opção para associar um perfil de psicóloga a um usuário já cadastrado no sistema
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        {useExistingUser ? (
                          <FormField
                            control={psychologistForm.control}
                            name="existingUserId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selecione o usuário</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value?.toString() || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um usuário" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users?.map((user: { id: number; fullName: string; username: string; email: string }) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.fullName || user.username} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={psychologistForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome de Usuário</FormLabel>
                                  <FormControl>
                                    <Input placeholder="username" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={psychologistForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="********" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={psychologistForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Função</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="psychologist">Psicóloga</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={psychologistForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="inactive">Inativo</SelectItem>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-dark border-b pb-2">Informações Profissionais</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={psychologistForm.control}
                            name="specialization"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Especialização</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Terapia Cognitivo-Comportamental" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={psychologistForm.control}
                            name="hourlyRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor da Hora</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: 150.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={psychologistForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Biografia</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva a experiência e formação da profissional" 
                                  className="resize-none min-h-[100px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createPsychologistMutation.isPending}>
                          {createPsychologistMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            "Adicionar Psicóloga"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Dialog */}
              <Dialog 
                open={isEditDialogOpen} 
onOpenChange={(open) => {
                  setIsEditDialogOpen(open);
                  if (!open) {
                    setSelectedPsychologist(null);
                    editForm.reset();
                  }
                }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Psicóloga</DialogTitle>
                    <DialogDescription>
                      Atualize as informações da psicóloga.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-dark border-b pb-2">Foto de Perfil</h3>
                        
                        <div className="flex items-center gap-4">
                          {previewImage && (
                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary">
                              <img 
                                src={previewImage} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={uploadingImage}
                              onClick={() => document.getElementById('edit-profile-image-upload')?.click()}
                              className="w-full"
                            >
                              {uploadingImage ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Alterar Foto
                                </>
                              )}
                            </Button>
                            <input
                              id="edit-profile-image-upload"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              className="hidden"
                              onChange={handleEditImageUpload}
                            />
                            <p className="text-xs text-muted-foreground mt-1">JPG, JPEG ou PNG (máx. 2MB)</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-neutral-dark border-b pb-2">Informações Profissionais</h3>
                        
                        <FormField
                          control={editForm.control}
                          name="specialization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialização</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Terapia Cognitivo-Comportamental" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="hourlyRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor da Hora</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 150.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Biografia</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva a experiência e formação da profissional" 
                                  className="resize-none min-h-[100px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit" disabled={updatePsychologistMutation.isPending}>
                          {updatePsychologistMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Atualizando...
                            </>
                          ) : (
                            "Salvar Alterações"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Psychologists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {psychologists && psychologists.length > 0 ? (
                  psychologists.map((psychologist: any) => (
                    <Card key={psychologist.id} className="overflow-hidden flex flex-col h-full">
                      <CardHeader className="pb-3 min-h-[100px] flex items-start">
                        <div className="flex items-start w-full">
                          <div className="relative mr-4 flex-shrink-0">
                            <img 
                              src={psychologist.user.profileImage || "https://via.placeholder.com/80"} 
                              alt={psychologist.user.fullName} 
                              className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                            />
                            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                              psychologist.user.status === 'active' ? 'bg-green-500' : 
                              psychologist.user.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}></span>
                          </div>
                          <div className="flex-1 min-h-[64px] flex flex-col justify-center">
                            <CardTitle className="text-lg leading-tight mb-1">{psychologist.user.fullName}</CardTitle>
                            <CardDescription className="leading-tight">{psychologist.specialization}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4 flex-1 flex flex-col">
                        <div className="mb-4 flex-1">
                          <p className="text-sm text-neutral-dark line-clamp-3">
                            {psychologist.bio || "Nenhuma biografia disponível."}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-center gap-1 text-neutral-dark">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{psychologist.user.username}</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-dark">
                            <UserCog className="h-4 w-4 flex-shrink-0" />
                            <span className="capitalize truncate">{psychologist.user.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm pt-3 border-t">
                          <span className="font-medium text-neutral-dark">Valor/hora:</span>
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(parseFloat(psychologist.hourlyRate.toString()))}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 flex gap-2 mt-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEditClick(psychologist)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        
                        <AlertDialog open={isDeleteDialogOpen && psychologistToDelete === psychologist.id} onOpenChange={setIsDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="flex-1"
                              onClick={() => setPsychologistToDelete(psychologist.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta psicóloga? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setPsychologistToDelete(null)}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteConfirm}>
                                {deletePsychologistMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Confirmar"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-neutral-dark">
                    <User className="h-12 w-12 mx-auto text-neutral-light mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma psicóloga cadastrada</h3>
                    <p className="max-w-md mx-auto mb-6">
                      Adicione psicólogas para começar a gerenciar consultas e agendamentos.
                    </p>
                    <Button
                      onClick={() => setIsNewPsychologistDialogOpen(true)}
                      className="flex items-center mx-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Psicóloga
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
