/** Dni robocze pn–pt, bez świąt (R2). Indeks dnia roboczego; weekend mapuje się na następny poniedziałek. */
const BASE = Date.UTC(1970, 0, 5); // poniedziałek

export function dateOnly(s: string): string { return s.slice(0, 10); }

export function wdIndex(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - BASE) / 86400000);
  const w = Math.floor(days / 7);
  const r = days - w * 7; // 0=pn … 6=nd
  return w * 5 + Math.min(r, 5);
}

/** Różnica w dniach roboczych: b − a. */
export function workdaysBetween(a: string, b: string): number { return wdIndex(b) - wdIndex(a); }

export function isWeekend(date: string): boolean {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function formatPl(date: string): string {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
