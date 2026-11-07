import { jsPDF } from "jspdf";
import autoTable, { type CellDef, type RowInput, type UserOptions } from "jspdf-autotable";
import {
  accessTime,
  activity,
  date,
  dateTime,
  daysBetween,
  eventText,
  methodLabel,
  money,
  monthLong,
  monthsAgoLabel,
  planLabel,
  roleLabel,
  todayISO,
  validity,
} from "../lib/format";
import type { Overview, PaymentWithCompany, Subscriber, SubscriptionDetail } from "../lib/types";

/* ---------- brand ---------- */
type RGB = [number, number, number];
const SAGE: RGB = [107, 143, 113];
const SAGE_PALE: RGB = [232, 240, 233];
const LEAF_DARK: RGB = [58, 92, 64];
const CREAM: RGB = [250, 247, 242];
const INK: RGB = [45, 58, 46];
const MUTED: RGB = [92, 107, 94];
const NAVY: RGB = [31, 51, 71];
const BLUE: RGB = [46, 114, 155];
const LINE: RGB = [221, 222, 215];

const M = 16; // page margin in mm

export interface PdfReport {
  doc: jsPDF;
  fileName: string;
  save: () => void;
}

/** Standard Helvetica is WinAnsi: keep pt-BR accents, swap the few glyphs it lacks. */
function t(s: string): string {
  return s.replace(/→/g, "para").replace(/[  ]/g, " ");
}

function emittedAt(): string {
  return dateTime(new Date().toISOString()).replace(",", " às");
}

function drawLogo(doc: jsPDF, x: number, y: number, size: number) {
  const k = size / 48;
  // the two leaves of the ConsultaPsi mark, from its SVG paths
  doc.setFillColor(159, 174, 150);
  doc.lines([[-7 * k, -11 * k, 1 * k, -27 * k, 21 * k, -32 * k], [4 * k, 17 * k, -4 * k, 31 * k, -21 * k, 32 * k]], x + 23 * k, y + 33 * k, [1, 1], "F", true);
  doc.setFillColor(169, 155, 187);
  doc.lines([[-10 * k, -11 * k, -6 * k, -28 * k, 11 * k, -34 * k], [8 * k, 16 * k, 3 * k, 30 * k, -11 * k, 34 * k]], x + 11 * k, y + 47 * k, [1, 1], "F", true);
}

function header(doc: jsPDF, title: string, sub: string[]): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...SAGE);
  doc.rect(0, 0, w, 3, "F");
  drawLogo(doc, M, 9, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Consulta", M + 12.5, 16.2);
  const cw = doc.getTextWidth("Consulta");
  doc.setTextColor(...BLUE);
  doc.text("Psi", M + 12.5 + cw, 16.2);
  const pw = doc.getTextWidth("Psi");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SAGE);
  doc.text(t(" · Painel"), M + 12.5 + cw + pw, 16.2);

  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(t(`Emitido em ${emittedAt()} (horário de Brasília)`), w - M, 16.2, { align: "right" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, 22, w - M, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(t(title), M, 33);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  let y = 39.5;
  for (const line of sub) {
    doc.text(t(line), M, y);
    y += 5.2;
  }
  return y + 6;
}

function footer(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, h - 13, w - M, h - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(t("Relatório gerado pelo Painel ConsultaPsi"), M, h - 8);
    doc.text(t(`Página ${i} de ${n}`), w - M, h - 8, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  const h = doc.internal.pageSize.getHeight();
  if (y > h - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...LEAF_DARK);
  doc.text(t(text), M, y);
  return y + 3;
}

function lastY(doc: jsPDF): number {
  return ((doc as any).lastAutoTable?.finalY ?? 40) as number;
}

function table(doc: jsPDF, startY: number, opts: Partial<UserOptions>): number {
  const sanitize = (rows?: RowInput[]) =>
    rows?.map((r) =>
      Array.isArray(r)
        ? r.map((c) => (typeof c === "string" ? t(c) : c && typeof c === "object" && "content" in c ? { ...(c as CellDef), content: t(String((c as CellDef).content ?? "")) } : c))
        : r,
    );
  autoTable(doc, {
    startY,
    margin: { left: M, right: M, top: 18, bottom: 20 },
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 }, textColor: INK, lineColor: LINE, overflow: "linebreak" },
    headStyles: { fillColor: SAGE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.8 },
    footStyles: { fillColor: SAGE_PALE, textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: CREAM },
    bodyStyles: { lineWidth: { bottom: 0.15 } as any },
    ...opts,
    head: sanitize(opts.head),
    body: sanitize(opts.body),
    foot: sanitize(opts.foot),
  });
  return lastY(doc) + 9;
}

function makeReport(doc: jsPDF, fileName: string): PdfReport {
  footer(doc);
  return { doc, fileName, save: () => doc.save(fileName) };
}

const R = { halign: "right" as const };
const range = (from: string, to: string) => `${from}-a-${to}`;
function newDoc() {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({ title: "Relatório ConsultaPsi", creator: "Painel ConsultaPsi" });
  return doc;
}
function statusText(s: { status?: Subscriber["status"]; accessValidUntil: string | null; accessExpired?: boolean }) {
  return validity(s).label;
}

/* ---------- 1. Resumo geral ---------- */
export function summaryReport(o: Overview, subscribers: Subscriber[], from: string, to: string): PdfReport {
  const doc = newDoc();
  let y = header(doc, "Resumo geral", [`Período: ${date(from)} a ${date(to)}`, `${subscribers.length} clínicas cadastradas`]);

  y = sectionTitle(doc, "Indicadores", y);
  y = table(doc, y, {
    head: [["Indicador", { content: "Valor", styles: R }]],
    body: [
      ["Clínicas ativas", { content: String(o.companies.active), styles: R }],
      ["Clínicas cadastradas", { content: String(o.companies.total), styles: R }],
      ["Vencem em 30 dias", { content: String(o.companies.expiringSoon), styles: R }],
      ["Vencidas", { content: String(o.companies.expired), styles: R }],
      ["Suspensas", { content: String(o.companies.suspended), styles: R }],
      ["Receita no período", { content: money(o.revenue.period), styles: R }],
      ["Receita total", { content: money(o.revenue.total), styles: R }],
      ["Receita mensal recorrente (MRR)", { content: money(o.revenue.mrr), styles: R }],
      ["Clínicas sem acesso há mais de 30 dias", { content: String(subscribers.filter((s) => s.status === "active" && activity(s.lastAccessAt).key === "inactive").length), styles: R }],
    ],
    columnStyles: { 0: { cellWidth: 110 } },
  });

  y = sectionTitle(doc, "Receita dos últimos 12 meses", y);
  const total12 = o.revenueByMonth.reduce((s, r) => s + r.amount, 0);
  y = table(doc, y, {
    head: [["Mês", { content: "Receita", styles: R }]],
    body: o.revenueByMonth.map((r) => [monthLong(r.month), { content: money(r.amount), styles: R }]),
    foot: [["Total em 12 meses", { content: money(total12), styles: R }]],
    columnStyles: { 0: { cellWidth: 110 } },
  });

  y = sectionTitle(doc, "Clínicas por plano", y);
  const order = ["solo", "intermediario", "expert", null] as const;
  y = table(doc, y, {
    head: [["Plano", { content: "Clínicas", styles: R }]],
    body: order.map((p) => [planLabel(p), { content: String(o.plans.find((x) => x.plan === p)?.count ?? 0), styles: R }]),
    foot: [["Total", { content: String(o.plans.reduce((s, p) => s + p.count, 0)), styles: R }]],
    columnStyles: { 0: { cellWidth: 110 } },
  });

  y = sectionTitle(doc, "Assinantes", y);
  const sorted = [...subscribers].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  table(doc, y, {
    head: [["Clínica", "Plano", { content: "Valor/mês", styles: R }, "Validade", "Situação", { content: "Total pago", styles: R }]],
    body: sorted.map((s) => [
      s.name,
      planLabel(s.plan),
      { content: money(s.monthlyPrice), styles: R },
      date(s.accessValidUntil),
      statusText(s),
      { content: money(s.totalPaid), styles: R },
    ]),
    foot: [["Total", "", { content: money(sorted.filter((s) => s.status === "active").reduce((a, s) => a + (s.monthlyPrice ?? 0), 0)), styles: R }, "", "", { content: money(sorted.reduce((a, s) => a + s.totalPaid, 0)), styles: R }]],
    columnStyles: { 0: { cellWidth: 52 } },
  });

  return makeReport(doc, `consultapsi-resumo-${range(from, to)}.pdf`);
}

/* ---------- 2. Por clínica ---------- */
export function clinicReport(d: SubscriptionDetail): PdfReport {
  const doc = newDoc();
  const c = d.company;
  const today = todayISO();
  let y = header(doc, c.name, [
    `${c.cnpj ? `CNPJ ${c.cnpj} · ` : ""}Situação: ${statusText(c)}`,
    `Posição em ${date(today)}`,
  ]);

  y = sectionTitle(doc, "Assinatura", y);
  y = table(doc, y, {
    body: [
      ["Plano", planLabel(c.plan)],
      ["Valor mensal", money(c.monthlyPrice)],
      ["Início da assinatura", c.subscriptionStartedAt ? `${date(c.subscriptionStartedAt)} (${monthsAgoLabel(c.subscriptionStartedAt)})` : "—"],
      ["Meses de assinatura", c.monthsSubscribed != null ? String(c.monthsSubscribed) : "—"],
      ["Validade do acesso", c.accessValidUntil ? date(c.accessValidUntil) : "Sem validade"],
      ["Situação", statusText(c)],
      ["Assistente com IA", c.aiEnabled ? "Liberado" : "Desligado"],
      ["Usuários na clínica", String(c.membersCount)],
      ["Último acesso ao sistema", c.lastAccessAt ? `${accessTime(c.lastAccessAt)}${c.lastAccessBy ? ` (${c.lastAccessBy.fullName})` : ""}` : "Sem registro"],
      ["Total pago", money(c.totalPaid)],
      ["Pagamentos registrados", String(c.paymentsCount)],
      ["Último pagamento", date(c.lastPaymentAt)],
      ["Cadastrada em", date(c.createdAt)],
    ],
    columnStyles: { 0: { cellWidth: 60, textColor: MUTED }, 1: { fontStyle: "bold" } },
  });

  y = sectionTitle(doc, "Usuários e último acesso", y);
  const members = d.members ?? [];
  y = table(doc, y, {
    head: [["Nome", "E-mail", "Papel", "Último login", "Último uso", "Situação"]],
    body: members.length
      ? members.map((m) => [m.fullName, m.email, roleLabel(m.role), accessTime(m.lastLoginAt), accessTime(m.lastSeenAt), activity(m.lastSeenAt).label])
      : [[{ content: "Nenhum usuário ativo", colSpan: 6, styles: { textColor: MUTED } }]],
    columnStyles: { 1: { cellWidth: 46 } },
  });

  y = sectionTitle(doc, "Pagamentos", y);
  const pays = [...d.payments].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
  y = table(doc, y, {
    head: [["Data", "Referência", "Forma", { content: "Meses", styles: R }, { content: "Valor", styles: R }, "Validade após", "Observações"]],
    body: pays.length
      ? pays.map((p) => [date(p.paidAt), monthLong(p.referenceMonth), methodLabel(p.method), { content: String(p.monthsCovered), styles: R }, { content: money(p.amount), styles: R }, date(p.validUntilAfter), p.notes ?? ""])
      : [[{ content: "Nenhum pagamento registrado", colSpan: 7, styles: { textColor: MUTED } }]],
    foot: pays.length ? [["Total", "", "", { content: String(pays.reduce((s, p) => s + p.monthsCovered, 0)), styles: R }, { content: money(pays.reduce((s, p) => s + p.amount, 0)), styles: R }, "", ""]] : undefined,
  });

  y = sectionTitle(doc, "Histórico", y);
  const events = [...d.events].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  table(doc, y, {
    head: [["Data", "Alteração", "Por"]],
    body: events.length
      ? events.map((e) => [dateTime(e.createdAt), eventText(e.type, e.details as Record<string, any>), e.user?.fullName ?? "—"])
      : [[{ content: "Nenhuma alteração registrada", colSpan: 3, styles: { textColor: MUTED } }]],
    columnStyles: { 0: { cellWidth: 34 }, 2: { cellWidth: 36 } },
  });

  return makeReport(doc, `consultapsi-clinica-${c.slug || c.id}-${today}.pdf`);
}

/* ---------- 3. Vencimentos ---------- */
export function expirationsReport(subscribers: Subscriber[], from: string, to: string): PdfReport {
  const doc = newDoc();
  const today = todayISO();
  const active = subscribers.filter((s) => s.status === "active" && s.accessValidUntil);
  const expired = active
    .filter((s) => s.accessExpired || s.accessValidUntil! < today)
    .sort((a, b) => (a.accessValidUntil! < b.accessValidUntil! ? -1 : 1));
  const upcoming = active
    .filter((s) => !(s.accessExpired || s.accessValidUntil! < today) && s.accessValidUntil! >= from && s.accessValidUntil! <= to)
    .sort((a, b) => (a.accessValidUntil! < b.accessValidUntil! ? -1 : 1));

  let y = header(doc, "Vencimentos", [
    `Vencem entre ${date(from)} e ${date(to)}: ${upcoming.length} · Já vencidas: ${expired.length}`,
    "Clínicas suspensas e sem validade ficam fora deste relatório",
  ]);

  const contacts = (s: Subscriber) => (s.admins.length ? s.admins.map((a) => `${a.fullName}\n${a.email}`).join("\n") : "Sem administrador");
  const rows = (list: Subscriber[], kind: "expired" | "upcoming"): RowInput[] =>
    list.map((s) => {
      const days = daysBetween(today, s.accessValidUntil!);
      const when = kind === "expired" ? (days === -1 ? "há 1 dia" : `há ${-days} dias`) : days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
      return [s.name, date(s.accessValidUntil), when, planLabel(s.plan), { content: money(s.monthlyPrice), styles: R }, contacts(s)];
    });
  const head: RowInput[] = [["Clínica", "Validade", "Quando", "Plano", { content: "Valor/mês", styles: R }, "Administradores"]];
  const colStyles = { 0: { cellWidth: 36 }, 1: { cellWidth: 21 }, 2: { cellWidth: 19 }, 3: { cellWidth: 21 }, 4: { cellWidth: 21 }, 5: { fontSize: 8.5 } };

  y = sectionTitle(doc, `Vencem entre ${date(from)} e ${date(to)}`, y);
  y = table(doc, y, {
    head,
    body: upcoming.length ? rows(upcoming, "upcoming") : [[{ content: "Nenhuma clínica vence neste período", colSpan: 6, styles: { textColor: MUTED } }]],
    foot: upcoming.length ? [[`${upcoming.length} ${upcoming.length === 1 ? "clínica" : "clínicas"}`, "", "", "", { content: money(upcoming.reduce((a, s) => a + (s.monthlyPrice ?? 0), 0)), styles: R }, ""]] : undefined,
    columnStyles: colStyles,
  });

  y = sectionTitle(doc, "Já vencidas", y);
  table(doc, y, {
    head,
    body: expired.length ? rows(expired, "expired") : [[{ content: "Nenhuma clínica vencida", colSpan: 6, styles: { textColor: MUTED } }]],
    foot: expired.length ? [[`${expired.length} ${expired.length === 1 ? "clínica" : "clínicas"}`, "", "", "", { content: money(expired.reduce((a, s) => a + (s.monthlyPrice ?? 0), 0)), styles: R }, ""]] : undefined,
    columnStyles: colStyles,
  });

  return makeReport(doc, `consultapsi-vencimentos-${range(from, to)}.pdf`);
}

/* ---------- 4. Pagamentos do período ---------- */
export function paymentsReport(payments: PaymentWithCompany[], from: string, to: string): PdfReport {
  const doc = newDoc();
  const grand = payments.reduce((s, p) => s + p.amount, 0);
  let y = header(doc, "Pagamentos do período", [
    `Período: ${date(from)} a ${date(to)}`,
    `${payments.length} ${payments.length === 1 ? "pagamento" : "pagamentos"} · ${money(grand)}`,
  ]);

  const groups = new Map<number, { name: string; list: PaymentWithCompany[] }>();
  for (const p of payments) {
    const g = groups.get(p.company.id) ?? { name: p.company.name, list: [] };
    g.list.push(p);
    groups.set(p.company.id, g);
  }
  const ordered = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  y = sectionTitle(doc, "Pagamentos por clínica", y);
  const body: RowInput[] = [];
  for (const g of ordered) {
    const sub = g.list.reduce((s, p) => s + p.amount, 0);
    body.push([{ content: g.name, colSpan: 6, styles: { fontStyle: "bold", fillColor: SAGE_PALE, textColor: LEAF_DARK } }]);
    for (const p of [...g.list].sort((a, b) => (a.paidAt < b.paidAt ? -1 : 1))) {
      body.push([date(p.paidAt), monthLong(p.referenceMonth), methodLabel(p.method), { content: String(p.monthsCovered), styles: R }, { content: money(p.amount), styles: R }, p.notes ?? ""]);
    }
    body.push([{ content: `Subtotal ${g.name}`, colSpan: 4, styles: { fontStyle: "bold", halign: "right", textColor: MUTED } }, { content: money(sub), styles: { ...R, fontStyle: "bold" } }, ""]);
  }
  y = table(doc, y, {
    head: [["Data", "Referência", "Forma", { content: "Meses", styles: R }, { content: "Valor", styles: R }, "Observações"]],
    body: body.length ? body : [[{ content: "Nenhum pagamento no período", colSpan: 6, styles: { textColor: MUTED } }]],
    foot: [[{ content: "Total geral", colSpan: 4 }, { content: money(grand), styles: R }, ""]],
    alternateRowStyles: {},
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 34 }, 2: { cellWidth: 28 }, 3: { cellWidth: 16 }, 4: { cellWidth: 28 } },
  });

  y = sectionTitle(doc, "Totais por forma de pagamento", y);
  const byMethod = new Map<string, { n: number; v: number }>();
  for (const p of payments) {
    const m = byMethod.get(p.method) ?? { n: 0, v: 0 };
    m.n++;
    m.v += p.amount;
    byMethod.set(p.method, m);
  }
  table(doc, y, {
    head: [["Forma", { content: "Pagamentos", styles: R }, { content: "Valor", styles: R }, { content: "Participação", styles: R }]],
    body: [...byMethod.entries()]
      .sort((a, b) => b[1].v - a[1].v)
      .map(([k, m]) => [methodLabel(k), { content: String(m.n), styles: R }, { content: money(m.v), styles: R }, { content: grand ? `${((m.v / grand) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—", styles: R }]),
    foot: [["Total geral", { content: String(payments.length), styles: R }, { content: money(grand), styles: R }, { content: grand ? "100%" : "—", styles: R }]],
    columnStyles: { 0: { cellWidth: 70 } },
  });

  return makeReport(doc, `consultapsi-pagamentos-${range(from, to)}.pdf`);
}
