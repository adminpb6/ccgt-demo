import type { ShiftEvent, Snapshot, Task } from './types';
import { dateOnly, workdaysBetween } from './workdays';

export interface DiffResult {
  shifts: ShiftEvent[];
  added: string[];     // R8: nowe w zakresie importu (kod obecny tylko w nowym)
  removed: string[];   // R8: zniknęły
  completed: string[];
}

/** R3: porównanie dwóch snapshotów dla zadań z zakresu. Klucz: task_code (kontrola guid). */
export function diffSnapshots(oldS: Snapshot, newS: Snapshot, scope: ReadonlySet<string>, thresholdWd: number): DiffResult {
  const shifts: ShiftEvent[] = [];
  const added: string[] = [], removed: string[] = [], completed: string[] = [];
  for (const code of scope) {
    const o = oldS.tasks[code], n = newS.tasks[code];
    if (!o && n) { added.push(code); continue; }
    if (o && !n) { removed.push(code); continue; }
    if (!o || !n) continue;
    if (o.guid !== n.guid) continue; // inny obiekt pod tym samym kodem
    if (o.status === 'TK_Complete' && n.status === 'TK_Complete') continue;
    // Założenie (README): zadanie ukończone dopiero w nowym imporcie nadal raportujemy — tak liczy expected_shifts.json (R3 mówi inaczej).
    if (n.status === 'TK_Complete') completed.push(code);
    const delta = workdaysBetween(dateOnly(o.end), dateOnly(n.end));
    if (Math.abs(delta) >= thresholdWd) {
      shifts.push({ id: `${newS.id}:${code}`, taskCode: code, fromEnd: dateOnly(o.end), toEnd: dateOnly(n.end), deltaWd: delta, snapshotId: newS.id });
    }
  }
  return { shifts, added, removed, completed };
}

/** Opóźnienie skumulowane w dniach roboczych: end − baselineEnd. */
export function cumulativeDelay(t: Task): number {
  return workdaysBetween(dateOnly(t.baselineEnd), dateOnly(t.end));
}
