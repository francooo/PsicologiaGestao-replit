import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { PageHead } from "../components/Layout";
import { ActivityBadge, Empty, ErrorBox, Loading, PlanBadge, ValidityBadge } from "../components/ui";
import { useSubscribers } from "../lib/queries";
import { accessAgo, accessTime, activity, date, money, monthsAgoLabel, validity, type ActivityKey } from "../lib/format";
import type { Plan, Subscriber } from "../lib/types";

type StatusFilter = "all" | "active" | "expiring" | "expired" | "suspended";
type SortKey = "name" | "validity" | "total" | "access";

const STATUS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "expiring", label: "Vencendo" },
  { key: "expired", label: "Vencidas" },
  { key: "suspended", label: "Suspensas" },
];

function matchesStatus(s: Subscriber, f: StatusFilter) {
  if (f === "all") return true;
  const v = validity(s);
  if (f === "active") return v.key === "active" || v.key === "expiring" || v.key === "none";
  return v.key === f;
}

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function SubscribersPage() {
  const q = useSubscribers();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [plan, setPlan] = useState<"all" | Plan | "none">("all");
  const [usage, setUsage] = useState<"all" | ActivityKey>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const rows = useMemo(() => {
    const term = norm(search.trim());
    const list = (q.data ?? []).filter((s) => {
      if (!matchesStatus(s, status)) return false;
      if (plan !== "all" && (plan === "none" ? s.plan !== null : s.plan !== plan)) return false;
      if (usage !== "all" && activity(s.lastAccessAt).key !== usage) return false;
      if (!term) return true;
      const hay = norm([s.name, s.cnpj ?? "", s.slug, ...s.admins.flatMap((a) => [a.fullName, a.email])].join(" "));
      return hay.includes(term) || (!!s.cnpj && s.cnpj.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "§"));
    });
    const val = (s: Subscriber) =>
      sort.key === "name"
        ? norm(s.name)
        : sort.key === "total"
          ? s.totalPaid
          : sort.key === "access"
            ? s.lastAccessAt ?? "" // never seen sorts as the oldest
            : s.accessValidUntil ?? "9999-99-99";
    return [...list].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [q.data, search, status, plan, usage, sort]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, active: 0, expiring: 0, expired: 0, suspended: 0 };
    for (const s of q.data ?? []) for (const f of STATUS) if (matchesStatus(s, f.key)) c[f.key]++;
    return c;
  }, [q.data]);

  function SortHead({ k, label, num, className }: { k: SortKey; label: string; num?: boolean; className?: string }) {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th className={[num ? "num" : "", className ?? ""].join(" ").trim() || undefined} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button className="th-sort" onClick={() => setSort({ key: k, dir: active ? ((-sort.dir) as 1 | -1) : k === "total" || k === "access" ? -1 : 1 })}>
          {label}
          <Icon aria-hidden="true" />
        </button>
      </th>
    );
  }

  return (
    <>
      <PageHead title="Assinantes" sub={q.data ? `${q.data.length} clínicas cadastradas` : "Clínicas cadastradas"} />
      <div className="toolbar">
        <div className="input-icon grow">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Buscar por clínica, CNPJ ou e-mail" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented" role="group" aria-label="Situação">
          {STATUS.map((s) => (
            <button key={s.key} type="button" aria-pressed={status === s.key} onClick={() => setStatus(s.key)}>
              {s.label} <span className="muted">{counts[s.key]}</span>
            </button>
          ))}
        </div>
        <select className="select" style={{ width: 190 }} aria-label="Plano" value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}>
          <option value="all">Todos os planos</option>
          <option value="solo">Solo</option>
          <option value="intermediario">Intermediário</option>
          <option value="expert">Expert</option>
          <option value="none">Sem plano</option>
        </select>
        <select className="select" style={{ width: 210 }} aria-label="Atividade" value={usage} onChange={(e) => setUsage(e.target.value as typeof usage)}>
          <option value="all">Toda atividade</option>
          <option value="active">Ativas (até 7 dias)</option>
          <option value="low">Pouco uso (8 a 30 dias)</option>
          <option value="inactive">Inativas (mais de 30 dias)</option>
          <option value="none">Sem registro</option>
        </select>
      </div>

      {q.isError ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
      {q.isLoading ? <Loading /> : null}

      {q.data ? (
        <div className="card card--flush">
          {rows.length ? (
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <SortHead k="name" label="Clínica" className="col-clinic" />
                    <th>Administradores</th>
                    <th>Plano</th>
                    <th className="num">Valor/mês</th>
                    <th>Assinante desde</th>
                    <SortHead k="validity" label="Validade" />
                    <SortHead k="total" label="Total pago" num />
                    <SortHead k="access" label="Último acesso" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr
                      key={s.id}
                      className="row-link"
                      tabIndex={0}
                      onClick={() => navigate(`/clinicas/${s.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/clinicas/${s.id}`)}
                    >
                      <td className="cell-main col-clinic">
                        <div className="row-title">{s.name}</div>
                        <div className="cell-sub nowrap">{s.cnpj ? `CNPJ ${s.cnpj}` : "Sem CNPJ"}</div>
                        <div className="cell-sub">{s.membersCount} {s.membersCount === 1 ? "usuário" : "usuários"}</div>
                      </td>
                      <td data-label="Administradores">
                        <div className="mail-list">
                          {s.admins.length ? s.admins.map((a) => <span key={a.id} title={`${a.fullName} <${a.email}>`}>{a.email}</span>) : <span className="muted">—</span>}
                        </div>
                      </td>
                      <td data-label="Plano"><PlanBadge plan={s.plan} /></td>
                      <td data-label="Valor/mês" className="num">{money(s.monthlyPrice)}</td>
                      <td data-label="Assinante desde">
                        <div>
                          <div className="nowrap">{date(s.subscriptionStartedAt)}</div>
                          {s.subscriptionStartedAt ? <div className="cell-sub">{monthsAgoLabel(s.subscriptionStartedAt)}</div> : null}
                        </div>
                      </td>
                      <td data-label="Validade">
                        <div>
                          <ValidityBadge status={s.status} accessValidUntil={s.accessValidUntil} accessExpired={s.accessExpired} />
                          {s.accessValidUntil ? <div className="cell-sub nowrap">{date(s.accessValidUntil)}</div> : null}
                        </div>
                      </td>
                      <td data-label="Total pago" className="num">
                        <div>
                          <div>{money(s.totalPaid)}</div>
                          <div className="cell-sub">{s.paymentsCount} {s.paymentsCount === 1 ? "pagamento" : "pagamentos"}</div>
                          {s.lastPaymentAt ? <div className="cell-sub">último em {date(s.lastPaymentAt)}</div> : null}
                        </div>
                      </td>
                      <td data-label="Último acesso">
                        <div>
                          <ActivityBadge lastSeenAt={s.lastAccessAt} />
                          {s.lastAccessAt ? (
                            <>
                              <div className="cell-sub nowrap" title={accessTime(s.lastAccessAt)}>{accessAgo(s.lastAccessAt)}</div>
                              {s.lastAccessBy ? <div className="cell-sub">{s.lastAccessBy.fullName}</div> : null}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nenhuma clínica encontrada com esses filtros.</Empty>
          )}
        </div>
      ) : null}
    </>
  );
}
