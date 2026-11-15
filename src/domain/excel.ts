import { isWeekend } from './workdays';

export interface UpdateRow { taskCode: string; newEnd: string; newStart?: string; note?: string }
export interface UpdateParse { rows: UpdateRow[]; errors: string[] }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Data → 'YYYY-MM-DD'. Akceptuje YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, obiekt Date i numer seryjny Excela. */
export function parseDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Wiersze 2D (nagłówek w pierwszym) → aktualizacje (R1a). */
export function parseUpdateRows(grid: unknown[][]): UpdateParse {
  const errors: string[] = [];
  if (!grid.length) return { rows: [], errors: ['Pusty plik'] };
  const head = grid[0].map((h) => norm(String(h ?? '')));
  const ci = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const cCode = ci('task_code'), cEnd = ci('nowy_termin_konca'), cStart = ci('nowy_termin_startu'), cNote = ci('uwagi');
  if (cCode < 0 || cEnd < 0) return { rows: [], errors: ['Brak wymaganych kolumn: task_code, nowy_termin_końca'] };
  const rows: UpdateRow[] = [];
  grid.slice(1).forEach((r, i) => {
    const line = i + 2;
    const code = String(r[cCode] ?? '').trim();
    if (!code && r.every((c) => c === '' || c == null)) return;
    const end = parseDateCell(r[cEnd]);
    if (!code) return void errors.push(`Wiersz ${line}: brak task_code`);
    if (!end) return void errors.push(`Wiersz ${line} (${code}): nieczytelna data końca`);
    const start = cStart >= 0 && r[cStart] !== '' && r[cStart] != null ? parseDateCell(r[cStart]) : null;
    if (cStart >= 0 && r[cStart] !== '' && r[cStart] != null && !start) return void errors.push(`Wiersz ${line} (${code}): nieczytelna data startu`);
    if (isWeekend(end)) errors.push(`Wiersz ${line} (${code}): termin ${end} przypada w weekend (ostrzeżenie)`);
    rows.push({ taskCode: code, newEnd: end, newStart: start ?? undefined, note: cNote >= 0 ? String(r[cNote] ?? '') || undefined : undefined });
  });
  return { rows, errors };
}

/** Lista task_code z pierwszej kolumny `task_code` (lub pierwszej kolumny). */
export function parseScopeList(grid: unknown[][]): string[] {
  if (!grid.length) return [];
  const head = grid[0].map((h) => norm(String(h ?? '')));
  const idx = head.indexOf('task_code');
  const body = idx >= 0 ? grid.slice(1) : grid;
  const col = idx >= 0 ? idx : 0;
  return [...new Set(body.map((r) => String(r[col] ?? '').trim()).filter(Boolean))];
}

export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const first = t.split(/\r?\n/)[0] ?? '';
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let cur: string[] = [], field = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c;
    } else if (c === '"') q = true;
    else if (c === delim) { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      cur.push(field); field = ''; rows.push(cur); cur = [];
    } else field += c;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
}
