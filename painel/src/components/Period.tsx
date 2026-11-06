import { addDays, todayISO } from "../lib/format";

export type PeriodKey = "month" | "30d" | "year" | "custom";
export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
}

export function periodFor(key: Exclude<PeriodKey, "custom">): Period {
  const t = todayISO();
  const [y, m] = t.split("-").map(Number);
  if (key === "month") {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { key, from: `${t.slice(0, 7)}-01`, to: `${t.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }
  if (key === "30d") return { key, from: addDays(t, -29), to: t };
  return { key, from: `${y}-01-01`, to: `${y}-12-31` };
}

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "Este mês" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="toolbar" style={{ marginBottom: 0 }}>
      <div className="segmented" role="group" aria-label="Período">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value.key === o.key}
            onClick={() => onChange(o.key === "custom" ? { ...value, key: "custom" } : periodFor(o.key))}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value.key === "custom" ? <DateRange from={value.from} to={value.to} onChange={(from, to) => onChange({ key: "custom", from, to })} /> : null}
    </div>
  );
}

export function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="date"
        className="input"
        style={{ width: 160, height: 38 }}
        aria-label="De"
        value={from}
        max={to || undefined}
        onChange={(e) => e.target.value && onChange(e.target.value, to)}
      />
      <span className="muted small">até</span>
      <input
        type="date"
        className="input"
        style={{ width: 160, height: 38 }}
        aria-label="Até"
        value={to}
        min={from || undefined}
        onChange={(e) => e.target.value && onChange(from, e.target.value)}
      />
    </div>
  );
}
