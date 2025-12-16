import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Psychologists from "@/pages/psychologists";
import Rooms from "@/pages/rooms";
import Financial from "@/pages/financial";
import CashFlow from "@/pages/cash-flow";
import Permissions from "@/pages/permissions";
import Profile from "@/pages/profile";
import QuickBooking from "@/pages/quick-booking";
import PasswordRecovery from "@/pages/password-recovery";
import ResetPassword from "@/pages/reset-password";
import Invoices from "@/pages/invoices";
import AdminInvoices from "@/pages/admin-invoices";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/appointments" component={Appointments} />
      <ProtectedRoute path="/psychologists" component={Psychologists} />
      <ProtectedRoute path="/rooms" component={Rooms} />
      <ProtectedRoute path="/financial" component={Financial} />
      <ProtectedRoute path="/cash-flow" component={CashFlow} />
      <ProtectedRoute path="/invoices" component={Invoices} />
      <ProtectedRoute path="/admin/invoices" component={AdminInvoices} />
      <ProtectedRoute path="/permissions" component={Permissions} />
      <ProtectedRoute path="/profile" component={Profile} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth-page" component={AuthPage} />
      <Route path="/password-recovery" component={PasswordRecovery} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/quick-booking" component={QuickBooking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
