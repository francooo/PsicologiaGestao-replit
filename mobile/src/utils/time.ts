/** "09:00" + 50 -> "09:50" (same as calculateEndTime in the web appointments page) */
export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + (m || 0) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}
