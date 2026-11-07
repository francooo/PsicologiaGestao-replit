import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { PageHead } from "../components/Layout";
import { ActivityBadge, Empty, ErrorBox, Loading, ValidityBadge } from "../components/ui";
import { useAdmins } from "../lib/queries";
import { accessAgo, accessTime, date } from "../lib/format";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function AdminsPage() {
  const q = useAdmins();
  const [search, setSearch] = useState("");
  // Name A-Z by default; the "Último acesso" header switches to most recent first
  const [byAccess, setByAccess] = useState<0 | 1 | -1>(0);
  const rows = useMemo(() => {
    const term = norm(search.trim());
    const list = q.data ?? [];
    const filtered = term ? list.filter((a) => norm([a.fullName, a.email, ...a.clinics.map((c) => c.name)].join(" ")).includes(term)) : list;
    return [...filtered].sort((a, b) => {
      if (byAccess) {
        const va = a.lastSeenAt ?? "";
        const vb = b.lastSeenAt ?? "";
        if (va !== vb) return (va < vb ? 1 : -1) * byAccess;
      }
      return a.fullName.localeCompare(b.fullName, "pt-BR");
    });
  }, [q.data, search, byAccess]);
  const SortIcon = byAccess === 0 ? ArrowUpDown : byAccess === 1 ? ArrowDown : ArrowUp;

  return (
    <>
      <PageHead title="Administradores" sub={q.data ? `${q.data.length} administradores de clínicas` : "Administradores de clínicas"} />
      <div className="toolbar">
        <div className="input-icon grow" style={{ maxWidth: 480 }}>
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Buscar por nome, e-mail ou clínica" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
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
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Clínicas</th>
                    <th>Desde</th>
                    <th aria-sort={byAccess === 0 ? "none" : byAccess === 1 ? "descending" : "ascending"}>
                      <button className="th-sort" onClick={() => setByAccess((v) => (v === 1 ? -1 : 1))}>
                        Último acesso
                        <SortIcon aria-hidden="true" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-main">
                        <div className="row-title">{a.fullName}</div>
                      </td>
                      <td data-label="E-mail">
                        <a href={`mailto:${a.email}`} style={{ wordBreak: "break-all" }}>{a.email}</a>
                      </td>
                      <td data-label="Clínicas">
                        <div style={{ display: "grid", gap: 8 }}>
                          {a.clinics.length ? (
                            a.clinics.map((c) => (
                              <div key={c.id} className="clinic-row">
                                <Link href={`/clinicas/${c.id}`}>{c.name}</Link>
                                <ValidityBadge status={c.status} accessValidUntil={c.accessValidUntil} accessExpired={c.accessExpired} />
                              </div>
                            ))
                          ) : (
                            <span className="muted">Nenhuma</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Desde" className="nowrap">{date(a.createdAt)}</td>
                      <td data-label="Último acesso">
                        <div>
                          <ActivityBadge lastSeenAt={a.lastSeenAt} />
                          {a.lastSeenAt ? <div className="cell-sub nowrap" title={accessTime(a.lastSeenAt)}>{accessAgo(a.lastSeenAt)}</div> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nenhum administrador encontrado.</Empty>
          )}
        </div>
      ) : null}
    </>
  );
}
