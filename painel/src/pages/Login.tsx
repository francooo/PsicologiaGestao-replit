import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, BarChart3, CalendarClock, FileText, Loader2 } from "lucide-react";
import { api, API_URL, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Logo, LogoMark } from "../components/Logo";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginPage() {
  const { token, signIn } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});

  // Google returns here with ?token=… or ?error=google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      window.history.replaceState(null, "", "/login");
      signIn(t);
      return;
    }
    if (params.get("error")) {
      setErrors({ form: "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha." });
      window.history.replaceState(null, "", "/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leave the login screen once a token exists (after the state update, so the app sees it)
  useEffect(() => {
    if (token) navigate("/", { replace: true });
  }, [token, navigate]);

  const googleHref = `${API_URL}/auth/google?mobile_redirect=${encodeURIComponent(`${window.location.origin}/login`)}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!username.trim()) next.username = "Informe seu e-mail ou usuário.";
    if (!password) next.password = "Informe sua senha.";
    setErrors(next);
    if (next.username || next.password) return;
    setBusy(true);
    try {
      const res = await api<{ token: string }>("/api/mobile/login", {
        method: "POST",
        body: { username: username.trim(), password },
        auth: false,
      });
      if (!res?.token) throw new ApiError(500, "O servidor não devolveu o acesso. Tente de novo.");
      signIn(res.token);
    } catch (err) {
      const e2 = err as ApiError;
      if (e2.status === 401) setErrors({ password: "E-mail, usuário ou senha incorretos." });
      else if (e2.field === "username" || e2.field === "password") setErrors({ [e2.field]: e2.message });
      else setErrors({ form: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth__side" aria-hidden="true">
        <Logo />
        <div>
          <h2>Assinaturas, receita e vencimentos das clínicas em um só lugar</h2>
          <p>O Painel do dono reúne os assinantes do ConsultaPsi, os pagamentos registrados e os relatórios em PDF.</p>
          <div className="auth__points">
            <div><BarChart3 /> Receita do mês e dos últimos 12 meses</div>
            <div><CalendarClock /> Clínicas que vencem nos próximos 30 dias</div>
            <div><FileText /> Relatórios em PDF por clínica e por período</div>
          </div>
        </div>
        <div className="small muted">Acesso exclusivo da administração da plataforma.</div>
      </section>

      <section className="auth__main">
        <div className="auth__card">
          <div className="auth-mobile-logo">
            <span className="logo">
              <LogoMark />
              <span className="logo__word">Consulta<b>Psi</b></span>
              <span className="logo__tag">Painel</span>
            </span>
          </div>
          <h1 className="page-title">Entrar no Painel</h1>
          <p className="page-sub">Use a conta de administração da plataforma.</p>

          {errors.form ? (
            <div className="alert alert--danger" role="alert" style={{ marginTop: 24 }}>
              <AlertTriangle />
              <span>{errors.form}</span>
            </div>
          ) : null}

          <a className="btn google-btn btn--block" href={googleHref} style={{ marginTop: 24 }}>
            <GoogleIcon />
            Entrar com Google
          </a>

          <div className="divider">ou com e-mail e senha</div>

          <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
            <div className="field">
              <label htmlFor="username">E-mail ou usuário</label>
              <input
                id="username"
                className="input"
                autoComplete="username"
                inputMode="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-err" : undefined}
              />
              {errors.username ? <div className="field-error" id="username-err">{errors.username}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-err" : undefined}
              />
              {errors.password ? <div className="field-error" id="password-err">{errors.password}</div> : null}
            </div>
            <button type="submit" className="btn btn--primary btn--block" style={{ height: 44 }} disabled={busy}>
              {busy ? <Loader2 className="spin" /> : null}
              Entrar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
