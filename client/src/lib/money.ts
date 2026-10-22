const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return brl.format(Number.isFinite(n) ? n : 0);
}

/** "1.234,56" | "1234,56" | "200.50" -> number (NaN if invalid). */
export function parseAmount(raw: string) {
  const v = raw.trim();
  return parseFloat(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v);
}

export const incomeCategories = ["Consulta", "Avaliação", "Sessão em Grupo", "Workshop", "Outro"];

export const expenseCategories = [
  "Aluguel",
  "Água",
  "Luz",
  "Internet",
  "Material de Escritório",
  "Limpeza",
  "Manutenção",
  "Salários",
  "Marketing",
  "Impostos",
  "Outro",
];

/** CSV that opens correctly in pt-BR Excel: ';' separator, quoted cells, UTF-8 BOM. */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
