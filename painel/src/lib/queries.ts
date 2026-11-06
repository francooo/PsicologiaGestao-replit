import { useQuery } from "@tanstack/react-query";
import { api, qs } from "./api";
import type { Overview, PaymentWithCompany, PlatformAdmin, Subscriber, SubscriptionDetail } from "./types";

export const keys = {
  overview: (from: string, to: string) => ["overview", from, to] as const,
  subscribers: ["subscribers"] as const,
  subscription: (id: number) => ["subscription", id] as const,
  payments: (from: string, to: string) => ["payments", from, to] as const,
  admins: ["admins"] as const,
};

export function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: keys.overview(from, to),
    queryFn: () => api<Overview>(`/api/platform/overview${qs({ from, to })}`),
    placeholderData: (prev) => prev,
  });
}

export function useSubscribers() {
  return useQuery({ queryKey: keys.subscribers, queryFn: () => api<Subscriber[]>("/api/platform/subscribers") });
}

export function useSubscription(id: number) {
  return useQuery({
    queryKey: keys.subscription(id),
    queryFn: () => api<SubscriptionDetail>(`/api/platform/companies/${id}/subscription`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function usePayments(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: keys.payments(from, to),
    queryFn: () => api<PaymentWithCompany[]>(`/api/platform/payments${qs({ from, to })}`),
    enabled,
  });
}

export function useAdmins() {
  return useQuery({ queryKey: keys.admins, queryFn: () => api<PlatformAdmin[]>("/api/platform/admins") });
}
