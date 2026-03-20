import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Lock, Save, Users, CalendarDays, Stethoscope, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import SpecializationChipSelector from "@/components/specialization-chip-selector";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  crpNumber: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileData {
  id: number;
  fullName: string;
  email: string;
  profileImage: string | null;
  birthDate: string | null;
  status: string;
  age: number | null;
  psychologist: {
    id: number;
    phone: string | null;
    crpNumber: string | null;
    bio: string | null;
    startedAtClinic: string | null;
    hourlyRate: string;
  } | null;
  specializations: { id: number; name: string; category: string | null }[];
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-white rounded-xl border border-neutral-light p-4 gap-1">
      <div className="text-primary mb-1">{icon}</div>
      <span className="text-xl font-bold text-neutral-darkest">{value}</span>
      <span className="text-xs text-neutral-dark text-center">{label}</span>
    </div>
  );
}

export default function PerfilPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSpecIds, setSelectedSpecIds] = useState<number[]>([]);
  const [specsInitialized, setSpecsInitialized] = useState(false);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
    select: (data) => {
      if (!specsInitialized && data.specializations) {
        setSelectedSpecIds(data.specializations.map((s) => s.id));
        setSpecsInitialized(true);
      }
      return data;
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      birthDate: "",
      crpNumber: "",
      bio: "",
    },
    values: profile
      ? {
          fullName: profile.fullName,
          phone: profile.psychologist?.phone || "",
          birthDate: profile.birthDate || "",
          crpNumber: profile.psychologist?.crpNumber || "",
          bio: profile.psychologist?.bio || "",
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      await apiRequest("PATCH", "/api/profile", values);
      await apiRequest("PUT", "/api/profile/specializations", { specializationIds: selectedSpecIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao salvar perfil", variant: "destructive" }),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Erro ao enviar imagem");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Foto atualizada com sucesso!" });
    },
    onError: (e: Error) => toast({ title: e.message || "Erro ao enviar foto", variant: "destructive" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  const onSubmit = (values: ProfileFormValues) => saveMutation.mutate(values);

  return (
    <div className="flex min-h-screen bg-neutral-lightest">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-darkest">Meu Perfil Profissional</h1>
          <p className="text-sm text-neutral-dark mt-1">Gerencie suas informações pessoais e áreas de atuação.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar + Info Card */}
            <Card className="border-neutral-light shadow-sm">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-24 h-24 border-2 border-primary/30">
                      <AvatarImage src={profile?.profileImage || undefined} />
                      <AvatarFallback className="bg-primary text-white text-3xl font-bold">
                        {profile?.fullName?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarMutation.isPending}
                      data-testid="button-change-avatar"
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-avatar-file"
                    />
                  </div>

                  {/* Name + email + status */}
                  <div className="flex-1 space-y-4 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName" className="text-xs font-semibold text-neutral-dark">
                          Nome Completo
                        </Label>
                        <Input
                          id="fullName"
                          {...form.register("fullName")}
                          className="mt-1"
                          data-testid="input-fullName"
                        />
                        {form.formState.errors.fullName && (
                          <p className="text-xs text-red-500 mt-1">{form.formState.errors.fullName.message}</p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                          E-mail
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-xs">
                                Este campo só pode ser editado pelo administrador.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          value={profile?.email || ""}
                          readOnly
                          disabled
                          className="mt-1 bg-neutral-lightest text-neutral-dark"
                          data-testid="input-email-readonly"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-xs font-semibold text-neutral-dark">
                          Telefone / WhatsApp
                        </Label>
                        <Input
                          id="phone"
                          {...form.register("phone")}
                          placeholder="(11) 91234-5678"
                          className="mt-1"
                          data-testid="input-phone"
                        />
                      </div>

                      <div>
                        <Label htmlFor="birthDate" className="text-xs font-semibold text-neutral-dark">
                          Data de Nascimento
                        </Label>
                        <Input
                          id="birthDate"
                          type="date"
                          {...form.register("birthDate")}
                          className="mt-1"
                          data-testid="input-birthDate"
                        />
                      </div>

                      <div>
                        <Label htmlFor="crpNumber" className="text-xs font-semibold text-neutral-dark">
                          Número do CRP
                        </Label>
                        <Input
                          id="crpNumber"
                          {...form.register("crpNumber")}
                          placeholder="06/12345"
                          className="mt-1"
                          data-testid="input-crpNumber"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                          Data de Entrada na Clínica
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="w-3 h-3 text-neutral-dark/60 cursor-default" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-xs">
                                Este campo só pode ser editado pelo administrador.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          value={profile?.psychologist?.startedAtClinic || ""}
                          readOnly
                          disabled
                          type="date"
                          className="mt-1 bg-neutral-lightest text-neutral-dark"
                          data-testid="input-startedAtClinic-readonly"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            <Card className="border-neutral-light shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-neutral-darkest">Sobre mim</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...form.register("bio")}
                  placeholder="Fale sobre sua trajetória, abordagem terapêutica e o que motiva seu trabalho..."
                  rows={4}
                  className="resize-none text-sm"
                  data-testid="textarea-bio"
                />
              </CardContent>
            </Card>

            {/* Specializations */}
            <Card className="border-neutral-light shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-neutral-darkest">Áreas de Atuação</CardTitle>
              </CardHeader>
              <CardContent>
                <SpecializationChipSelector
                  selectedIds={selectedSpecIds}
                  onChange={setSelectedSpecIds}
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="gap-2"
                data-testid="button-save-profile"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
