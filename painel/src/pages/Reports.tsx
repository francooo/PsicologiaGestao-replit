import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, Download, LayoutDashboard, Loader2, Wallet } from "lucide-react";
import { PageHead } from "../components/Layout";
import { DateRange, PeriodFilter, periodFor, type Period } from "../components/Period";
import { api, qs } from "../lib/api";
import { keys, useSubscribers } from "../lib/queries";
import { addDays, todayISO } from "../lib/format";
import type { Overview, PaymentWithCompany, Subscriber, SubscriptionDetail } from "../lib/types";
import type { PdfReport } from "../pdf/reports";
import { useToast } from "../components/ui";

function ReportCard({
  icon,
  title,
  desc,
  children,
  onGenerate,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
  onGenerate: () => Promise<PdfReport>;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await onGenerate();
      r.save();
      toast(`PDF gerado: ${r.fileName}`);
    } catch (e) {
      setError((e as Error).message || "Não foi possível gerar o PDF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card report-card">
      <div>
        <h2 className="card__title">
          {icon}
          {title}
        </h2>
        <p className="desc" style={{ marginTop: 8 }}>{desc}</p>
      </div>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
      {error ? <div className="field-error">{error}</div> : null}
      <div className="actions">
        <button className="btn btn--primary" onClick={run} disabled={busy || disabled}>
          {busy ? <Loader2 className="spin" /> : <Download />}
          Gerar PDF
        </button>
      </div>
    </section>
  );
}

export function ReportsPage() {
  const qc = useQueryClient();
  const subs = useSubscribers();
  const [summaryPeriod, setSummaryPeriod] = useState<Period>(() => periodFor("month"));
  const [clinicId, setClinicId] = useState<string>("");
  const [expFrom, setExpFrom] = useState(todayISO());
  const [expTo, setExpTo] = useState(addDays(todayISO(), 30));
  const month = periodFor("month");
  const [payFrom, setPayFrom] = useState(month.from);
  const [payTo, setPayTo] = useState(month.to);

  const fetchSubs = () => qc.fetchQuery({ queryKey: keys.subscribers, queryFn: () => api<Subscriber[]>("/api/platform/subscribers"), staleTime: 0 });
  const pdf = () => import("../pdf/reports");

  const clinics = [...(subs.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <PageHead title="Relatórios" sub="Relatórios em PDF, no formato A4, para guardar ou enviar" />
      <div className="grid grid--2">
        <ReportCard
          icon={<LayoutDashboard />}
          title="Resumo geral"
          desc="Indicadores, receita dos últimos 12 meses, clínicas por plano e a lista de assinantes."
          onGenerate={async () => {
            const { from, to } = summaryPeriod;
            const [o, s, m] = await Promise.all([
              qc.fetchQuery({ queryKey: keys.overview(from, to), queryFn: () => api<Overview>(`/api/platform/overview${qs({ from, to })}`), staleTime: 0 }),
              fetchSubs(),
              pdf(),
            ]);
            return m.summaryReport(o, s, from, to);
          }}
        >
          <span className="label">Período da receita</span>
          <PeriodFilter value={summaryPeriod} onChange={setSummaryPeriod} />
        </ReportCard>

        <ReportCard
          icon={<Building2 />}
          title="Por clínica"
          desc="Ficha completa de uma clínica: assinatura, administradores, pagamentos e histórico."
          disabled={!clinicId}
          onGenerate={async () => {
            const id = Number(clinicId);
            const [d, m] = await Promise.all([
              qc.fetchQuery({ queryKey: keys.subscription(id), queryFn: () => api<SubscriptionDetail>(`/api/platform/companies/${id}/subscription`), staleTime: 0 }),
              pdf(),
            ]);
            return m.clinicReport(d);
          }}
        >
          <div className="field">
            <label htmlFor="r-clinic">Clínica</label>
            <select id="r-clinic" className="select" value={clinicId} onChange={(e) => setClinicId(e.target.value)} disabled={subs.isLoading}>
              <option value="">{subs.isLoading ? "Carregando clínicas…" : "Escolha uma clínica"}</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </ReportCard>

        <ReportCard
          icon={<CalendarClock />}
          title="Vencimentos"
          desc="Clínicas que vencem no intervalo e as já vencidas, com o nome e o e-mail dos administradores."
          onGenerate={async () => {
            const [s, m] = await Promise.all([fetchSubs(), pdf()]);
            return m.expirationsReport(s, expFrom, expTo);
          }}
        >
          <span className="label">Vencem entre</span>
          <DateRange from={expFrom} to={expTo} onChange={(f, t) => { setExpFrom(f); setExpTo(t); }} />
        </ReportCard>

        <ReportCard
          icon={<Wallet />}
          title="Pagamentos do período"
          desc="Pagamentos agrupados por clínica, com subtotais, totais por forma de pagamento e o total geral."
          onGenerate={async () => {
            const [p, m] = await Promise.all([
              qc.fetchQuery({ queryKey: keys.payments(payFrom, payTo), queryFn: () => api<PaymentWithCompany[]>(`/api/platform/payments${qs({ from: payFrom, to: payTo })}`), staleTime: 0 }),
              pdf(),
            ]);
            return m.paymentsReport(p, payFrom, payTo);
          }}
        >
          <span className="label">Pagos entre</span>
          <DateRange from={payFrom} to={payTo} onChange={(f, t) => { setPayFrom(f); setPayTo(t); }} />
        </ReportCard>
      </div>
    </>
  );
}
