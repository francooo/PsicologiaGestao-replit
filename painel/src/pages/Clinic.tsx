import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Mail, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHead } from "../components/Layout";
import { Badge, ConfirmDialog, Dialog, Empty, ErrorBox, Kpi, Loading, PlanBadge, ValidityBadge, useToast } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useSubscription } from "../lib/queries";
import {
  currentMonthISO,
  date,
  dateTime,
  eventText,
  extendValidity,
  METHOD_LABEL,
  methodLabel,
  money,
  monthLong,
  monthsAgoLabel,
  PLAN_LABEL,
  PLAN_PRICE,
  plural,
  toISODate,
  todayISO,
} from "../lib/format";
import { moneyInput, parseMoney } from "../lib/money";
import type { Payment, PaymentMethod, Plan, Subscriber, SubscriptionDetail } from "../lib/types";

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["subscription", "subscribers", "overview", "payments", "admins"]) void qc.invalidateQueries({ queryKey: [k] });
  };
}

type FieldErrors = Record<string, string>;

/* ---------- Assinatura form ---------- */
function SubscriptionCard({ company }: { company: Subscriber }) {
  const toast = useToast();
  const invalidate = useInvalidateAll();
  const initial = useMemo(
    () => ({
      name: company.name,
      cnpj: company.cnpj ?? "",
      plan: (company.plan ?? "") as Plan | "",
      monthlyPrice: moneyInput(company.monthlyPrice),
      subscriptionStartedAt: toISODate(company.subscriptionStartedAt) ?? "",
      accessValidUntil: toISODate(company.accessValidUntil) ?? "",
      aiEnabled: company.aiEnabled,
    }),
    [company],
  );
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmStatus, setConfirmStatus] = useState(false);
  useEffect(() => setF(initial), [initial]);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/api/platform/companies/${company.id}`, { method: "PATCH", body }),
    onSuccess: () => invalidate(),
  });

  const changes = useMemo(() => {
    const body: Record<string, unknown> = {};
    if (f.name.trim() !== initial.name) body.name = f.name.trim();
    if (f.cnpj.trim() !== initial.cnpj) body.cnpj = f.cnpj.trim() || null;
    if (f.plan !== initial.plan) body.plan = f.plan || null;
    if (f.monthlyPrice !== initial.monthlyPrice) body.monthlyPrice = parseMoney(f.monthlyPrice);
    if (f.subscriptionStartedAt !== initial.subscriptionStartedAt) body.subscriptionStartedAt = f.subscriptionStartedAt || null;
    if (f.accessValidUntil !== initial.accessValidUntil) body.accessValidUntil = f.accessValidUntil || null;
    if (f.aiEnabled !== initial.aiEnabled) body.aiEnabled = f.aiEnabled;
    return body;
  }, [f, initial]);
  const dirty = Object.keys(changes).length > 0;

  function onPlan(p: Plan | "") {
    setF((s) => {
      const prevSuggested = s.plan ? moneyInput(PLAN_PRICE[s.plan]) : "";
      const keepPrice = s.monthlyPrice && s.monthlyPrice !== prevSuggested;
      // Suggest the plan's price unless the owner typed a custom one
      return { ...s, plan: p, monthlyPrice: p && !keepPrice ? moneyInput(PLAN_PRICE[p]) : s.monthlyPrice };
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!f.name.trim()) errs.name = "Informe o nome da clínica.";
    if (f.monthlyPrice.trim() && parseMoney(f.monthlyPrice) === null) errs.monthlyPrice = "Valor inválido. Use o formato 99,00.";
    setErrors(errs);
    if (Object.keys(errs).length || !dirty) return;
    try {
      await patch.mutateAsync(changes);
      toast("Assinatura salva");
    } catch (err) {
      const e2 = err as ApiError;
      setErrors(e2.field ? { [e2.field]: e2.message } : { form: e2.message });
    }
  }

  async function onToggleStatus() {
    const next = company.status === "suspended" ? "active" : "suspended";
    try {
      await patch.mutateAsync({ status: next });
      setConfirmStatus(false);
      toast(next === "suspended" ? "Clínica suspensa" : "Clínica reativada");
    } catch (err) {
      setErrors({ status: (err as Error).message });
    }
  }

  const priceHint = f.plan ? `Sugerido para ${PLAN_LABEL[f.plan]}: ${money(PLAN_PRICE[f.plan])}` : null;
  const suspended = company.status === "suspended";

  return (
    <section className="card">
      <div className="card__head">
        <h2 className="card__title">Assinatura</h2>
        <ValidityBadge status={company.status} accessValidUntil={company.accessValidUntil} accessExpired={company.accessExpired} />
      </div>
      <form onSubmit={onSave} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="f-name">Nome da clínica</label>
            <input id="f-name" className="input" value={f.name} aria-invalid={!!errors.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            {errors.name ? <div className="field-error">{errors.name}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-cnpj">CNPJ</label>
            <input id="f-cnpj" className="input" inputMode="numeric" placeholder="00.000.000/0000-00" value={f.cnpj} aria-invalid={!!errors.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} />
            {errors.cnpj ? <div className="field-error">{errors.cnpj}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-plan">Plano</label>
            <select id="f-plan" className="select" value={f.plan} aria-invalid={!!errors.plan} onChange={(e) => onPlan(e.target.value as Plan | "")}>
              <option value="">Sem plano</option>
              <option value="solo">Solo</option>
              <option value="intermediario">Intermediário</option>
              <option value="expert">Expert</option>
            </select>
            {errors.plan ? <div className="field-error">{errors.plan}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-price">Valor mensal</label>
            <div className="input-prefix">
              <span>R$</span>
              <input id="f-price" className="input" inputMode="decimal" placeholder="0,00" value={f.monthlyPrice} aria-invalid={!!errors.monthlyPrice} onChange={(e) => setF({ ...f, monthlyPrice: e.target.value })} />
            </div>
            {errors.monthlyPrice ? <div className="field-error">{errors.monthlyPrice}</div> : priceHint ? <div className="field-hint">{priceHint}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-start">Início da assinatura</label>
            <input id="f-start" type="date" className="input" value={f.subscriptionStartedAt} aria-invalid={!!errors.subscriptionStartedAt} onChange={(e) => setF({ ...f, subscriptionStartedAt: e.target.value })} />
            {errors.subscriptionStartedAt ? <div className="field-error">{errors.subscriptionStartedAt}</div> : <div className="field-hint">{f.subscriptionStartedAt ? monthsAgoLabel(f.subscriptionStartedAt) : "Sem data de início"}</div>}
          </div>
          <div className="field">
            <label htmlFor="f-valid">Validade do acesso</label>
            <input id="f-valid" type="date" className="input" value={f.accessValidUntil} aria-invalid={!!errors.accessValidUntil} onChange={(e) => setF({ ...f, accessValidUntil: e.target.value })} />
            {errors.accessValidUntil ? (
              <div className="field-error">{errors.accessValidUntil}</div>
            ) : (
              <div className="field-hint">
                {f.accessValidUntil ? (
                  <button type="button" className="th-sort" style={{ color: "var(--action)", fontSize: 13 }} onClick={() => setF({ ...f, accessValidUntil: "" })}>
                    Deixar sem validade
                  </button>
                ) : (
                  "Sem validade: o acesso não vence"
                )}
              </div>
            )}
          </div>
          <div className="span-2" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <label className="switch">
              <input type="checkbox" checked={f.aiEnabled} onChange={(e) => setF({ ...f, aiEnabled: e.target.checked })} />
              <span className="switch__track" aria-hidden="true" />
              Assistente com IA liberado para a clínica
            </label>
          </div>
        </div>
        {errors.form ? <div className="alert alert--danger" style={{ marginTop: 16 }}>{errors.form}</div> : null}
        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className={`btn ${suspended ? "btn--secondary" : "btn--danger-outline"}`} onClick={() => setConfirmStatus(true)}>
            {suspended ? "Reativar clínica" : "Suspender clínica"}
          </button>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {dirty ? (
              <button type="button" className="btn btn--ghost" onClick={() => { setF(initial); setErrors({}); }}>
                Descartar
              </button>
            ) : null}
            <button type="submit" className="btn btn--primary" disabled={!dirty || patch.isPending}>
              {patch.isPending ? <Loader2 className="spin" /> : null}
              Salvar alterações
            </button>
          </div>
        </div>
      </form>
      {confirmStatus ? (
        <ConfirmDialog
          title={suspended ? "Reativar clínica" : "Suspender clínica"}
          confirmLabel={suspended ? "Reativar" : "Suspender"}
          danger={!suspended}
          busy={patch.isPending}
          error={errors.status}
          onClose={() => setConfirmStatus(false)}
          onConfirm={onToggleStatus}
        >
          <p>
            {suspended
              ? `${company.name} volta a ter acesso ao sistema, respeitando a validade (${company.accessValidUntil ? date(company.accessValidUntil) : "sem validade"}).`
              : `Ninguém da ${company.name} consegue entrar no sistema enquanto ela estiver suspensa. Os dados ficam guardados e você pode reativar quando quiser.`}
          </p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

/* ---------- Registrar pagamento ---------- */
function PaymentDialog({ company, onClose }: { company: Subscriber; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateAll();
  const base = company.monthlyPrice ?? 0;
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(moneyInput(base || null));
  const [amountTouched, setAmountTouched] = useState(false);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [referenceMonth, setReferenceMonth] = useState(currentMonthISO());
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const [extend, setExtend] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  function onMonths(v: string) {
    const n = Math.max(1, Math.min(36, Math.floor(Number(v) || 1)));
    setMonths(n);
    if (!amountTouched && base) setAmount(moneyInput(base * n));
  }

  const current = toISODate(company.accessValidUntil);
  const next = extendValidity(current, months);

  const m = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ payment: Payment; accessValidUntil: string | null }>(`/api/platform/companies/${company.id}/payments`, { method: "POST", body }),
    onSuccess: () => invalidate(),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: FieldErrors = {};
    const value = parseMoney(amount);
    if (value === null || value <= 0) errs.amount = "Informe um valor maior que zero.";
    if (!paidAt) errs.paidAt = "Informe a data do pagamento.";
    if (!/^\d{4}-\d{2}$/.test(referenceMonth)) errs.referenceMonth = "Informe o mês de referência.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const res = await m.mutateAsync({
        amount: value,
        paidAt,
        referenceMonth,
        monthsCovered: months,
        method,
        notes: notes.trim() || undefined,
        extendValidity: extend,
      });
      toast(extend && res?.accessValidUntil ? `Pagamento registrado. Validade até ${date(res.accessValidUntil)}` : "Pagamento registrado");
      onClose();
    } catch (err) {
      const e2 = err as ApiError;
      setErrors(e2.field ? { [e2.field]: e2.message } : { form: e2.message });
    }
  }

  return (
    <Dialog
      title="Registrar pagamento"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={m.isPending}>
            Cancelar
          </button>
          <button type="submit" form="payment-form" className="btn btn--primary" disabled={m.isPending}>
            {m.isPending ? <Loader2 className="spin" /> : null}
            Registrar pagamento
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 14, marginTop: -8 }}>{company.name}</p>
      <form id="payment-form" onSubmit={onSubmit} noValidate className="form-grid">
        <div className="field">
          <label htmlFor="p-months">Meses cobertos</label>
          <input id="p-months" type="number" min={1} max={36} className="input" value={months} aria-invalid={!!errors.monthsCovered} onChange={(e) => onMonths(e.target.value)} />
          {errors.monthsCovered ? <div className="field-error">{errors.monthsCovered}</div> : null}
        </div>
        <div className="field">
          <label htmlFor="p-amount">Valor</label>
          <div className="input-prefix">
            <span>R$</span>
            <input id="p-amount" className="input" inputMode="decimal" value={amount} aria-invalid={!!errors.amount} onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }} />
          </div>
          {errors.amount ? (
            <div className="field-error">{errors.amount}</div>
          ) : base ? (
            <div className="field-hint">{months} × {money(base)}</div>
          ) : (
            <div className="field-hint">Clínica sem valor mensal definido</div>
          )}
        </div>
        <div className="field">
          <label htmlFor="p-paid">Data do pagamento</label>
          <input id="p-paid" type="date" className="input" value={paidAt} aria-invalid={!!errors.paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          {errors.paidAt ? <div className="field-error">{errors.paidAt}</div> : null}
        </div>
        <div className="field">
          <label htmlFor="p-ref">Mês de referência</label>
          <input id="p-ref" type="month" className="input" value={referenceMonth} aria-invalid={!!errors.referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} />
          {errors.referenceMonth ? <div className="field-error">{errors.referenceMonth}</div> : null}
        </div>
        <div className="field span-2">
          <label htmlFor="p-method">Forma de pagamento</label>
          <select id="p-method" className="select" value={method} aria-invalid={!!errors.method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((k) => (
              <option key={k} value={k}>{METHOD_LABEL[k]}</option>
            ))}
          </select>
          {errors.method ? <div className="field-error">{errors.method}</div> : null}
        </div>
        <div className="field span-2">
          <label htmlFor="p-notes">Observações</label>
          <textarea id="p-notes" className="textarea" rows={2} placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="span-2" style={{ display: "grid", gap: 10 }}>
          <label className="check">
            <input type="checkbox" checked={extend} onChange={(e) => setExtend(e.target.checked)} />
            <span>Estender a validade em {months === 1 ? "1 mês" : `${months} meses`}</span>
          </label>
          <div className={`preview${extend ? "" : " preview--muted"}`}>
            {extend
              ? `Validade passa de ${current ? date(current) : "sem validade"} para ${date(next)}`
              : `A validade continua ${current ? `em ${date(current)}` : "sem data"}`}
          </div>
        </div>
        {errors.form ? <div className="alert alert--danger span-2">{errors.form}</div> : null}
      </form>
    </Dialog>
  );
}

/* ---------- Pagamentos ---------- */
function PaymentsCard({ detail, onAdd }: { detail: SubscriptionDetail; onAdd: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateAll();
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const del = useMutation({
    mutationFn: (p: Payment) => api(`/api/platform/companies/${detail.company.id}/payments/${p.id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast("Pagamento removido");
    },
  });
  const payments = [...detail.payments].sort((a, b) => (a.paidAt < b.paidAt ? 1 : a.paidAt > b.paidAt ? -1 : b.id - a.id));
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <section className="card card--flush">
      <div className="card__head">
        <div>
          <h2 className="card__title">Pagamentos</h2>
          <div className="card__sub">{plural(payments.length, "pagamento registrado", "pagamentos registrados")}</div>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={onAdd}>
          <Plus />
          Registrar pagamento
        </button>
      </div>
      {payments.length ? (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table table--cards">
            <thead>
              <tr>
                <th>Data</th>
                <th>Referência</th>
                <th>Forma</th>
                <th className="num">Meses</th>
                <th className="num">Valor</th>
                <th>Validade após</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="cell-main">
                    <div className="row-title nowrap">{date(p.paidAt)}</div>
                    <div className="cell-sub show-sm">
                      {monthLong(p.referenceMonth)} · {methodLabel(p.method)} · {p.monthsCovered === 1 ? "1 mês" : `${p.monthsCovered} meses`}
                    </div>
                    {p.notes ? <div className="cell-sub">{p.notes}</div> : null}
                  </td>
                  <td className="nowrap hide-sm">{monthLong(p.referenceMonth)}</td>
                  <td className="hide-sm">{methodLabel(p.method)}</td>
                  <td className="num hide-sm">{p.monthsCovered}</td>
                  <td data-label="Valor" className="num">{money(p.amount)}</td>
                  <td data-label="Validade após" className="nowrap">{date(p.validUntilAfter)}</td>
                  <td className="cell-actions num">
                    <button className="btn btn--ghost btn--icon btn--sm" aria-label={`Remover pagamento de ${date(p.paidAt)}`} title="Remover pagamento" onClick={() => setToDelete(p)}>
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="cell-main">Total</td>
                <td className="hide-sm" />
                <td className="hide-sm" />
                <td className="hide-sm" />
                <td data-label="Total pago" className="num">{money(total)}</td>
                <td className="hide-sm" />
                <td className="hide-sm" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <Empty>Nenhum pagamento registrado.</Empty>
      )}
      {toDelete ? (
        <ConfirmDialog
          title="Remover pagamento"
          confirmLabel="Remover pagamento"
          danger
          busy={del.isPending}
          error={del.error ? (del.error as Error).message : null}
          onClose={() => setToDelete(null)}
          onConfirm={() => del.mutate(toDelete)}
        >
          <p>
            Remover o pagamento de <b>{money(toDelete.amount)}</b> feito em {date(toDelete.paidAt)} ({monthLong(toDelete.referenceMonth)})?
          </p>
          <div className="alert alert--warning">
            <span>A validade da clínica não muda ao remover. Se precisar, ajuste a data de validade no card Assinatura.</span>
          </div>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

/* ---------- Página ---------- */
export function ClinicPage({ id }: { id: number }) {
  const q = useSubscription(id);
  const [payOpen, setPayOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const d = q.data;

  async function downloadPdf() {
    if (!d) return;
    setPdfBusy(true);
    try {
      const { clinicReport } = await import("../pdf/reports");
      clinicReport(d).save();
    } finally {
      setPdfBusy(false);
    }
  }

  const back = (
    <Link href="/assinantes" className="back">
      <ArrowLeft size={16} aria-hidden="true" />
      Assinantes
    </Link>
  );

  if (q.isLoading) return <>{back}<Loading /></>;
  if (q.isError || !d)
    return (
      <>
        {back}
        <ErrorBox error={q.error ?? new Error("Clínica não encontrada.")} onRetry={() => q.refetch()} />
      </>
    );

  const c = d.company;
  const events = [...d.events].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <>
      <PageHead
        back={back}
        title={c.name}
        sub={
          <>
            <div className="head-badges">
              <ValidityBadge status={c.status} accessValidUntil={c.accessValidUntil} accessExpired={c.accessExpired} />
              <PlanBadge plan={c.plan} />
              {c.aiEnabled ? (
                <span className="badge badge--plan"><Sparkles size={13} aria-hidden="true" />IA liberada</span>
              ) : (
                <Badge tone="neutral" plain>IA desligada</Badge>
              )}
              <span className="small muted">
                {c.cnpj ? `CNPJ ${c.cnpj} · ` : ""}
                {plural(c.membersCount, "usuário", "usuários")} · cadastrada em {date(c.createdAt)}
              </span>
            </div>
          </>
        }
        actions={
          <>
            <button className="btn btn--secondary" onClick={downloadPdf} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="spin" /> : <Download />}
              Baixar PDF da clínica
            </button>
            <button className="btn btn--primary" onClick={() => setPayOpen(true)}>
              <Plus />
              Registrar pagamento
            </button>
          </>
        }
      />

      <div className="grid grid--kpi grid--kpi3">
        <Kpi label="Total pago" value={money(c.totalPaid)} note={c.lastPaymentAt ? `Último em ${date(c.lastPaymentAt)}` : "Nenhum pagamento"} />
        <Kpi label="Pagamentos" value={c.paymentsCount} note={c.monthlyPrice ? `${money(c.monthlyPrice)} por mês` : "Sem valor mensal"} />
        <Kpi
          label="Meses de assinatura"
          value={c.monthsSubscribed ?? "—"}
          note={c.subscriptionStartedAt ? `Desde ${date(c.subscriptionStartedAt)}, ${monthsAgoLabel(c.subscriptionStartedAt)}` : "Sem data de início"}
        />
      </div>

      <div className="grid grid--ficha section-gap">
        <div className="stack">
          <SubscriptionCard company={c} />
        </div>
        <div className="stack">
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Administradores</h2>
              <span className="card__sub">{d.admins.length}</span>
            </div>
            {d.admins.length ? (
              <div className="list">
                {d.admins.map((a) => (
                  <div className="list__item" key={a.id}>
                    <div>
                      <div className="list__title">{a.fullName}</div>
                      <a className="small" href={`mailto:${a.email}`} style={{ display: "inline-flex", gap: 6, alignItems: "center", wordBreak: "break-all" }}>
                        <Mail size={14} aria-hidden="true" style={{ flex: "none" }} />
                        {a.email}
                      </a>
                    </div>
                    <span className="small muted nowrap">desde {date(a.since)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Nenhum administrador nesta clínica.</Empty>
            )}
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Histórico</h2>
              <span className="card__sub">{plural(events.length, "registro", "registros")}</span>
            </div>
            {events.length ? (
              <ol className="timeline">
                {(showAll ? events : events.slice(0, 8)).map((ev) => (
                  <li key={ev.id} data-type={ev.type}>
                    <div className="t-text">{eventText(ev.type, ev.details as Record<string, any>)}</div>
                    <div className="t-meta">
                      {dateTime(ev.createdAt)}
                      {ev.user ? ` · ${ev.user.fullName}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {events.length > 8 ? (
              <button className="btn btn--secondary btn--sm" style={{ marginTop: 16 }} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Mostrar só os recentes" : `Mostrar histórico completo (${events.length})`}
              </button>
            ) : null}
            {events.length ? null : (
              <Empty>Nenhuma alteração registrada.</Empty>
            )}
          </section>
        </div>
      </div>

      <div className="section-gap">
        <PaymentsCard detail={d} onAdd={() => setPayOpen(true)} />
      </div>

      {payOpen ? <PaymentDialog company={c} onClose={() => setPayOpen(false)} /> : null}
    </>
  );
}
