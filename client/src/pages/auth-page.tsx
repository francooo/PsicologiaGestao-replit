import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertUserSchema } from "@shared/schema";
import { Loader2, Calendar, BarChart2, DoorOpen, Lock, ClipboardList, ArrowLeftRight } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório"),
  password: z.string().min(1, "A senha é obrigatória"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const BRAND_BLUE = "#2E729B";
const BRAND_DARK_BLUE = "#1a547a";

const features = [
  {
    title: "Agendamentos",
    description: "Organize consultas com facilidade e evite conflitos de horários.",
    icon: Calendar,
  },
  {
    title: "Financeiro",
    description: "Controle receitas e despesas com relatórios detalhados.",
    icon: BarChart2,
  },
  {
    title: "Reserva de Salas",
    description: "Gerencie a ocupação e disponibilidade das salas.",
    icon: DoorOpen,
  },
  {
    title: "Permissões",
    description: "Defina níveis de acesso e controle de usuários.",
    icon: Lock,
  },
  {
    title: "Resumo de Prontuário",
    description: "Acesso rápido e resumo dos prontuários dos pacientes.",
    icon: ClipboardList,
  },
  {
    title: "Transferência de Paciente",
    description: "Facilite a transferência de pacientes entre profissionais.",
    icon: ArrowLeftRight,
  },
];

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      role: "psychologist",
      status: "active",
    },
  });

  const onLoginSubmit = (data: LoginFormData) => loginMutation.mutate(data);

  const onRegisterSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  if (user) return <Redirect to="/" />;

  return (
    <main className="flex w-full min-h-screen flex-col md:flex-row font-sans antialiased">
      {/* Left Panel - Form */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold" style={{ color: BRAND_BLUE }}>ConsultaPsi</h1>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-1">
              {activeTab === "login" ? "Entrar" : "Criar uma conta"}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === "login"
                ? "Entre com suas credenciais para acessar o sistema"
                : "Preencha suas informações para criar uma nova conta"}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
            <button
              data-testid="tab-login"
              onClick={() => setActiveTab("login")}
              className="flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors"
              style={
                activeTab === "login"
                  ? { backgroundColor: BRAND_BLUE, color: "#fff" }
                  : { color: "#6b7280" }
              }
            >
              Login
            </button>
            <button
              data-testid="tab-register"
              onClick={() => setActiveTab("register")}
              className="flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors"
              style={
                activeTab === "register"
                  ? { backgroundColor: BRAND_BLUE, color: "#fff" }
                  : { color: "#6b7280" }
              }
            >
              Registro
            </button>
          </div>

          {/* Login Form */}
          {activeTab === "login" && (
            <>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Nome de usuário
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-username"
                            placeholder="Digite seu nome de usuário"
                            className="border-gray-200 focus-visible:ring-[#2E729B]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Senha</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-password"
                            type="password"
                            placeholder="Digite sua senha"
                            className="border-gray-200 focus-visible:ring-[#2E729B]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-end">
                    <Link
                      href="/password-recovery"
                      className="text-sm font-medium hover:underline"
                      style={{ color: BRAND_BLUE }}
                    >
                      Esqueceu sua senha?
                    </Link>
                  </div>
                  <Button
                    data-testid="button-login"
                    type="submit"
                    className="w-full text-white transition-colors"
                    style={{ backgroundColor: BRAND_BLUE }}
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="mt-6 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">Ou continue com</span>
                  </div>
                </div>
              </div>

              {/* Google Login */}
              <button
                data-testid="button-google-login"
                type="button"
                onClick={() => (window.location.href = "/auth/google")}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ focusRingColor: BRAND_BLUE } as any}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" fill="#4285F4" />
                    <path d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" fill="#34A853" />
                    <path d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" fill="#FBBC05" />
                    <path d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" fill="#EA4335" />
                  </g>
                </svg>
                Google
              </button>

              <p className="mt-6 text-center text-sm text-gray-600">
                Não tem uma conta?{" "}
                <button
                  onClick={() => setActiveTab("register")}
                  className="font-medium hover:underline"
                  style={{ color: BRAND_BLUE }}
                >
                  Registre-se
                </button>
              </p>
            </>
          )}

          {/* Register Form */}
          {activeTab === "register" && (
            <>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Nome completo</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-fullname"
                            placeholder="Digite seu nome completo"
                            className="border-gray-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-email"
                            type="email"
                            placeholder="seu.email@exemplo.com"
                            className="border-gray-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Nome de usuário</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-register-username"
                            placeholder="Escolha um nome de usuário"
                            className="border-gray-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Senha</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-register-password"
                            type="password"
                            placeholder="Escolha uma senha"
                            className="border-gray-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Confirmar senha</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-confirm-password"
                            type="password"
                            placeholder="Confirme sua senha"
                            className="border-gray-200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Função</FormLabel>
                        <FormControl>
                          <select
                            data-testid="select-role"
                            className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...field}
                          >
                            <option value="psychologist">Psicólogo(a)</option>
                            <option value="receptionist">Recepcionista</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    data-testid="button-register"
                    type="submit"
                    className="w-full text-white transition-colors"
                    style={{ backgroundColor: BRAND_BLUE }}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      "Registrar-se"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-sm text-gray-600">
                Já tem uma conta?{" "}
                <button
                  onClick={() => setActiveTab("login")}
                  className="font-medium hover:underline"
                  style={{ color: BRAND_BLUE }}
                >
                  Entre aqui
                </button>
              </p>
            </>
          )}
        </div>
      </section>

      {/* Right Panel - Features */}
      <section
        className="hidden md:flex w-full md:w-1/2 text-white p-8 lg:p-16 flex-col justify-center"
        style={{ backgroundColor: BRAND_BLUE }}
      >
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">ConsultaPsi</h2>
            <h3 className="text-2xl font-medium mb-4">
              Sistema de Gestão para Consultórios de Psicologia
            </h3>
            <p className="text-blue-100 text-lg max-w-lg mx-auto">
              Gerencie agendamentos, controle financeiro, reserva de salas e muito mais em um único sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-xl p-5 transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-semibold">{title}</h4>
                  <Icon className="h-5 w-5 opacity-80 flex-shrink-0" />
                </div>
                <p className="text-sm text-blue-100 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
