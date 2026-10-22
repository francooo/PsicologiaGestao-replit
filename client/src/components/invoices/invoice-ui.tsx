import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/cp/StatusBadge";
import { invoiceStatus, statusOf } from "@/components/cp/status";
import { formatBRL } from "@/lib/money";
import { fromDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

// Pieces shared by "Minhas Notas Fiscais" and "Gestão de Notas" (admin).

export const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "ativa", label: "Ativa" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelada", label: "Cancelada" },
];

export const cpCard = "rounded-2xl border border-cp-divider bg-white shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)]";

export interface InvoiceListRow {
  id: number;
  chaveNfe: string | null;
  numeroNota: string | null;
  serie: string | null;
  dataEmissao: string | null;
  dataUpload: string | null;
  tomadorNome: string | null;
  valorLiquido: string | null;
  status: string;
  user?: { fullName: string } | null;
}

export function formatChaveNfe(chave: string | null): string {
  if (!chave) return "—";
  if (chave.length <= 20) return chave;
  return `${chave.slice(0, 8)}...${chave.slice(-8)}`;
}

export function money(value: string | null | undefined) {
  if (value == null || value === "" || isNaN(parseFloat(value))) return "—";
  return formatBRL(value);
}

/** Emission date is a calendar date (no timezone shift); upload is a real timestamp. */
export function emissionDate(value: string | null | undefined) {
  const d = fromDateKey(value ?? null);
  return d ? format(d, "dd/MM/yyyy") : "—";
}

export function uploadDate(value: string | null | undefined) {
  return value ? format(new Date(value), "dd/MM/yyyy HH:mm") : "—";
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const st = statusOf(invoiceStatus, status);
  return <StatusBadge label={st.label} tone={st.tone} />;
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function InvoiceTable({
  rows,
  isLoading,
  showPsychologist = false,
  onOpen,
  onDownload,
  onDelete,
  empty,
}: {
  rows: InvoiceListRow[];
  isLoading: boolean;
  showPsychologist?: boolean;
  onOpen: (id: number) => void;
  onDownload: (id: number) => void;
  onDelete?: (id: number) => void;
  empty: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-cp-action" />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <FileText className="mb-3 h-10 w-10 text-cp-sage" />
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="bg-cp-sand-soft text-left text-[13px] text-cp-ink [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
            <th className="px-4 py-3 font-medium">Chave NF-e</th>
            <th className="px-4 py-3 font-medium">Nº / Série</th>
            <th className="px-4 py-3 font-medium">Emissão</th>
            {showPsychologist && <th className="px-4 py-3 font-medium">Psicóloga</th>}
            <th className="px-4 py-3 font-medium">Paciente / Tomador</th>
            <th className="px-4 py-3 font-medium">Valor líquido</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Registrada em</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr
              key={inv.id}
              className="cursor-pointer transition-colors hover:bg-cp-hover [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl"
              onClick={() => onOpen(inv.id)}
              data-testid={`row-invoice-${inv.id}`}
            >
              <td className="px-4 py-3 font-mono text-xs text-cp-muted" title={inv.chaveNfe ?? undefined}>{formatChaveNfe(inv.chaveNfe)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-cp-ink">{inv.numeroNota ?? "—"}{inv.serie ? ` / ${inv.serie}` : ""}</td>
              <td className="whitespace-nowrap px-4 py-3 text-cp-ink">{emissionDate(inv.dataEmissao)}</td>
              {showPsychologist && <td className="px-4 py-3 font-medium text-cp-ink">{inv.user?.fullName ?? "—"}</td>}
              <td className="max-w-[180px] truncate px-4 py-3 text-cp-ink" title={inv.tomadorNome ?? undefined}>{inv.tomadorNome ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-cp-ink">{money(inv.valorLiquido)}</td>
              <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-cp-muted">{uploadDate(inv.dataUpload)}</td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" className="text-cp-muted hover:bg-cp-action-soft hover:text-cp-action" onClick={() => onDownload(inv.id)} aria-label="Baixar imagem" data-testid={`button-download-${inv.id}`}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button size="icon" variant="ghost" className="text-cp-danger hover:bg-cp-danger-soft hover:text-cp-danger" onClick={() => onDelete(inv.id)} aria-label="Excluir" data-testid={`button-delete-${inv.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const btn = "h-9 rounded-xl border border-cp-border bg-white px-4 text-sm text-cp-ink transition-colors hover:bg-cp-hover disabled:opacity-50";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-cp-muted">
        Exibindo {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total} notas
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</button>
        <button type="button" className={cn(btn)} disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>Próxima</button>
      </div>
    </div>
  );
}
