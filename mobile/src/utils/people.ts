import { differenceInMonths } from 'date-fns';

import { fromDateKey } from './format';

/** "N meses na clínica" / "X anos e R meses" (long) or "Nm" / "Xa Ym" (short), as in the web. */
export function monthsAtClinicText(startedAt?: string | null, long = false, months?: number | null) {
  const m = months ?? (startedAt ? differenceInMonths(new Date(), fromDateKey(startedAt.slice(0, 10))) : null);
  if (m === null || m === undefined || m < 0) return '—';
  const years = Math.floor(m / 12);
  const rest = m % 12;
  if (!long) return years === 0 ? `${m}m` : rest ? `${years}a ${rest}m` : `${years}a`;
  if (years === 0) return `${m} ${m === 1 ? 'mês' : 'meses'} na clínica`;
  const y = `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return rest ? `${y} e ${rest} ${rest === 1 ? 'mês' : 'meses'} na clínica` : `${y} na clínica`;
}
