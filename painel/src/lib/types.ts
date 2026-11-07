export type Plan = "solo" | "intermediario" | "expert";
export type PaymentMethod = "pix" | "cartao" | "boleto" | "transferencia" | "dinheiro" | "outro";
export type CompanyStatus = "active" | "suspended";

export interface User {
  id: number;
  fullName: string;
  email: string;
  username?: string;
  isPlatformAdmin?: boolean;
}

export interface Overview {
  companies: { total: number; active: number; expired: number; expiringSoon: number; suspended: number };
  revenue: { period: number; total: number; mrr: number };
  revenueByMonth: { month: string; amount: number }[];
  plans: { plan: Plan | null; count: number }[];
  upcoming: { id: number; name: string; accessValidUntil: string | null; accessExpired: boolean; daysLeft: number | null }[];
}

export interface AdminRef {
  id: number;
  fullName: string;
  email: string;
  since?: string;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
}

export interface Member extends AdminRef {
  role: string;
}

export interface Subscriber {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  status: CompanyStatus;
  plan: Plan | null;
  monthlyPrice: number | null;
  subscriptionStartedAt: string | null;
  monthsSubscribed: number | null;
  accessValidUntil: string | null;
  accessExpired: boolean;
  aiEnabled: boolean;
  totalPaid: number;
  paymentsCount: number;
  lastPaymentAt: string | null;
  membersCount: number;
  lastAccessAt: string | null;
  lastAccessBy: { id: number; fullName: string } | null;
  admins: AdminRef[];
  createdAt?: string;
}

export interface Payment {
  id: number;
  amount: number;
  paidAt: string;
  referenceMonth: string;
  monthsCovered: number;
  method: PaymentMethod;
  notes: string | null;
  validUntilAfter: string | null;
  createdAt: string;
  createdBy: { id: number; fullName: string } | null;
}

export interface PaymentWithCompany extends Payment {
  company: { id: number; name: string };
}

export interface SubscriptionEvent {
  id: number;
  type: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: number; fullName: string } | null;
}

export interface SubscriptionDetail {
  company: Subscriber;
  admins: AdminRef[];
  members: Member[];
  accessTrackingSince: string | null;
  payments: Payment[];
  events: SubscriptionEvent[];
}

export interface PlatformAdmin {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  clinics: {
    id: number;
    name: string;
    status: CompanyStatus;
    since: string | null;
    accessValidUntil: string | null;
    accessExpired: boolean;
  }[];
}
