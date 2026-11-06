import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { PageHead } from "../components/Layout";
import { Empty, ErrorBox, Loading, ValidityBadge } from "../components/ui";
import { useAdmins } from "../lib/queries";
import { date } from "../lib/format";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function AdminsPage() {
  const q = useAdmins();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const term = norm(search.trim());
    const list = q.data ?? [];
    const filtered = term ? list.filter((a) => norm([a.fullName, a.email, ...a.clinics.map((c) => c.name)].join(" ")).includes(term)) : list;
    return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [q.data, search]);

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
