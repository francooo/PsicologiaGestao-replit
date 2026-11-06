import { Redirect, Route, Switch, useLocation } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { ErrorBox } from "./components/ui";
import { LoginPage } from "./pages/Login";
import { OverviewPage } from "./pages/Overview";
import { SubscribersPage } from "./pages/Subscribers";
import { ClinicPage } from "./pages/Clinic";
import { AdminsPage } from "./pages/Admins";
import { ReportsPage } from "./pages/Reports";

export function App() {
  const { token, user, loading, error, signOut } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/login")) return <LoginPage />;
  if (!token) return <Redirect to="/login" />;

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        <Loader2 className="spin" aria-label="Carregando" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="restricted">
        <div className="card">
          <ErrorBox error={error ?? new Error("Não foi possível carregar sua conta.")} />
          <button className="btn btn--secondary btn--block" style={{ marginTop: 16 }} onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (!user.isPlatformAdmin) {
    return (
      <div className="restricted">
        <div className="card">
          <div className="icon-circle">
            <ShieldAlert aria-hidden="true" />
          </div>
          <h1 className="page-title" style={{ fontSize: 26 }}>Acesso restrito</h1>
          <p className="page-sub" style={{ marginTop: 8 }}>
            A conta <b>{user.email}</b> não tem acesso ao Painel do dono. Ele é exclusivo da administração da plataforma ConsultaPsi.
          </p>
          <button className="btn btn--primary btn--block" style={{ marginTop: 24 }} onClick={() => void signOut()}>
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={OverviewPage} />
        <Route path="/assinantes" component={SubscribersPage} />
        <Route path="/clinicas/:id">{(p) => <ClinicPage id={Number(p.id)} />}</Route>
        <Route path="/administradores" component={AdminsPage} />
        <Route path="/relatorios" component={ReportsPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Layout>
  );
}
