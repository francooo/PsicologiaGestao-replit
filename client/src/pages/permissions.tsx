import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  UserPlus, 
  UserCog, 
  Shield, 
  Mail, 
  Check, 
  X 
} from "lucide-react";

// User form schema
const userFormSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.string().min(1, "Função é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  profileImage: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function Permissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [permissionChanges, setPermissionChanges] = useState<Record<string, Record<string, boolean>>>({});

  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      } catch (error) {
        // If API isn't available, return mock data based on the current user
        console.error("Failed to fetch users:", error);
        return [user];
      }
    }
  });

  // Fetch permissions
  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['/api/permissions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/permissions');
        if (!res.ok) throw new Error('Failed to fetch permissions');
        return res.json();
      } catch (error) {
        // If API isn't available, return predefined permissions
        console.error("Failed to fetch permissions:", error);
        return [
          { id: 1, name: "dashboard_view", description: "View dashboard" },
          { id: 2, name: "appointments_view", description: "View appointments" },
          { id: 3, name: "appointments_manage", description: "Manage appointments" },
          { id: 4, name: "psychologists_view", description: "View psychologists" },
          { id: 5, name: "psychologists_manage", description: "Manage psychologists" },
          { id: 6, name: "rooms_view", description: "View rooms" },
          { id: 7, name: "rooms_manage", description: "Manage rooms" },
          { id: 8, name: "rooms_book", description: "Book rooms" },
          { id: 9, name: "financial_view", description: "View financial information" },
          { id: 10, name: "financial_manage", description: "Manage financial information" },
          { id: 11, name: "permissions_view", description: "View permissions" },
          { id: 12, name: "permissions_manage", description: "Manage permissions" }
        ];
      }
    }
  });

  // Fetch role permissions
  const { data: rolePermissions, isLoading: isLoadingRolePermissions } = useQuery({
    queryKey: ['/api/role-permissions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/role-permissions');
        if (!res.ok) throw new Error('Failed to fetch role permissions');
        return res.json();
      } catch (error) {
        // If API isn't available, return predefined role permissions
        console.error("Failed to fetch role permissions:", error);
        return [
          // Admin permissions (all)
          ...Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            role: "admin",
            permissionId: i + 1,
            permission: { id: i + 1, name: `permission_${i+1}` }
          })),
          // Psychologist permissions
          { id: 13, role: "psychologist", permissionId: 1, permission: { id: 1, name: "dashboard_view" } },
          { id: 14, role: "psychologist", permissionId: 2, permission: { id: 2, name: "appointments_view" } },
          { id: 15, role: "psychologist", permissionId: 3, permission: { id: 3, name: "appointments_manage" } },
          { id: 16, role: "psychologist", permissionId: 6, permission: { id: 6, name: "rooms_view" } },
          { id: 17, role: "psychologist", permissionId: 8, permission: { id: 8, name: "rooms_book" } },
          // Receptionist permissions
          { id: 18, role: "receptionist", permissionId: 1, permission: { id: 1, name: "dashboard_view" } },
          { id: 19, role: "receptionist", permissionId: 2, permission: { id: 2, name: "appointments_view" } },
          { id: 20, role: "receptionist", permissionId: 3, permission: { id: 3, name: "appointments_manage" } },
          { id: 21, role: "receptionist", permissionId: 4, permission: { id: 4, name: "psychologists_view" } },
          { id: 22, role: "receptionist", permissionId: 6, permission: { id: 6, name: "rooms_view" } },
          { id: 23, role: "receptionist", permissionId: 8, permission: { id: 8, name: "rooms_book" } },
          { id: 24, role: "receptionist", permissionId: 9, permission: { id: 9, name: "financial_view" } }
        ];
      }
    }
  });

  // Initialize permissionChanges when rolePermissions are loaded
  useEffect(() => {
    if (rolePermissions) {
      const initialChanges: Record<string, Record<string, boolean>> = {};
      
      // Get all unique roles
      const roles = Array.from(new Set(rolePermissions.map(rp => rp.role)));
      
      // For each role, create a map of permission ID to boolean (true if the role has that permission)
      roles.forEach(role => {
        initialChanges[role] = {};
        if (permissions) {
          permissions.forEach(permission => {
            const hasPermission = rolePermissions.some(
              rp => rp.role === role && rp.permissionId === permission.id
            );
            initialChanges[role][permission.id] = hasPermission;
          });
        }
      });
      
      setPermissionChanges(initialChanges);
    }
  }, [rolePermissions, permissions]);

  // User form
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      username: "",
      password: "",
      role: "psychologist",
      status: "active",
      profileImage: "",
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      try {
        const response = await apiRequest("POST", "/api/register", data);
        return response.json();
      } catch (error) {
        throw new Error(`Failed to create user: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
        variant: "default",
      });
      setIsNewUserDialogOpen(false);
      userForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar usuário: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiRequest("DELETE", `/api/users/${id}`);
      } catch (error) {
        throw new Error(`Failed to delete user: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
        variant: "default",
      });
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover usuário: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update role permissions mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async (data: { role: string, permissions: number[] }) => {
      try {
        // First delete all existing role permissions
        await apiRequest("DELETE", `/api/role-permissions/role/${data.role}`);
        
        // Then create new role permissions
        for (const permissionId of data.permissions) {
          await apiRequest("POST", "/api/role-permissions", {
            role: data.role,
            permissionId
          });
        }
      } catch (error) {
        throw new Error(`Failed to update role permissions: ${error}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      toast({
        title: "Permissões atualizadas",
        description: `As permissões para ${variables.role} foram atualizadas com sucesso.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar permissões: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle user form submission
  const onUserSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  // Handle permission change
  const handlePermissionChange = (role: string, permissionId: number, checked: boolean) => {
    setPermissionChanges(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionId]: checked
      }
    }));
  };

  // Handle save permissions
  const handleSavePermissions = () => {
    // Only update permissions for admin, psychologist, and receptionist
    ['admin', 'psychologist', 'receptionist'].forEach(role => {
      if (permissionChanges[role]) {
        const selectedPermissions = Object.entries(permissionChanges[role])
          .filter(([_, isSelected]) => isSelected)
          .map(([permissionId]) => parseInt(permissionId));
        
        updateRolePermissionsMutation.mutate({
          role,
          permissions: selectedPermissions
        });
      }
    });
  };

  // Filter users by role
  const filteredUsers = selectedRole === "all" 
    ? users 
    : users?.filter(u => u.role === selectedRole);

  // Check if a role has a specific permission
  const hasPermission = (role: string, permissionId: number) => {
    if (permissionChanges[role] && permissionId in permissionChanges[role]) {
      return permissionChanges[role][permissionId];
    }
    
    // Fallback to checking rolePermissions directly
    return rolePermissions?.some(
      rp => rp.role === role && rp.permissionId === permissionId
    ) || false;
  };

  // Loading state
  const isLoading = isLoadingUsers || isLoadingPermissions || isLoadingRolePermissions;

  return (
    <div className="flex h-screen bg-neutral-lightest">
      <Sidebar />
      
      <div className="flex-1 overflow-x-hidden ml-0 md:ml-64 pt-16 md:pt-0">
        <MobileNav />
        
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Permissions Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-darkest">Permissões de Acesso</h1>
              <p className="text-neutral-dark">Gerenciamento de usuários e permissões</p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes para adicionar um novo usuário.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4 mt-4">
                      <FormField
                        control={userForm.control}
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
                          control={userForm.control}
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
                          control={userForm.control}
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
                      </div>
                      
                      <FormField
                        control={userForm.control}
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={userForm.control}
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
                                  <SelectItem value="receptionist">Recepcionista</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={userForm.control}
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
                      
                      <FormField
                        control={userForm.control}
                        name="profileImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL da Foto de Perfil</FormLabel>
                            <FormControl>
                              <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createUserMutation.isPending}>
                          {createUserMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            "Adicionar Usuário"
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
              {/* Lista de Usuários */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-darkest">Usuários</h3>
                  <div className="flex items-center">
                    <Select 
                      value={selectedRole} 
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="psychologist">Psicóloga</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-neutral-light">
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Usuário</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">E-mail</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Função</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Status</th>
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                            <td className="py-3 text-sm">
                              <div className="flex items-center">
                                <img 
                                  src={u.profileImage || "https://via.placeholder.com/32"} 
                                  alt={u.fullName} 
                                  className="w-8 h-8 rounded-full mr-3"
                                />
                                <span className="font-medium text-neutral-darkest">{u.fullName}</span>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-neutral-darkest">{u.email}</td>
                            <td className="py-3 text-sm text-neutral-darkest capitalize">{u.role}</td>
                            <td className="py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                u.status === 'active' 
                                  ? 'bg-success bg-opacity-10 text-success' 
                                  : u.status === 'pending' 
                                    ? 'bg-warning bg-opacity-10 text-warning'
                                    : 'bg-neutral-dark bg-opacity-10 text-neutral-dark'
                              }`}>
                                {u.status === 'active' ? 'Ativo' : 
                                 u.status === 'pending' ? 'Pendente' : 'Inativo'}
                              </span>
                            </td>
                            <td className="py-3 text-sm">
                              <Button variant="ghost" size="sm" className="mr-1">
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                              
                              <AlertDialog open={isDeleteDialogOpen && userToDelete === u.id} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setUserToDelete(u.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-error" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-error text-white hover:bg-error/80"
                                      onClick={handleDeleteConfirm}
                                    >
                                      {deleteUserMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Confirmar"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-neutral-dark">
                            Nenhum usuário encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Controle de Permissões */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-darkest">Permissões por Função</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-neutral-light">
                        <th className="py-3 text-left text-xs font-semibold text-neutral-dark">Recurso</th>
                        <th className="py-3 text-center text-xs font-semibold text-neutral-dark">Administrador</th>
                        <th className="py-3 text-center text-xs font-semibold text-neutral-dark">Psicólogo</th>
                        <th className="py-3 text-center text-xs font-semibold text-neutral-dark">Recepcionista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions?.map((permission) => {
                        // Format permission name for display
                        const displayName = permission.name
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                          
                        return (
                          <tr key={permission.id} className="border-b border-neutral-light hover:bg-neutral-lightest">
                            <td className="py-3 text-sm font-medium text-neutral-darkest">
                              {displayName}
                            </td>
                            <td className="py-3 text-sm text-center">
                              <Checkbox
                                checked={hasPermission('admin', permission.id)}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange('admin', permission.id, checked === true)
                                }
                                className="h-4 w-4 text-primary border-neutral-light rounded"
                                disabled={true} // Admin always has all permissions
                              />
                            </td>
                            <td className="py-3 text-sm text-center">
                              <Checkbox
                                checked={hasPermission('psychologist', permission.id)}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange('psychologist', permission.id, checked === true)
                                }
                                className="h-4 w-4 text-primary border-neutral-light rounded"
                              />
                            </td>
                            <td className="py-3 text-sm text-center">
                              <Checkbox
                                checked={hasPermission('receptionist', permission.id)}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange('receptionist', permission.id, checked === true)
                                }
                                className="h-4 w-4 text-primary border-neutral-light rounded"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    className="bg-primary hover:bg-primary-dark"
                    onClick={handleSavePermissions}
                    disabled={updateRolePermissionsMutation.isPending}
                  >
                    {updateRolePermissionsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
