/** Parse a pt-BR money string ("1.234,56", "99,9", "R$ 99") into a number; null if empty or invalid. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/R\$|\s| /g, "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Number → "1.234,56" for an editable field (no currency symbol). */
export function moneyInput(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
