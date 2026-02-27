import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Link } from "wouter";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "A senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [, params] = useRoute("/reset-password");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Extract token from URL query parameters - use window.location for reliability
  const getTokenFromUrl = () => {
    // Try window.location.search first (most reliable)
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }
    // Fallback to wouter location
    if (location.includes('?')) {
      const params = new URLSearchParams(location.split('?')[1]);
      return params.get('token');
    }
    return null;
  };
  
  const token = getTokenFromUrl();
  
  // Debug logging
  console.log('[ResetPassword] URL Debug:', {
    windowLocation: typeof window !== 'undefined' ? window.location.href : 'N/A',
    windowSearch: typeof window !== 'undefined' ? window.location.search : 'N/A',
    wouterLocation: location,
    extractedToken: token ? token.substring(0, 8) + '...' : null
  });

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidatingToken(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const res = await fetch(`/api/reset-password/${token}`);
        const data = await res.json();
        
        if (res.ok && data.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          toast({
            title: "Token Inválido",
            description: data.message || "Token inválido ou expirado",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsTokenValid(false);
        toast({
          title: "Erro",
          description: "Erro ao validar token",
          variant: "destructive",
        });
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [token, toast]);

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Senha alterada",
        description: data.message,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao redefinir senha",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    resetMutation.mutate(data);
  };

  // Loading state while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-neutral-dark">Validando token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <CardTitle className="text-xl font-semibold text-neutral-darkest">
              Token Inválido
            </CardTitle>
            <CardDescription>
              O link de recuperação de senha é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-neutral-dark text-center">
                Solicite uma nova recuperação de senha para receber um novo link.
              </p>
              <Button asChild className="w-full">
                <Link href="/password-recovery">
                  Solicitar Nova Recuperação
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth-page">
                  Voltar ao Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="text-xl font-semibold text-neutral-darkest">
              Senha Alterada
            </CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-neutral-dark text-center">
                Agora você pode fazer login com sua nova senha.
              </p>
              <Button asChild className="w-full">
                <Link href="/auth-page">
                  Fazer Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-neutral-darkest">
            Nova Senha
          </CardTitle>
          <CardDescription>
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua nova senha"
                          {...field}
                          disabled={resetMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={resetMutation.isPending}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-neutral-dark">
                      A senha deve ter pelo menos 6 caracteres, incluindo: 1 letra minúscula, 1 maiúscula e 1 número
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirme sua nova senha"
                          {...field}
                          disabled={resetMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={resetMutation.isPending}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}