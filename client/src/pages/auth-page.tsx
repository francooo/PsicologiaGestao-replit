import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forwardRef, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, type InputProps } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertUserSchema } from "@shared/schema";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AuthBackground } from "@/components/auth/auth-background";
import {
  Loader2,
  Calendar,
  FileText,
  BarChart3,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AtSign,
} from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Informe seu e-mail ou nome de usuário"),
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

const highlights = [
  { label: "Agenda", icon: Calendar, className: "bg-[#DCE2D3] text-[#3F4A3B]" },
  { label: "Prontuários", icon: FileText, className: "bg-[#E6E0EE] text-[#4A4257]" },
  { label: "Financeiro", icon: BarChart3, className: "bg-[#F1E4D6] text-[#5C4634]" },
];

const labelClass = "text-sm font-medium text-[#1F3347]";
const inputClass =
  "h-12 rounded-lg border-[#E3E1DE] bg-white pl-11 text-[15px] text-[#1F3347] placeholder:text-[#8A8F96] focus-visible:ring-[#2E729B] focus-visible:ring-offset-0";
const submitClass =
  "h-12 w-full rounded-lg text-base font-medium text-white shadow-sm transition-colors hover:opacity-95";

type IconInputProps = InputProps & {
  icon: ComponentType<{ className?: string }>;
  trailing?: ReactNode;
};

const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon: Icon, trailing, className, ...props }, ref) => (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#5D6670]" />
      <Input
        ref={ref}
        className={cn(inputClass, trailing && "pr-11", className)}
        {...props}
      />
      {trailing}
    </div>
  ),
);
IconInput.displayName = "IconInput";

const PasswordInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      ref={ref}
      {...props}
      icon={Lock}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#5D6670] hover:text-[#1F3347]"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
});
PasswordInput.displayName = "PasswordInput";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

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
    <main className="relative min-h-screen overflow-hidden bg-[#FAF6F1] font-sans antialiased">
      <AuthBackground />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1680px] items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-12 xl:grid-cols-[minmax(0,1fr)_440px_minmax(0,0.55fr)] xl:gap-14 2xl:grid-cols-[minmax(0,1.25fr)_440px_minmax(0,0.9fr)] 2xl:px-24">
        {/* Left - brand message */}
        <section className="hidden lg:block">
          <BrandLogo size="lg" className="mb-12 2xl:mb-16" />
          <h1 className="text-[38px] font-medium leading-[1.2] tracking-tight text-[#1F3347] xl:text-[42px] 2xl:text-[48px]">
            Seu consultório,
            <br />
            mais leve de organizar.
          </h1>
          <p className="mt-5 max-w-[480px] text-lg leading-relaxed 2xl:text-xl text-[#6B7178]">
            Gerencie sua agenda, prontuários, finanças e muito mais em um só lugar.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {highlights.map(({ label, icon: Icon, className }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[15px] font-medium 2xl:px-6 2xl:py-3.5 2xl:text-base ${className}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Center - card */}
        <section className="mx-auto w-full max-w-[440px]">
          <div className="rounded-2xl bg-white px-6 py-10 shadow-[0_10px_40px_-12px_rgba(31,51,71,0.12)] sm:px-12">
            <BrandLogo className="mb-10 justify-center" />

            <div className="mb-8">
              <h2 className="text-[30px] font-semibold leading-tight text-[#1F3347]">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </h2>
              <p className="mt-1 text-base text-[#6B7178]">
                {mode === "login"
                  ? "Entre para continuar sua rotina no ConsultaPsi."
                  : "Preencha suas informações para começar a usar o ConsultaPsi."}
              </p>
            </div>

            {mode === "login" && (
              <>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>E-mail ou nome de usuário</FormLabel>
                          <FormControl>
                            <IconInput
                              icon={Mail}
                              data-testid="input-username"
                              autoComplete="username"
                              placeholder="Digite seu e-mail ou nome de usuário"
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
                          <FormLabel className={labelClass}>Senha</FormLabel>
                          <FormControl>
                            <PasswordInput
                              data-testid="input-password"
                              autoComplete="current-password"
                              placeholder="Digite sua senha"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
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
                      className={submitClass}
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

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#E6E3DF]" />
                  <span className="text-xs font-medium uppercase text-[#8A8F96]">ou</span>
                  <div className="h-px flex-1 bg-[#E6E3DF]" />
                </div>

                <button
                  data-testid="button-google-login"
                  type="button"
                  onClick={() => (window.location.href = "/auth/google")}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#E3E1DE] bg-white text-base font-medium text-[#1F3347] transition-colors hover:bg-[#FAF8F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E729B]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" fill="#4285F4" />
                      <path d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" fill="#34A853" />
                      <path d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" fill="#FBBC05" />
                      <path d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" fill="#EA4335" />
                    </g>
                  </svg>
                  Continuar com Google
                </button>

                <p className="mt-8 text-center text-base text-[#5D6670]">
                  Não tem uma conta?{" "}
                  <button
                    data-testid="tab-register"
                    type="button"
                    onClick={() => setMode("register")}
                    className="font-medium hover:underline"
                    style={{ color: BRAND_BLUE }}
                  >
                    Criar conta
                  </button>
                </p>
              </>
            )}

            {mode === "register" && (
              <>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Nome completo</FormLabel>
                          <FormControl>
                            <IconInput
                              icon={User}
                              data-testid="input-fullname"
                              autoComplete="name"
                              placeholder="Digite seu nome completo"
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
                          <FormLabel className={labelClass}>E-mail</FormLabel>
                          <FormControl>
                            <IconInput
                              icon={Mail}
                              data-testid="input-email"
                              type="email"
                              autoComplete="email"
                              placeholder="seu.email@exemplo.com"
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
                          <FormLabel className={labelClass}>Nome de usuário</FormLabel>
                          <FormControl>
                            <IconInput
                              icon={AtSign}
                              data-testid="input-register-username"
                              autoComplete="username"
                              placeholder="Escolha um nome de usuário"
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
                          <FormLabel className={labelClass}>Senha</FormLabel>
                          <FormControl>
                            <PasswordInput
                              data-testid="input-register-password"
                              autoComplete="new-password"
                              placeholder="Escolha uma senha"
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
                          <FormLabel className={labelClass}>Confirmar senha</FormLabel>
                          <FormControl>
                            <PasswordInput
                              data-testid="input-confirm-password"
                              autoComplete="new-password"
                              placeholder="Confirme sua senha"
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
                          <FormLabel className={labelClass}>Função</FormLabel>
                          <FormControl>
                            <select
                              data-testid="select-role"
                              className="flex h-12 w-full rounded-lg border border-[#E3E1DE] bg-white px-4 text-[15px] text-[#1F3347] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E729B]"
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
                      className={`${submitClass} mt-2`}
                      style={{ backgroundColor: BRAND_BLUE }}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </form>
                </Form>

                <p className="mt-8 text-center text-base text-[#5D6670]">
                  Já tem uma conta?{" "}
                  <button
                    data-testid="tab-login"
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-medium hover:underline"
                    style={{ color: BRAND_BLUE }}
                  >
                    Entrar
                  </button>
                </p>
              </>
            )}
          </div>
        </section>

        {/* Right - reserved for the plant illustration in the background */}
        <div className="hidden xl:block" />
      </div>
    </main>
  );
}
