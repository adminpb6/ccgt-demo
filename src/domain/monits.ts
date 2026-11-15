import type { Monit, MonitStatus, ShiftEvent } from './types';

export const ALLOWED: Record<MonitStatus, MonitStatus[]> = {
  new: ['negotiating', 'closed'],
  negotiating: ['proposed', 'closed'],
  proposed: ['accepted', 'rejected', 'closed'],
  rejected: ['negotiating'],
  accepted: ['closed'],
  closed: [],
};

export function canTransition(from: MonitStatus, to: MonitStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function transition(m: Monit, to: MonitStatus, by: string, at: string, note?: string): Monit {
  if (!canTransition(m.status, to)) throw new Error(`Niedozwolone przejście monitu: ${m.status} → ${to}`);
  return { ...m, status: to, history: [...m.history, { at, by, action: `${m.status}→${to}`, note }] };
}

export const isOpen = (m: Monit) => m.status === 'new' || m.status === 'negotiating' || m.status === 'proposed' || m.status === 'rejected';

export interface Notice { id: string; kind: 'info-left' | 'added' | 'removed'; taskCode: string; text: string; at: string; snapshotId: string }

/** R4: monity z przesunięć w prawo; w lewo → wpis informacyjny; wiele przesunięć tego samego zadania scala się w jeden otwarty monit. */
export function applyShifts(
  monits: Monit[], shifts: ShiftEvent[], ownerOf: (taskCode: string) => string | undefined, at: string,
): { monits: Monit[]; notices: Notice[] } {
  const out = monits.map((m) => ({ ...m }));
  const notices: Notice[] = [];
  for (const s of shifts) {
    if (s.deltaWd < 0) {
      notices.push({ id: `n:${s.id}`, kind: 'info-left', taskCode: s.taskCode, at, snapshotId: s.snapshotId,
        text: `Przesunięcie w lewo o ${-s.deltaWd} dni rob.: ${s.fromEnd} → ${s.toEnd}` });
      continue;
    }
    const open = out.find((m) => m.taskCode === s.taskCode && isOpen(m));
    if (open) {
      open.shiftId = s.id;
      open.history = [...open.history, { at, by: 'system', action: 'aktualizacja', note: `nowy koniec ${s.toEnd}` }];
      continue;
    }
    out.push({
      id: `m:${s.id}`, taskCode: s.taskCode, ownerId: ownerOf(s.taskCode) ?? '', shiftId: s.id, status: 'new',
      createdAt: at, history: [{ at, by: 'system', action: 'utworzony', note: `${s.fromEnd} → ${s.toEnd} (+${s.deltaWd} dni rob.)` }],
    });
  }
  return { monits: out, notices };
}

/** R8: zadania zniknęłe → monity zamykają się automatycznie. */
export function closeForRemoved(monits: Monit[], removed: string[], at: string): Monit[] {
  const rm = new Set(removed);
  return monits.map((m) => (rm.has(m.taskCode) && m.status !== 'closed'
    ? { ...m, status: 'closed' as const, history: [...m.history, { at, by: 'system', action: 'zamknięty', note: 'usunięte z harmonogramu' }] }
    : m));
}
