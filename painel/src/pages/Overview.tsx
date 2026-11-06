import { useState } from "react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, Building2, CalendarClock, ChevronRight, Repeat, TrendingUp, Wallet } from "lucide-react";
import { PageHead } from "../components/Layout";
import { Empty, ErrorBox, Kpi, Loading, ValidityBadge } from "../components/ui";
import { PeriodFilter, periodFor, type Period } from "../components/Period";
import { useOverview } from "../lib/queries";
import { currentMonthISO, date, money, moneyShort, monthLong, monthShort, planLabel } from "../lib/format";
import type { Overview } from "../lib/types";

export function periodText(p: Period) {
  if (p.key === "month") return `Este mês (${date(p.from)} a ${date(p.to)})`;
  if (p.key === "30d") return `Últimos 30 dias (${date(p.from)} a ${date(p.to)})`;
  if (p.key === "year") return `Este ano (${date(p.from)} a ${date(p.to)})`;
  return `${date(p.from)} a ${date(p.to)}`;
}

function RevenueTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { month: string; amount: number };
  return (
    <div className="chart-tip">
      <span className="muted">{monthLong(row.month)}</span>
      <b>{money(row.amount)}</b>
    </div>
  );
}

function RevenueChart({ data }: { data: Overview["revenueByMonth"] }) {
  const cur = currentMonthISO();
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month), current: d.month === cur }));
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="rgba(45,58,46,0.08)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "rgba(45,58,46,0.18)" }} tick={{ fontSize: 12, fill: "#5c6b5e" }} interval="preserveStartEnd" minTickGap={4} />
          <YAxis tickFormatter={(v: number) => moneyShort(v)} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5c6b5e" }} width={72} />
          <Tooltip content={<RevenueTip />} cursor={{ fill: "rgba(107,143,113,0.10)" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#6b8f71" isAnimationActive={false}
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              if (!height || height <= 0) return <g />;
              const r = Math.min(4, width / 2, height);
              const fill = payload.current ? "#3a5c40" : "#6b8f71";
              return <path d={`M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`} fill={fill} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlanBars({ plans }: { plans: Overview["plans"] }) {
  const order = ["solo", "intermediario", "expert", null] as const;
  const rows = order.map((p) => ({ plan: p, count: plans.find((x) => x.plan === p)?.count ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="planbars">
      {rows.map((r) => (
        <div key={String(r.plan)}>
          <div className="planbar__row">
            <span>{planLabel(r.plan)}</span>
            <span>
              {r.count}
              <span className="muted" style={{ fontWeight: 400 }}> · {total ? Math.round((r.count / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="planbar__track" role="img" aria-label={`${planLabel(r.plan)}: ${r.count} clínicas`}>
            <div className={`planbar__fill${r.plan ? "" : " planbar__fill--none"}`} style={{ width: `${(r.count / max) * 100}%`, opacity: r.count ? 1 : 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverviewPage() {
  const [period, setPeriod] = useState<Period>(() => periodFor("month"));
  const q = useOverview(period.from, period.to);
  const d = q.data;

  return (
    <>
      <PageHead title="Visão geral" sub="Assinaturas e receita das clínicas no ConsultaPsi" />
      <div style={{ marginBottom: 20 }}>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {q.isError ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
      {!d && q.isLoading ? <Loading /> : null}

      {d ? (
        <>
          <div className="grid grid--kpi">
            <Kpi icon={<Building2 />} label="Clínicas ativas" value={d.companies.active} note={`de ${d.companies.total} cadastradas`} />
            <Kpi icon={<Wallet />} label="Receita no período" value={money(d.revenue.period)} note={periodText(period)} />
            <Kpi icon={<TrendingUp />} label="Receita total" value={money(d.revenue.total)} note="Desde o primeiro pagamento" />
            <Kpi icon={<Repeat />} label="Receita mensal recorrente" value={money(d.revenue.mrr)} note="Soma dos valores mensais das clínicas ativas" />
            <Kpi icon={<CalendarClock />} label="Vencem em 30 dias" value={d.companies.expiringSoon} tone={d.companies.expiringSoon ? "warning" : undefined} note="Clínicas com validade próxima" />
            <Kpi
              icon={<AlertOctagon />}
              label="Vencidas"
              value={d.companies.expired}
              tone={d.companies.expired ? "danger" : undefined}
              note={`${d.companies.suspended} ${d.companies.suspended === 1 ? "suspensa" : "suspensas"}`}
            />
          </div>

          <div className="grid grid--charts section-gap">
            <section className="card">
              <div className="card__head">
                <div>
                  <h2 className="card__title">Receita dos últimos 12 meses</h2>
                  <div className="card__sub">Pagamentos registrados por mês, em reais</div>
                </div>
              </div>
              {d.revenueByMonth.length ? <RevenueChart data={d.revenueByMonth} /> : <Empty>Nenhum pagamento nos últimos 12 meses.</Empty>}
            </section>
            <section className="card">
              <div className="card__head">
                <div>
                  <h2 className="card__title">Clínicas por plano</h2>
                  <div className="card__sub">{d.companies.total} clínicas cadastradas</div>
                </div>
              </div>
              <PlanBars plans={d.plans} />
            </section>
          </div>

          <section className="card section-gap">
            <div className="card__head">
              <div>
                <h2 className="card__title">Próximos vencimentos</h2>
                <div className="card__sub">Clínicas vencidas ou com validade nos próximos dias</div>
              </div>
              <Link href="/relatorios" className="btn btn--secondary btn--sm">Ver relatório de vencimentos</Link>
            </div>
            {d.upcoming.length ? (
              <div className="list">
                {d.upcoming.map((u) => (
                  <Link key={u.id} href={`/clinicas/${u.id}`} className="list__item">
                    <div>
                      <div className="list__title">{u.name}</div>
                      <div className="cell-sub">Validade {date(u.accessValidUntil)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ValidityBadge accessValidUntil={u.accessValidUntil} accessExpired={u.accessExpired} />
                      <ChevronRight size={18} color="#5c6b5e" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>Nenhuma clínica vence nos próximos 30 dias.</Empty>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
