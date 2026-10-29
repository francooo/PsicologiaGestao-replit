import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies } from "@shared/schema";
import { storage } from "../storage";

/** Who is talking to the assistant: every tool runs inside these limits. */
export type AgentContext = {
  companyId: number;
  companyName: string;
  userId: number;
  userName: string;
  role: string; // admin | psychologist | receptionist (role in the active company)
  /** The user's psychologists.id in this company; a psychologist only sees and books her own. */
  ownPsychologistId: number | null;
  /** "Today" in Brasília, YYYY-MM-DD. */
  today: string;
  now: Date;
};

const TZ = "America/Sao_Paulo";

export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function describeNow(now: Date) {
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(now);
  return { weekday, date, time };
}

export async function agentContext(req: Request): Promise<AgentContext> {
  const companyId = req.companyId!;
  const user = req.user!;
  const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId));
  const own = user.role === "psychologist" ? await storage.getPsychologistByUserId(companyId, user.id) : undefined;
  const now = new Date();
  return {
    companyId,
    companyName: company?.name ?? "",
    userId: user.id,
    userName: user.fullName,
    role: user.role,
    ownPsychologistId: own?.id ?? null,
    today: todayInBrazil(now),
    now,
  };
}
