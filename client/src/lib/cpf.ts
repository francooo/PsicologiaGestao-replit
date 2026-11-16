/** Formats a CPF as 000.000.000-00 while it is typed (or from stored digits). */
export function formatCpf(value: string | null | undefined) {
  const d = (value ?? "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
