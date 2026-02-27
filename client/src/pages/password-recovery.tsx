import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
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

const passwordRecoverySchema = z.object({
  email: z.string().email("Email inválido"),
});

type PasswordRecoveryFormData = z.infer<typeof passwordRecoverySchema>;

export default function PasswordRecovery() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: {
      email: "",
    },
  });

  const recoveryMutation = useMutation({
    mutationFn: async (data: PasswordRecoveryFormData) => {
      const res = await apiRequest("POST", "/api/recover-password", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Email enviado",
        description: data.message,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar solicitação",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PasswordRecoveryFormData) => {
    recoveryMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-neutral-darkest">
              Email Enviado
            </CardTitle>
            <CardDescription>
              Se o email informado estiver cadastrado, você receberá instruções para redefinir sua senha em alguns minutos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-neutral-dark">
                <p>• Verifique sua caixa de entrada e spam</p>
                <p>• O link será válido por 1 hora</p>
                <p>• Se não receber, tente novamente</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth-page">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-lightest flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-neutral-darkest">
            Recuperar Senha
          </CardTitle>
          <CardDescription>
            Digite seu email para receber instruções de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        {...field}
                        disabled={recoveryMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={recoveryMutation.isPending}
              >
                {recoveryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Recuperar Senha"
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center">
            <Link href="/auth-page" className="text-sm text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}