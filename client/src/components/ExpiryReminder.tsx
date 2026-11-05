import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { accessState, endingLabel, formatDay } from "@/lib/company-access";

/** Once per browser session, tells the clinic's admins that its access ends within a week. */
export function ExpiryReminder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const company = user?.activeCompany;
  const ending = !!company && user?.role === "admin" && accessState(company) === "ending";

  useEffect(() => {
    if (!ending || !company?.accessValidUntil) return;
    const key = `expiry-reminder:${company.id}:${company.accessValidUntil}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: remind anyway
    }
    toast({
      title: `${endingLabel(company.accessValidUntil)} o acesso da clínica`,
      description: `O acesso de ${company.name} vai até ${formatDay(company.accessValidUntil)}. Fale com o suporte para renovar.`,
    });
  }, [ending, company?.id, company?.accessValidUntil]);

  return null;
}
