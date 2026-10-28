import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  roles,
  platformOnly,
}: {
  path: string;
  component: () => React.JSX.Element;
  /** Roles allowed on this route; logged-in users without one go to the dashboard. */
  roles?: string[];
  /** Platform (super) admin pages: no active company needed. */
  platformOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (platformOnly) {
    return user.isPlatformAdmin ? <Route path={path} component={Component} /> : (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // Every page works inside a company; pick one first (or learn there is none yet)
  if (!user.activeCompany) {
    return (
      <Route path={path}>
        <Redirect to="/selecionar-empresa" />
      </Route>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
