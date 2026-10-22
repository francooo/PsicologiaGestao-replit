import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  UserPlus,
  Shield,
  Mail,
  User as UserIcon,
  AtSign,
  Lock,
  Link as LinkIcon,
  BadgeCheck,
  Save,
  Users,
} from "lucide-react";
import { PageHeader, cpButton } from "@/components/cp/PageHeader";
import { IconField, InfoBanner, ModalHeader } from "@/components/cp/fields";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { roleName, statusOf, userStatus } from "@/components/cp/status";
import { cn } from "@/lib/utils";

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
type UserRow = { id: number; fullName: string; email: string; role: string; status: string; profileImage?: string | null };
type Permission = { id: number; name: string; description?: string | null };
type RolePermission = { id: number; role: string; permissionId: number };

const ROLES = ["admin", "psychologist", "receptionist"] as const;
const EDITABLE_ROLES = ["psychologist", "receptionist"] as const;

const PERMISSION_LABELS: Record<string, string> = {
  dashboard_view: "Ver dashboard",
  appointments_view: "Ver agendamentos",
  appointments_manage: "Gerenciar agendamentos",
  psychologists_view: "Ver psicólogas",
  psychologists_manage: "Gerenciar psicólogas",
  rooms_view: "Ver salas",
  rooms_manage: "Gerenciar salas",
  rooms_book: "Reservar salas",
  financial_view: "Ver financeiro",
  financial_manage: "Gerenciar financeiro",
  permissions_view: "Ver permissões",
  permissions_manage: "Gerenciar permissões",
};

function permissionLabel(name: string) {
  return PERMISSION_LABELS[name] ?? name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const card = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";
const fieldLabel = "text-[13px] font-semibold text-cp-ink";
const pill = (active: boolean) => cn(
  "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
  active ? "bg-cp-action text-white" : "border border-cp-border bg-white text-cp-muted hover:text-cp-ink",
);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Falha ao carregar ${url}`);
  return res.json();
}

function UserAvatar({ u }: { u: UserRow }) {
  return (
    <Avatar className="h-9 w-9">
      <AvatarImage src={u.profileImage || undefined} alt={u.fullName} />
      <AvatarFallback className="bg-cp-action-soft text-xs font-semibold text-cp-action">
        {u.fullName?.charAt(0) || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

export default function Permissions() {
  const { toast } = useToast();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [permissionChanges, setPermissionChanges] = useState<Record<string, Record<number, boolean>>>({});

  // No fallback data: when the API fails the page says so instead of showing made-up users
  const usersQuery = useQuery<UserRow[]>({ queryKey: ['/api/users'], queryFn: () => getJson('/api/users') });
  const permissionsQuery = useQuery<Permission[]>({ queryKey: ['/api/permissions'], queryFn: () => getJson('/api/permissions') });
  const rolePermissionsQuery = useQuery<RolePermission[]>({ queryKey: ['/api/role-permissions'], queryFn: () => getJson('/api/role-permissions') });
  const users = usersQuery.data;
  const permissions = permissionsQuery.data;
  const rolePermissions = rolePermissionsQuery.data;

  // Working copy of the matrix, rebuilt whenever the saved data changes
  useEffect(() => {
    if (!rolePermissions || !permissions) return;
    const next: Record<string, Record<number, boolean>> = {};
    ROLES.forEach((role) => {
      next[role] = {};
      permissions.forEach((p) => {
        next[role][p.id] = rolePermissions.some((rp) => rp.role === role && rp.permissionId === p.id);
      });
    });
    setPermissionChanges(next);
  }, [rolePermissions, permissions]);

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

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Usuário criado", description: "O usuário foi criado com sucesso." });
      setIsNewUserDialogOpen(false);
      userForm.reset();
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao criar usuário: ${error.message}`, variant: "destructive" });
    }
  });

  // Only the checkboxes that actually changed are sent: POST to grant, DELETE by id to revoke
  const pendingChanges = (() => {
    const add: { role: string; permissionId: number }[] = [];
    const remove: number[] = [];
    if (!rolePermissions) return { add, remove };
    EDITABLE_ROLES.forEach((role) => {
      Object.entries(permissionChanges[role] ?? {}).forEach(([pid, checked]) => {
        const permissionId = Number(pid);
        const saved = rolePermissions.find((rp) => rp.role === role && rp.permissionId === permissionId);
        if (checked && !saved) add.push({ role, permissionId });
        if (!checked && saved) remove.push(saved.id);
      });
    });
    return { add, remove };
  })();
  const changeCount = pendingChanges.add.length + pendingChanges.remove.length;

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      for (const id of pendingChanges.remove) await apiRequest("DELETE", `/api/role-permissions/${id}`);
      for (const rp of pendingChanges.add) await apiRequest("POST", "/api/role-permissions", rp);
    },
    onSuccess: () => {
      toast({ title: "Permissões atualizadas", description: `${changeCount} alteração(ões) salva(s).` });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao atualizar permissões: ${error.message}`, variant: "destructive" });
    },
    // Refetch either way so the matrix reflects what was really saved
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] }),
  });

  const handlePermissionChange = (role: string, permissionId: number, checked: boolean) => {
    setPermissionChanges((prev) => ({ ...prev, [role]: { ...prev[role], [permissionId]: checked } }));
  };

  const filteredUsers = selectedRole === "all" ? users : users?.filter((u) => u.role === selectedRole);
  const isLoading = usersQuery.isLoading || permissionsQuery.isLoading || rolePermissionsQuery.isLoading;
  const loadError = usersQuery.isError || permissionsQuery.isError || rolePermissionsQuery.isError;

  const retry = () => {
    usersQuery.refetch();
    permissionsQuery.refetch();
    rolePermissionsQuery.refetch();
  };

  return (
    <div className="flex h-screen bg-cp-bg">
      <Sidebar />

      <div className="ml-0 flex-1 overflow-x-hidden pt-16 md:ml-64 md:pt-0">
        <MobileNav />

        <main className="p-4 pb-20 sm:px-7 sm:py-6">
          <PageHeader
            className="mb-6"
            title="Permissões de Acesso"
            icon={Shield}
            subtitle="Gerenciamento de usuários e permissões"
            phrase
            actions={
              <button type="button" className={cpButton.primary} onClick={() => setIsNewUserDialogOpen(true)} data-testid="button-new-user">
                <UserPlus className="h-4 w-4" />
                Adicionar Usuário
              </button>
            }
          />

          <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
            <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
              <ModalHeader icon={UserPlus} title="Novo Usuário" description="Preencha os detalhes para adicionar um novo usuário." />

              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit((d) => createUserMutation.mutate(d))} className="mt-2 space-y-4">
                  <FormField control={userForm.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={fieldLabel}>Nome completo <span className="text-cp-danger">*</span></FormLabel>
                      <IconField icon={UserIcon}>
                        <FormControl><Input placeholder="Digite o nome completo" {...field} /></FormControl>
                      </IconField>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={userForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>E-mail <span className="text-cp-danger">*</span></FormLabel>
                        <IconField icon={Mail}>
                          <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                        </IconField>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={userForm.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>Usuário <span className="text-cp-danger">*</span></FormLabel>
                        <IconField icon={AtSign}>
                          <FormControl><Input placeholder="usuario" autoComplete="off" {...field} /></FormControl>
                        </IconField>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={userForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={fieldLabel}>Senha <span className="text-cp-danger">*</span></FormLabel>
                      <IconField icon={Lock}>
                        <FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" autoComplete="new-password" {...field} /></FormControl>
                      </IconField>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={userForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>Função</FormLabel>
                        <IconField icon={Shield}>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ROLES.map((r) => <SelectItem key={r} value={r}>{roleName(r)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </IconField>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={userForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>Status</FormLabel>
                        <IconField icon={BadgeCheck}>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(userStatus).map(([value, s]) => <SelectItem key={value} value={value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </IconField>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={userForm.control} name="profileImage" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={fieldLabel}>URL da foto de perfil (opcional)</FormLabel>
                      <IconField icon={LinkIcon}>
                        <FormControl><Input placeholder="https://exemplo.com/imagem.jpg" {...field} /></FormControl>
                      </IconField>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <DialogFooter className="flex-row justify-between gap-3 pt-2 sm:justify-between">
                    <button type="button" className={cpButton.subtle} onClick={() => setIsNewUserDialogOpen(false)}>Cancelar</button>
                    <button type="submit" className={cpButton.primary} disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      {createUserMutation.isPending ? "Criando..." : "Adicionar Usuário"}
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cp-action" />
            </div>
          ) : loadError ? (
            <InfoBanner variant="warning" title="Não foi possível carregar usuários e permissões.">
              Verifique a conexão e{" "}
              <button type="button" className="font-semibold text-cp-action underline underline-offset-2" onClick={retry}>tente novamente</button>.
            </InfoBanner>
          ) : (
            <div className="space-y-6">
              {/* Usuários */}
              <div className={cn(card, "p-4 sm:p-6")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[20px] font-semibold text-cp-ink">
                    <Users className="h-5 w-5 text-cp-muted" />
                    Usuários
                  </h3>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por função">
                    {["all", ...ROLES].map((r) => (
                      <button key={r} type="button" aria-pressed={selectedRole === r} className={pill(selectedRole === r)} onClick={() => setSelectedRole(r)}>
                        {r === "all" ? "Todos" : roleName(r)}
                      </button>
                    ))}
                  </div>
                </div>

                {!filteredUsers?.length ? (
                  <p className="py-8 text-center text-sm text-cp-muted">Nenhum usuário encontrado com os filtros selecionados.</p>
                ) : (
                  <>
                    {/* Desktop: table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                        <thead>
                          <tr className="bg-cp-sand-soft text-left text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                            <th className="px-4 py-3 font-medium">Usuário</th>
                            <th className="px-4 py-3 font-medium">E-mail</th>
                            <th className="px-4 py-3 font-medium">Função</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => {
                            const st = statusOf(userStatus, u.status);
                            return (
                              <tr key={u.id} className="transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <UserAvatar u={u} />
                                    <span className="font-medium text-cp-ink">{u.fullName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-cp-muted">{u.email}</td>
                                <td className="px-4 py-2.5 text-cp-ink">{roleName(u.role)}</td>
                                <td className="px-4 py-2.5"><StatusBadge label={st.label} tone={st.tone} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile: cards */}
                    <ul className="space-y-2 md:hidden">
                      {filteredUsers.map((u) => {
                        const st = statusOf(userStatus, u.status);
                        return (
                          <li key={u.id} className="flex items-center gap-3 rounded-xl bg-cp-hover p-3">
                            <UserAvatar u={u} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-cp-ink">{u.fullName}</p>
                              <p className="truncate text-xs text-cp-muted">{roleName(u.role)} · {u.email}</p>
                            </div>
                            <StatusBadge label={st.label} tone={st.tone} />
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              {/* Permissões por função */}
              <div className={cn(card, "p-4 sm:p-6")}>
                <h3 className="text-[20px] font-semibold text-cp-ink">Permissões por Função</h3>
                <p className="mb-4 text-sm text-cp-muted">O administrador sempre tem acesso a tudo.</p>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-1 text-sm">
                    <thead>
                      <tr className="bg-cp-sand-soft text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                        <th className="px-4 py-3 text-left font-medium">Recurso</th>
                        {ROLES.map((r) => <th key={r} className="px-4 py-3 text-center font-medium">{roleName(r)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {permissions?.map((permission) => (
                        <tr key={permission.id} className="transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                          <td className="px-4 py-2.5 font-medium text-cp-ink">{permissionLabel(permission.name)}</td>
                          {ROLES.map((role) => (
                            <td key={role} className="px-4 py-2.5 text-center">
                              <Checkbox
                                aria-label={`${permissionLabel(permission.name)} — ${roleName(role)}`}
                                checked={role === "admin" ? true : !!permissionChanges[role]?.[permission.id]}
                                onCheckedChange={(checked) => handlePermissionChange(role, permission.id, checked === true)}
                                disabled={role === "admin"}
                                className="data-[state=checked]:border-cp-action data-[state=checked]:bg-cp-action"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  {changeCount > 0 && <span className="text-sm text-cp-muted">{changeCount} alteração(ões) não salva(s)</span>}
                  <button
                    type="button"
                    className={cpButton.primary}
                    onClick={() => savePermissionsMutation.mutate()}
                    disabled={changeCount === 0 || savePermissionsMutation.isPending}
                  >
                    {savePermissionsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savePermissionsMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
