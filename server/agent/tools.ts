import { storage } from "../storage";
import { BookingError } from "../lib/room-bookings";
import type { AgentContext } from "./context";
import { proposeBookingCancel, proposeRoomBooking, presentAction } from "./actions";

/**
 * What the assistant can do. Every tool reads through storage with ctx.companyId (so only the
 * active clinic's data), applies the same role rules as the screens, and never touches clinical
 * records. Writes are only proposals: the user confirms them on a card (actions.ts).
 */

type Param = { type: "string" | "integer"; description: string; required?: boolean; enum?: string[] };
type ToolResult = { data: unknown; actionId?: number };
type Tool = {
  name: string;
  description: string;
  params: Record<string, Param>;
  roles?: string[];
  run: (ctx: AgentContext, args: Record<string, any>, conversationId: number) => Promise<ToolResult>;
};

const LIST_LIMIT = 50;
const MAX_RANGE_DAYS = 366;

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const matches = (name: string, query?: string) => !query || plain(name).includes(plain(query));
const hhmm = (t: string) => t.slice(0, 5);
const hours = (start: string, end: string) => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return Math.max(0, m(end) - m(start)) / 60;
};
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDate = (v: unknown) => String(v).slice(0, 10);

function range(args: Record<string, any>) {
  const from = String(args.de ?? "");
  const to = String(args.ate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new BookingError("Datas devem estar no formato AAAA-MM-DD.", 400);
  if (from > to) throw new BookingError("A data inicial é depois da final.", 400);
  if ((day(to).getTime() - day(from).getTime()) / 86400000 > MAX_RANGE_DAYS) throw new BookingError("Use um período de até um ano.", 400);
  return { from, to };
}

/** psychologists.id -> name, for the active company. */
async function psychologistNames(companyId: number) {
  const [psychs, members] = await Promise.all([storage.getAllPsychologists(companyId), storage.getAllUsers(companyId)]);
  const byUser = new Map(members.map((u) => [u.id, u.fullName]));
  return new Map(psychs.map((p) => [p.id, byUser.get(p.userId) ?? `Psicóloga #${p.id}`]));
}

/** A psychologist only ever sees her own rows; staff may filter by one. */
function scopePsychologist(ctx: AgentContext, requested?: number) {
  if (ctx.role === "psychologist") return ctx.ownPsychologistId ?? -1;
  return requested ? Number(requested) : undefined;
}

const tools: Tool[] = [
  {
    name: "buscar_psicologas",
    description: "Lista as psicólogas da clínica, ou procura pelo nome (aceita parte do nome, sem acento). Use para descobrir o id antes de consultar ou reservar.",
    params: { nome: { type: "string", description: "Nome ou parte do nome" } },
    run: async (ctx, a) => {
      const names = await psychologistNames(ctx.companyId);
      const list = Array.from(names, ([id, nome]) => ({ id, nome })).filter((p) => matches(p.nome, a.nome));
      return { data: { total: list.length, psicologas: list.slice(0, LIST_LIMIT) } };
    },
  },
  {
    name: "buscar_salas",
    description: "Lista as salas da clínica, ou procura pelo nome. Traz id, capacidade e valor por hora.",
    params: { nome: { type: "string", description: "Nome ou parte do nome da sala" } },
    run: async (ctx, a) => {
      const rooms = (await storage.getAllRooms(ctx.companyId)).filter((r) => matches(r.name, a.nome));
      return { data: rooms.map((r) => ({ id: r.id, nome: r.name, capacidade: r.capacity, valorHora: Number(r.hourlyRate) })) };
    },
  },
  {
    name: "disponibilidade_salas",
    description: "Mostra, para um dia, os horários já reservados de cada sala (o resto do dia, das 06:00 às 22:00, está livre).",
    params: {
      data: { type: "string", description: "Dia no formato AAAA-MM-DD", required: true },
      sala_id: { type: "integer", description: "Só esta sala" },
    },
    run: async (ctx, a) => {
      const { from } = range({ de: a.data, ate: a.data });
      const [rooms, bookings, names] = await Promise.all([
        storage.getAllRooms(ctx.companyId),
        storage.getRoomBookingsByDate(ctx.companyId, day(from)),
        psychologistNames(ctx.companyId),
      ]);
      const data = rooms
        .filter((r) => !a.sala_id || r.id === Number(a.sala_id))
        .map((r) => ({
          sala_id: r.id,
          sala: r.name,
          ocupado: bookings
            .filter((b) => b.roomId === r.id)
            .sort((x, y) => x.startTime.localeCompare(y.startTime))
            .map((b) => ({ inicio: hhmm(b.startTime), fim: hhmm(b.endTime), psicologa: names.get(b.psychologistId) ?? "—" })),
        }));
      return { data: { dia: from, funcionamento: "06:00-22:00", salas: data } };
    },
  },
  {
    name: "reservas_de_sala",
    description:
      "Reservas de sala num período: totais (reservas, horas, quantas psicólogas diferentes reservaram), por psicóloga, por sala e a lista. Use para perguntas como 'quantas pessoas têm reserva este mês'.",
    params: {
      de: { type: "string", description: "Início do período, AAAA-MM-DD", required: true },
      ate: { type: "string", description: "Fim do período, AAAA-MM-DD", required: true },
      psicologa_id: { type: "integer", description: "Só desta psicóloga" },
      sala_id: { type: "integer", description: "Só desta sala" },
    },
    run: async (ctx, a) => {
      const { from, to } = range(a);
      const only = scopePsychologist(ctx, a.psicologa_id);
      const [all, rooms, names] = await Promise.all([
        storage.getRoomBookingsByDateRange(ctx.companyId, day(from), day(to)),
        storage.getAllRooms(ctx.companyId),
        psychologistNames(ctx.companyId),
      ]);
      const roomName = new Map(rooms.map((r) => [r.id, r.name]));
      const list = all
        .filter((b) => (only === undefined || b.psychologistId === only) && (!a.sala_id || b.roomId === Number(a.sala_id)))
        .sort((x, y) => `${x.date}${x.startTime}`.localeCompare(`${y.date}${y.startTime}`));

      const group = (key: (b: (typeof list)[number]) => string) => {
        const acc = new Map<string, { reservas: number; horas: number }>();
        for (const b of list) {
          const g = acc.get(key(b)) ?? { reservas: 0, horas: 0 };
          g.reservas += 1;
          g.horas += hours(b.startTime, b.endTime);
          acc.set(key(b), g);
        }
        return Array.from(acc, ([nome, v]) => ({ nome, ...v })).sort((x, y) => y.reservas - x.reservas);
      };
      return {
        data: {
          periodo: { de: from, ate: to },
          totalReservas: list.length,
          totalHoras: list.reduce((acc, b) => acc + hours(b.startTime, b.endTime), 0),
          psicologasDistintas: new Set(list.map((b) => b.psychologistId)).size,
          porPsicologa: group((b) => names.get(b.psychologistId) ?? "—"),
          porSala: group((b) => roomName.get(b.roomId) ?? "—"),
          reservas: list.slice(0, LIST_LIMIT).map((b) => ({
            id: b.id,
            data: isoDate(b.date),
            inicio: hhmm(b.startTime),
            fim: hhmm(b.endTime),
            sala: roomName.get(b.roomId) ?? "—",
            psicologa: names.get(b.psychologistId) ?? "—",
            finalidade: b.purpose ?? undefined,
          })),
          listaCortada: list.length > LIST_LIMIT,
        },
      };
    },
  },
  {
    name: "agenda",
    description: "Consultas (atendimentos) num período, com total por status. Status: scheduled (agendada), confirmed, completed, canceled, pending-confirmation.",
    params: {
      de: { type: "string", description: "Início do período, AAAA-MM-DD", required: true },
      ate: { type: "string", description: "Fim do período, AAAA-MM-DD", required: true },
      psicologa_id: { type: "integer", description: "Só desta psicóloga" },
      status: { type: "string", description: "Filtrar por status", enum: ["scheduled", "confirmed", "completed", "canceled", "pending-confirmation"] },
    },
    run: async (ctx, a) => {
      const { from, to } = range(a);
      const only = scopePsychologist(ctx, a.psicologa_id);
      const [all, rooms, names] = await Promise.all([
        storage.getAppointmentsByDateRange(ctx.companyId, day(from), day(to)),
        storage.getAllRooms(ctx.companyId),
        psychologistNames(ctx.companyId),
      ]);
      const roomName = new Map(rooms.map((r) => [r.id, r.name]));
      const list = all
        .filter((x) => (only === undefined || x.psychologistId === only) && (!a.status || x.status === a.status))
        .sort((x, y) => `${x.date}${x.startTime}`.localeCompare(`${y.date}${y.startTime}`));
      const porStatus: Record<string, number> = {};
      for (const x of list) porStatus[x.status] = (porStatus[x.status] ?? 0) + 1;
      return {
        data: {
          periodo: { de: from, ate: to },
          total: list.length,
          porStatus,
          consultas: list.slice(0, LIST_LIMIT).map((x) => ({
            data: isoDate(x.date),
            inicio: hhmm(x.startTime),
            fim: hhmm(x.endTime),
            paciente: x.patientName,
            psicologa: names.get(x.psychologistId) ?? "—",
            sala: roomName.get(x.roomId) ?? "—",
            status: x.status,
          })),
          listaCortada: list.length > LIST_LIMIT,
        },
      };
    },
  },
  {
    name: "pacientes",
    description: "Conta e lista pacientes ativos (só nome e psicóloga responsável; não há acesso a prontuário). Pode procurar pelo nome.",
    params: { busca: { type: "string", description: "Nome ou parte do nome" } },
    run: async (ctx, a) => {
      const [all, names] = await Promise.all([storage.listPatients(ctx.companyId, true), psychologistNames(ctx.companyId)]);
      const mine = ctx.role === "psychologist"
        ? all.filter((p) => p.psychologistId === (ctx.ownPsychologistId ?? -1) || p.createdBy === ctx.userId)
        : all;
      const list = mine.filter((p) => matches(p.fullName, a.busca));
      return {
        data: {
          totalAtivos: mine.length,
          encontrados: list.length,
          pacientes: list.slice(0, LIST_LIMIT).map((p) => ({ nome: p.fullName, psicologa: p.psychologistId ? names.get(p.psychologistId) ?? "—" : "—" })),
        },
      };
    },
  },
  {
    name: "resumo_financeiro",
    description: "Receitas, despesas e saldo num período, por categoria. Só para administradores.",
    roles: ["admin"],
    params: {
      de: { type: "string", description: "Início do período, AAAA-MM-DD", required: true },
      ate: { type: "string", description: "Fim do período, AAAA-MM-DD", required: true },
    },
    run: async (ctx, a) => {
      const { from, to } = range(a);
      const list = await storage.getTransactionsByDateRange(ctx.companyId, day(from), day(to));
      const sum = (type: string) => list.filter((t) => t.type === type).reduce((acc, t) => acc + Number(t.amount), 0);
      const porCategoria: Record<string, { receitas: number; despesas: number }> = {};
      for (const t of list) {
        const c = (porCategoria[t.category] ??= { receitas: 0, despesas: 0 });
        if (t.type === "income") c.receitas += Number(t.amount);
        else c.despesas += Number(t.amount);
      }
      const receitas = sum("income");
      const despesas = sum("expense");
      return { data: { periodo: { de: from, ate: to }, receitas, despesas, saldo: receitas - despesas, lancamentos: list.length, porCategoria } };
    },
  },
  {
    name: "resumo_comissoes",
    description: "Repasses (comissões) das psicólogas num mês: total pendente, total pago, número de psicólogas e de locações. Só para administradores.",
    roles: ["admin"],
    params: { mes: { type: "string", description: "Mês no formato AAAA-MM", required: true } },
    run: async (ctx, a) => {
      if (!/^\d{4}-\d{2}$/.test(String(a.mes))) throw new BookingError("Mês deve estar no formato AAAA-MM.", 400);
      return { data: await storage.getCommissionDashboard(ctx.companyId, String(a.mes)) };
    },
  },
  {
    name: "propor_reserva_sala",
    description:
      "Prepara uma reserva de sala para o usuário confirmar. NÃO grava nada: o usuário vê um cartão e clica em Confirmar. Confira antes os ids com buscar_salas e buscar_psicologas.",
    params: {
      sala_id: { type: "integer", description: "Id da sala", required: true },
      psicologa_id: { type: "integer", description: "Id da psicóloga", required: true },
      data: { type: "string", description: "Dia, AAAA-MM-DD", required: true },
      inicio: { type: "string", description: "Hora de início, HH:MM", required: true },
      fim: { type: "string", description: "Hora de fim, HH:MM", required: true },
      finalidade: { type: "string", description: "Para que é a reserva (opcional)" },
    },
    run: async (ctx, a, conversationId) => {
      const action = await proposeRoomBooking(ctx, conversationId, {
        roomId: Number(a.sala_id),
        psychologistId: Number(a.psicologa_id),
        date: String(a.data),
        startTime: String(a.inicio),
        endTime: String(a.fim),
        purpose: a.finalidade ? String(a.finalidade) : null,
      });
      return { data: { ok: true, aguardandoConfirmacao: presentAction(action).payload }, actionId: action.id };
    },
  },
  {
    name: "propor_cancelamento_reserva",
    description: "Prepara o cancelamento de uma reserva de sala (use o id vindo de reservas_de_sala). NÃO cancela: o usuário confirma num cartão.",
    params: { reserva_id: { type: "integer", description: "Id da reserva", required: true } },
    run: async (ctx, a, conversationId) => {
      const action = await proposeBookingCancel(ctx, conversationId, Number(a.reserva_id));
      return { data: { ok: true, aguardandoConfirmacao: presentAction(action).payload }, actionId: action.id };
    },
  },
];

/** Tool definitions in the OpenAI/Groq format, only the ones this role may use. */
export function toolDefinitions(ctx: AgentContext) {
  return tools
    .filter((t) => !t.roles || t.roles.includes(ctx.role))
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(t.params).map(([k, p]) => [k, { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) }])
          ),
          required: Object.entries(t.params).filter(([, p]) => p.required).map(([k]) => k),
        },
      },
    }));
}

/** Runs one tool call; rule violations come back as data, so the model can explain them. */
export async function runTool(ctx: AgentContext, name: string, rawArgs: string, conversationId: number): Promise<ToolResult> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { data: { erro: `Ferramenta desconhecida: ${name}` } };
  if (tool.roles && !tool.roles.includes(ctx.role)) return { data: { erro: "Sem permissão: só administradores têm acesso a isso." } };

  let args: Record<string, any>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { data: { erro: "Argumentos inválidos." } };
  }
  for (const [k, p] of Object.entries(tool.params)) {
    if (p.required && (args[k] === undefined || args[k] === null || args[k] === "")) return { data: { erro: `Falta o campo ${k}.` } };
    if (args[k] !== undefined && p.type === "integer" && !Number.isInteger(Number(args[k]))) return { data: { erro: `${k} precisa ser um número.` } };
  }
  try {
    return await tool.run(ctx, args, conversationId);
  } catch (error) {
    if (error instanceof BookingError) return { data: { erro: error.message } };
    throw error;
  }
}
