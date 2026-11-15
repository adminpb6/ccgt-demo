import type { AppConfig, Snapshot } from '../domain/types';

export interface DeltaRow { code: string; cstrDate: string } // cstrDate: 'YYYY-MM-DD HH:MM'

let reverse: Map<string, number> | null = null;
function cp1250Map(): Map<string, number> {
  if (reverse) return reverse;
  const dec = new TextDecoder('windows-1250');
  const m = new Map<string, number>();
  for (let b = 0; b < 256; b++) {
    const ch = dec.decode(new Uint8Array([b]));
    if (ch !== '�' && !m.has(ch)) m.set(ch, b);
  }
  return (reverse = m);
}

/** Kodowanie windows-1250 (TextEncoder zna tylko UTF-8). Nieznane znaki → '?'. */
export function encodeCp1250(s: string): Uint8Array {
  const m = cp1250Map();
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = m.get(s[i]) ?? 0x3f;
  return out;
}

/**
 * Format delty (izolowany i parametryzowany — forma przyjęcia przez Primaverę niepotwierdzona):
 * jedna tabela TASK, pola task_id, proj_id, task_code, guid, cstr_type, cstr_date, task_name.
 */
export const DELTA_FIELDS = ['task_id', 'proj_id', 'task_code', 'guid', 'cstr_type', 'cstr_date', 'task_name'] as const;

export function writeDeltaText(snap: Snapshot, rows: DeltaRow[], cstrType: AppConfig['deltaConstraintType']): string {
  const L: string[] = [snap.header.join('\t'), '%T\tTASK', '%F\t' + DELTA_FIELDS.join('\t')];
  for (const r of rows) {
    const t = snap.tasks[r.code];
    if (!t) continue;
    L.push('%R\t' + [t.numericId, t.projId, t.code, t.guid, cstrType, r.cstrDate, t.name].join('\t'));
  }
  L.push('%E');
  return L.join('\r\n') + '\r\n';
}

export function writeDelta(snap: Snapshot, rows: DeltaRow[], cstrType: AppConfig['deltaConstraintType']): Uint8Array {
  return encodeCp1250(writeDeltaText(snap, rows, cstrType));
}
