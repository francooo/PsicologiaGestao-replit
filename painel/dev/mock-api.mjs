// Mock da API do ConsultaPsi para testar o Painel localmente (dados fictícios, nada de produção).
// Uso: node dev/mock-api.mjs   (porta 5199; MOCK_PORT muda a porta)
// Logins: dono@consultapsi.example / teste123 (admin da plataforma)
//         marina@consultapsi.example / teste123 (sem acesso: tela "Acesso restrito")
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 5199);
const ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"]);

/* ---------- datas ---------- */
const pad = (n) => String(n).padStart(2, "0");
function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
const TODAY = todayISO();
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function addMonths(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + months;
  const ty = Math.floor(idx / 12), tm = idx % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${pad(tm + 1)}-${pad(Math.min(d, last))}`;
}
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const ts = (iso, h = 10, min = 0) => `${iso}T${pad(h + 3)}:${pad(min)}:00.000Z`; // horário de Brasília → UTC

/* ---------- usuários ---------- */
const owner = { id: 1, fullName: "Andrews Franco", username: "andrews", email: "dono@consultapsi.example", isPlatformAdmin: true };
const outsider = { id: 2, fullName: "Marina Costa", username: "marina", email: "marina@consultapsi.example", isPlatformAdmin: false };
const loginUsers = [owner, outsider];
const sessions = new Map(); // token → user

const people = [
  [10, "Helena Prado", "helena.prado@bemestar.example", "2025-08-02"],
  [11, "Rafael Souza", "rafael@bemestar.example", "2025-09-14"],
  [12, "Camila Andrade", "camila@acolher.example", "2026-01-28"],
  [13, "João Batista Lima", "joao@institutoraizes.example", "2025-11-12"],
  [14, "Luíza Fernandes", "luiza@draluiza.example", "2026-05-10"],
  [15, "Beatriz Gonçalves", "beatriz@equilibrio.example", "2025-06-20"],
  [16, "Otávio Ribeiro", "otavio@novajornada.example", "2026-10-28"],
  [17, "Patrícia Moraes", "patricia@integradasul.example", "2026-01-05"],
  [18, "Sérgio Araújo", "sergio@centroipe.example", "2025-11-25"],
].map(([id, fullName, email, createdAt]) => ({ id, fullName, email, createdAt: ts(createdAt, 9) }));
// Último acesso: minutos atrás (null = nunca acessou desde o início do registro)
const ago = (min) => (min == null ? null : new Date(Date.now() - min * 60000).toISOString());
const DAY = 1440;
const access = { 10: [DAY * 2, 25], 11: [DAY * 3, DAY * 3], 12: [DAY * 14, DAY * 12], 13: [DAY * 50, DAY * 45], 14: [300, 120], 15: [DAY * 95, DAY * 90], 16: [null, null], 17: [DAY + 200, DAY + 30], 18: [DAY * 21, DAY * 20] };
for (const p of people) [p.lastLoginAt, p.lastSeenAt] = (access[p.id] ?? [null, null]).map(ago);
const person = (id) => people.find((p) => p.id === id);
// Outros usuários (não admins) de algumas clínicas
const staff = [
  { companyId: 1, id: 40, fullName: "Marta Lopes", email: "marta@bemestar.example", role: "psychologist", since: "2025-08-20", lastLoginAt: ago(DAY), lastSeenAt: ago(8) },
  { companyId: 1, id: 41, fullName: "Ana Recepção", email: "recepcao@bemestar.example", role: "receptionist", since: "2025-10-02", lastLoginAt: null, lastSeenAt: null },
  { companyId: 2, id: 42, fullName: "Bruno Teixeira", email: "bruno@acolher.example", role: "psychologist", since: "2026-03-11", lastLoginAt: ago(DAY * 9), lastSeenAt: ago(DAY * 9) },
  { companyId: 6, id: 43, fullName: "Clara Mendes", email: "clara@novajornada.example", role: "psychologist", since: "2026-10-29", lastLoginAt: null, lastSeenAt: null },
];
function membersOf(c) {
  const admins = c.admins.map(([id, since]) => { const p = person(id); return { id: p.id, fullName: p.fullName, email: p.email, role: "admin", since, lastLoginAt: p.lastLoginAt, lastSeenAt: p.lastSeenAt }; });
  const rest = staff.filter((s) => s.companyId === c.id).map(({ companyId, ...s }) => s);
  return [...admins, ...rest].sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""));
}

/* ---------- clínicas ---------- */
let companies = [
  { id: 1, name: "Clínica Bem-Estar Mente", slug: "bem-estar-mente", cnpj: "12.345.678/0001-90", status: "active", plan: "expert", monthlyPrice: 149, subscriptionStartedAt: "2025-08-10", accessValidUntil: addDays(TODAY, 40), aiEnabled: true, membersCount: 9, createdAt: ts("2025-08-02"), admins: [[10, "2025-08-02"], [11, "2025-09-14"]] },
  { id: 2, name: "Espaço Acolher Psicologia", slug: "espaco-acolher", cnpj: "23.456.789/0001-01", status: "active", plan: "intermediario", monthlyPrice: 99, subscriptionStartedAt: "2026-02-03", accessValidUntil: addDays(TODAY, 12), aiEnabled: false, membersCount: 5, createdAt: ts("2026-01-28"), admins: [[12, "2026-01-28"]] },
  { id: 3, name: "Instituto Raízes de Psicologia", slug: "instituto-raizes", cnpj: "34.567.890/0001-12", status: "active", plan: "solo", monthlyPrice: 39, subscriptionStartedAt: "2025-11-20", accessValidUntil: addDays(TODAY, -17), aiEnabled: false, membersCount: 1, createdAt: ts("2025-11-12"), admins: [[13, "2025-11-12"]] },
  { id: 4, name: "Consultório Dra. Luíza Fernandes", slug: "dra-luiza", cnpj: null, status: "active", plan: "solo", monthlyPrice: 39, subscriptionStartedAt: "2026-05-15", accessValidUntil: addDays(TODAY, 25), aiEnabled: true, membersCount: 1, createdAt: ts("2026-05-10"), admins: [[14, "2026-05-10"], [10, "2026-06-01"]] },
  { id: 5, name: "Núcleo Equilíbrio", slug: "nucleo-equilibrio", cnpj: "45.678.901/0001-23", status: "suspended", plan: "expert", monthlyPrice: 149, subscriptionStartedAt: "2025-07-01", accessValidUntil: addDays(TODAY, -50), aiEnabled: false, membersCount: 12, createdAt: ts("2025-06-20"), admins: [[15, "2025-06-20"]] },
  { id: 6, name: "Clínica Nova Jornada", slug: "nova-jornada", cnpj: "56.789.012/0001-34", status: "active", plan: null, monthlyPrice: null, subscriptionStartedAt: null, accessValidUntil: null, aiEnabled: false, membersCount: 2, createdAt: ts("2026-10-28"), admins: [[16, "2026-10-28"]] },
  { id: 7, name: "Psicologia Integrada Sul", slug: "integrada-sul", cnpj: "67.890.123/0001-45", status: "active", plan: "intermediario", monthlyPrice: 99, subscriptionStartedAt: "2026-01-10", accessValidUntil: addMonths(TODAY, 3), aiEnabled: true, membersCount: 6, createdAt: ts("2026-01-05"), admins: [[17, "2026-01-05"]] },
  { id: 8, name: "Centro Terapêutico Ipê Amarelo", slug: "centro-ipe", cnpj: "78.901.234/0001-56", status: "active", plan: "intermediario", monthlyPrice: 89, subscriptionStartedAt: "2025-12-01", accessValidUntil: addDays(TODAY, 55), aiEnabled: false, membersCount: 4, createdAt: ts("2025-11-25"), admins: [[18, "2025-11-25"]] },
];

/* ---------- pagamentos e histórico ---------- */
let payments = [];
let events = [];
let nextPaymentId = 1;
let nextEventId = 1;
const METHODS = ["pix", "cartao", "boleto", "transferencia", "dinheiro", "outro"];

function addEvent(companyId, type, details, createdAt, user = owner) {
  events.push({ id: nextEventId++, companyId, type, details, createdAt, user: user ? { id: user.id, fullName: user.fullName } : null });
}

const methodCycle = { 1: ["pix", "pix", "cartao"], 2: ["boleto"], 3: ["pix"], 4: ["cartao", "pix"], 5: ["transferencia"], 7: ["pix", "boleto"], 8: ["dinheiro", "pix", "transferencia"] };
const stopAt = { 3: addDays(TODAY, -17 - 30), 5: addDays(TODAY, -50 - 30) };
const oneYearAgo = addMonths(TODAY, -12);

for (const c of companies) {
  addEvent(c.id, "created", null, c.createdAt);
  if (!c.subscriptionStartedAt) continue;
  addEvent(c.id, "plan_changed", { from: null, to: c.plan }, ts(c.subscriptionStartedAt, 9, 5));
  addEvent(c.id, "price_changed", { from: null, to: c.monthlyPrice }, ts(c.subscriptionStartedAt, 9, 6));
  let cur = c.subscriptionStartedAt;
  let validity = null;
  let i = 0;
  const end = stopAt[c.id] ?? addDays(c.accessValidUntil, -1);
  while (cur <= end && cur <= TODAY) {
    const months = c.id === 7 && i === 2 ? 3 : 1; // um pagamento trimestral
    const before = validity;
    const base = validity && validity > cur ? validity : cur;
    validity = addMonths(base, months);
    const methods = methodCycle[c.id] || ["pix"];
    if (cur >= oneYearAgo || c.id === 5 || c.id === 1) {
      const p = {
        id: nextPaymentId++, companyId: c.id, amount: c.monthlyPrice * months, paidAt: cur, referenceMonth: cur.slice(0, 7), monthsCovered: months,
        method: methods[i % methods.length], notes: months > 1 ? "Pagamento trimestral com desconto combinado" : i === 0 ? "Primeira mensalidade" : null,
        validUntilAfter: validity, createdAt: ts(cur, 11, 20), createdBy: { id: owner.id, fullName: owner.fullName },
      };
      if (months > 1) p.amount = Math.round(c.monthlyPrice * months * 0.95 * 100) / 100;
      payments.push(p);
      addEvent(c.id, "payment_added", { amount: p.amount, paidAt: p.paidAt, referenceMonth: p.referenceMonth, monthsCovered: months, method: p.method, validUntilBefore: before, validUntilAfter: validity }, p.createdAt);
    }
    cur = addMonths(cur, months);
    i++;
  }
  // a validade "oficial" é a definida na clínica: o último pagamento passa a apontar para ela
  const lastPay = payments.filter((p) => p.companyId === c.id).at(-1);
  const lastEv = events.filter((e) => e.companyId === c.id && e.type === "payment_added").at(-1);
  if (lastPay && c.accessValidUntil) {
    lastPay.validUntilAfter = c.accessValidUntil;
    lastEv.details.validUntilAfter = c.accessValidUntil;
  }
}
addEvent(1, "ai_toggled", { from: false, to: true }, ts("2026-03-02", 15));
addEvent(1, "plan_changed", { from: "intermediario", to: "expert" }, ts("2026-01-10", 10));
addEvent(8, "price_changed", { from: 99, to: 89 }, ts("2026-02-01", 14));
addEvent(5, "suspended", { from: "active", to: "suspended" }, ts(addDays(TODAY, -45), 16));
addEvent(4, "ai_toggled", { from: false, to: true }, ts("2026-07-01", 11));
addEvent(3, "renamed", { from: "Instituto Raízes", to: "Instituto Raízes de Psicologia" }, ts("2026-02-20", 9));

/* ---------- serialização ---------- */
function monthsSubscribed(c) {
  if (!c.subscriptionStartedAt) return null;
  return Math.max(0, Math.floor(daysBetween(c.subscriptionStartedAt, TODAY) / 30.44));
}
const isExpired = (c) => !!c.accessValidUntil && c.accessValidUntil < TODAY;
function serialize(c) {
  const ps = payments.filter((p) => p.companyId === c.id);
  const last = ps.map((p) => p.paidAt).sort().at(-1) ?? null;
  return {
    id: c.id, name: c.name, slug: c.slug, cnpj: c.cnpj, status: c.status, plan: c.plan, monthlyPrice: c.monthlyPrice,
    subscriptionStartedAt: c.subscriptionStartedAt, monthsSubscribed: monthsSubscribed(c), accessValidUntil: c.accessValidUntil,
    accessExpired: isExpired(c), aiEnabled: c.aiEnabled, totalPaid: Math.round(ps.reduce((s, p) => s + p.amount, 0) * 100) / 100,
    paymentsCount: ps.length, lastPaymentAt: last, membersCount: c.membersCount,
    lastAccessAt: membersOf(c)[0]?.lastSeenAt ?? null,
    lastAccessBy: membersOf(c)[0]?.lastSeenAt ? { id: membersOf(c)[0].id, fullName: membersOf(c)[0].fullName } : null,
    admins: c.admins.map(([id]) => { const p = person(id); return { id: p.id, fullName: p.fullName, email: p.email, lastLoginAt: p.lastLoginAt, lastSeenAt: p.lastSeenAt }; }),
  };
}
function serializePayment(p) {
  const { companyId, ...rest } = p;
  return rest;
}

function overview(from, to) {
  const active = companies.filter((c) => c.status === "active");
  const inRange = payments.filter((p) => (!from || p.paidAt >= from) && (!to || p.paidAt <= to));
  const months = [];
  for (let i = 11; i >= 0; i--) months.push(addMonths(TODAY.slice(0, 7) + "-01", -i).slice(0, 7));
  const upcoming = active
    .filter((c) => c.accessValidUntil && daysBetween(TODAY, c.accessValidUntil) <= 30)
    .sort((a, b) => (a.accessValidUntil < b.accessValidUntil ? -1 : 1))
    .map((c) => ({ id: c.id, name: c.name, accessValidUntil: c.accessValidUntil, accessExpired: isExpired(c), daysLeft: daysBetween(TODAY, c.accessValidUntil) }));
  const planCounts = new Map();
  for (const c of companies) planCounts.set(c.plan, (planCounts.get(c.plan) ?? 0) + 1);
  const sum = (list) => Math.round(list.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  return {
    companies: {
      total: companies.length,
      active: active.filter((c) => !isExpired(c)).length,
      expired: active.filter(isExpired).length,
      expiringSoon: active.filter((c) => c.accessValidUntil && !isExpired(c) && daysBetween(TODAY, c.accessValidUntil) <= 30).length,
      suspended: companies.filter((c) => c.status === "suspended").length,
    },
    revenue: {
      period: sum(inRange),
      total: sum(payments),
      mrr: active.filter((c) => !isExpired(c)).reduce((s, c) => s + (c.monthlyPrice ?? 0), 0),
    },
    revenueByMonth: months.map((m) => ({ month: m, amount: sum(payments.filter((p) => p.paidAt.startsWith(m))) })),
    plans: [...planCounts.entries()].map(([plan, count]) => ({ plan, count })),
    upcoming,
  };
}

/* ---------- http ---------- */
function send(res, status, body, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    Vary: "Origin",
  };
  if (origin && ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  if (status === 204) {
    delete headers["Content-Type"];
    res.writeHead(204, headers);
    return res.end();
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}
const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve(null); }
    });
  });
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const PLANS = ["solo", "intermediario", "expert"];

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const reply = (s, b) => send(res, s, b, origin);
  if (req.method === "OPTIONS") return reply(204);
  // pequena latência para ver estados de carregamento
  await new Promise((r) => setTimeout(r, 120));

  try {
    if (path === "/auth/google" && req.method === "GET") {
      const redirect = url.searchParams.get("mobile_redirect");
      if (!redirect) return reply(400, { message: "mobile_redirect ausente" });
      const token = randomUUID();
      sessions.set(token, owner);
      res.writeHead(302, { Location: `${redirect}${redirect.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` });
      return res.end();
    }

    if (path === "/api/mobile/login" && req.method === "POST") {
      const body = (await readBody(req)) || {};
      const login = String(body.username || "").trim().toLowerCase();
      const user = loginUsers.find((u) => u.email === login || u.username === login);
      if (!user || body.password !== "teste123") return reply(401, { message: "Usuário ou senha incorretos" });
      const token = randomUUID();
      sessions.set(token, user);
      return reply(200, { user, token });
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = token ? sessions.get(token) : null;

    if (path === "/api/logout" && req.method === "POST") {
      if (token) sessions.delete(token);
      return reply(200, {});
    }
    if (!user) return reply(401, { message: "Não autenticado" });
    if (path === "/api/user" && req.method === "GET") return reply(200, user);

    if (!path.startsWith("/api/platform/")) return reply(404, { message: "Não encontrado" });
    if (!user.isPlatformAdmin) return reply(403, { message: "Acesso restrito à administração da plataforma" });

    if (path === "/api/platform/overview" && req.method === "GET")
      return reply(200, overview(url.searchParams.get("from"), url.searchParams.get("to")));

    if (path === "/api/platform/subscribers" && req.method === "GET") return reply(200, companies.map(serialize));

    if (path === "/api/platform/payments" && req.method === "GET") {
      const from = url.searchParams.get("from"), to = url.searchParams.get("to");
      const list = payments
        .filter((p) => (!from || p.paidAt >= from) && (!to || p.paidAt <= to))
        .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))
        .map((p) => ({ ...serializePayment(p), company: { id: p.companyId, name: companies.find((c) => c.id === p.companyId).name } }));
      return reply(200, list);
    }

    if (path === "/api/platform/admins" && req.method === "GET") {
      return reply(200, people.map((p) => ({
        ...p,
        clinics: companies.filter((c) => c.admins.some(([id]) => id === p.id)).map((c) => ({
          id: c.id, name: c.name, status: c.status, since: c.admins.find(([id]) => id === p.id)[1], accessValidUntil: c.accessValidUntil, accessExpired: isExpired(c),
        })),
      })));
    }

    let m = path.match(/^\/api\/platform\/companies\/(\d+)(\/.*)?$/);
    if (m) {
      const c = companies.find((x) => x.id === Number(m[1]));
      if (!c) return reply(404, { message: "Clínica não encontrada" });
      const sub = m[2] || "";

      if (sub === "/subscription" && req.method === "GET") {
        return reply(200, {
          company: { ...serialize(c), createdAt: c.createdAt },
          admins: c.admins.map(([id, since]) => { const p = person(id); return { id: p.id, fullName: p.fullName, email: p.email, since, lastLoginAt: p.lastLoginAt, lastSeenAt: p.lastSeenAt }; }),
          members: membersOf(c),
          accessTrackingSince: ago(DAY * 100),
          payments: payments.filter((p) => p.companyId === c.id).sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1)).map(serializePayment),
          events: events.filter((e) => e.companyId === c.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map(({ companyId, ...e }) => e),
        });
      }

      if (sub === "" && req.method === "PATCH") {
        const b = await readBody(req);
        if (!b) return reply(400, { message: "JSON inválido" });
        const now = new Date().toISOString();
        if ("name" in b) {
          if (!String(b.name || "").trim()) return reply(400, { field: "name", message: "Informe o nome da clínica." });
          if (b.name !== c.name) { addEvent(c.id, "renamed", { from: c.name, to: b.name }, now, user); c.name = b.name; }
        }
        if ("cnpj" in b) c.cnpj = b.cnpj || null;
        if ("plan" in b) {
          if (b.plan !== null && !PLANS.includes(b.plan)) return reply(400, { field: "plan", message: "Plano inválido." });
          if (b.plan !== c.plan) { addEvent(c.id, "plan_changed", { from: c.plan, to: b.plan }, now, user); c.plan = b.plan; }
        }
        if ("monthlyPrice" in b) {
          if (b.monthlyPrice !== null && !(typeof b.monthlyPrice === "number" && b.monthlyPrice >= 0)) return reply(400, { field: "monthlyPrice", message: "Valor mensal inválido." });
          if (b.monthlyPrice !== c.monthlyPrice) { addEvent(c.id, "price_changed", { from: c.monthlyPrice, to: b.monthlyPrice }, now, user); c.monthlyPrice = b.monthlyPrice; }
        }
        if ("subscriptionStartedAt" in b) {
          if (b.subscriptionStartedAt !== null && !isDate(b.subscriptionStartedAt)) return reply(400, { field: "subscriptionStartedAt", message: "Data inválida." });
          if (b.subscriptionStartedAt !== c.subscriptionStartedAt) { addEvent(c.id, "start_changed", { from: c.subscriptionStartedAt, to: b.subscriptionStartedAt }, now, user); c.subscriptionStartedAt = b.subscriptionStartedAt; }
        }
        if ("accessValidUntil" in b) {
          if (b.accessValidUntil !== null && !isDate(b.accessValidUntil)) return reply(400, { field: "accessValidUntil", message: "Data inválida." });
          if (b.accessValidUntil !== c.accessValidUntil) { addEvent(c.id, "validity_changed", { from: c.accessValidUntil, to: b.accessValidUntil }, now, user); c.accessValidUntil = b.accessValidUntil; }
        }
        if ("aiEnabled" in b && b.aiEnabled !== c.aiEnabled) { addEvent(c.id, "ai_toggled", { from: c.aiEnabled, to: !!b.aiEnabled }, now, user); c.aiEnabled = !!b.aiEnabled; }
        if ("status" in b && b.status !== c.status) {
          if (!["active", "suspended"].includes(b.status)) return reply(400, { field: "status", message: "Situação inválida." });
          addEvent(c.id, b.status === "suspended" ? "suspended" : "reactivated", { from: c.status, to: b.status }, now, user);
          c.status = b.status;
        }
        return reply(200, { ...serialize(c), createdAt: c.createdAt });
      }

      if (sub === "/payments" && req.method === "POST") {
        const b = await readBody(req);
        if (!b) return reply(400, { message: "JSON inválido" });
        if (!(typeof b.amount === "number" && b.amount > 0)) return reply(400, { field: "amount", message: "Informe um valor maior que zero." });
        if (!isDate(b.paidAt)) return reply(400, { field: "paidAt", message: "Data do pagamento inválida." });
        if (!/^\d{4}-\d{2}$/.test(b.referenceMonth || "")) return reply(400, { field: "referenceMonth", message: "Mês de referência inválido." });
        const months = Number(b.monthsCovered);
        if (!Number.isInteger(months) || months < 1 || months > 36) return reply(400, { field: "monthsCovered", message: "Meses cobertos deve ficar entre 1 e 36." });
        if (!METHODS.includes(b.method)) return reply(400, { field: "method", message: "Forma de pagamento inválida." });
        const before = c.accessValidUntil;
        if (b.extendValidity) {
          const base = before && before > TODAY ? before : TODAY;
          c.accessValidUntil = addMonths(base, months);
        }
        const p = {
          id: nextPaymentId++, companyId: c.id, amount: b.amount, paidAt: b.paidAt, referenceMonth: b.referenceMonth, monthsCovered: months,
          method: b.method, notes: b.notes || null, validUntilAfter: c.accessValidUntil, createdAt: new Date().toISOString(),
          createdBy: { id: user.id, fullName: user.fullName },
        };
        payments.push(p);
        addEvent(c.id, "payment_added", { amount: p.amount, paidAt: p.paidAt, referenceMonth: p.referenceMonth, monthsCovered: months, method: p.method, validUntilBefore: before, validUntilAfter: c.accessValidUntil }, p.createdAt, user);
        return reply(201, { payment: serializePayment(p), accessValidUntil: c.accessValidUntil });
      }

      m = sub.match(/^\/payments\/(\d+)$/);
      if (m && req.method === "DELETE") {
        const p = payments.find((x) => x.id === Number(m[1]) && x.companyId === c.id);
        if (!p) return reply(404, { message: "Pagamento não encontrado" });
        payments = payments.filter((x) => x !== p);
        addEvent(c.id, "payment_removed", { amount: p.amount, paidAt: p.paidAt, referenceMonth: p.referenceMonth, monthsCovered: p.monthsCovered, method: p.method }, new Date().toISOString(), user);
        return reply(204);
      }
    }
    return reply(404, { message: "Não encontrado" });
  } catch (err) {
    console.error(err);
    return reply(500, { message: "Erro interno do mock" });
  }
});

server.listen(PORT, () => console.log(`Mock da API em http://localhost:${PORT} (hoje = ${TODAY})`));
