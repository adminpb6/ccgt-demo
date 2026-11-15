import { expect, test } from 'vitest';
import { applyShifts, canTransition, closeForRemoved, transition } from '../../src/domain/monits';
import type { Monit, ShiftEvent } from '../../src/domain/types';

const sh = (code: string, d: number, id = 's1'): ShiftEvent => ({ id: `${id}:${code}`, taskCode: code, fromEnd: '2026-10-01', toEnd: '2026-10-08', deltaWd: d, snapshotId: id });
const own = () => 'u-own-1';

test('maszyna stanów: dozwolone', () => {
  expect(canTransition('new', 'negotiating')).toBe(true);
  expect(canTransition('negotiating', 'proposed')).toBe(true);
  expect(canTransition('proposed', 'accepted')).toBe(true);
  expect(canTransition('proposed', 'rejected')).toBe(true);
  expect(canTransition('rejected', 'negotiating')).toBe(true);
  expect(canTransition('accepted', 'closed')).toBe(true);
});
test('maszyna stanów: zabronione', () => {
  expect(canTransition('new', 'proposed')).toBe(false);
  expect(canTransition('new', 'accepted')).toBe(false);
  expect(canTransition('negotiating', 'accepted')).toBe(false);
  expect(canTransition('closed', 'negotiating')).toBe(false);
  const m = applyShifts([], [sh('A-1', 3)], own, 't').monits[0];
  expect(() => transition(m, 'accepted', 'x', 't')).toThrow();
});
test('R4: w prawo → monit, w lewo → info, scalanie', () => {
  const r1 = applyShifts([], [sh('A-1', 3), sh('A-2', -2)], own, 't');
  expect(r1.monits.length).toBe(1);
  expect(r1.notices.length).toBe(1);
  const r2 = applyShifts(r1.monits, [sh('A-1', 5, 's2')], own, 't2');
  expect(r2.monits.length).toBe(1);
  expect(r2.monits[0].shiftId).toBe('s2:A-1');
});
test('R8: usunięte zamykają monity', () => {
  const m: Monit[] = applyShifts([], [sh('A-1', 3)], own, 't').monits;
  expect(closeForRemoved(m, ['A-1'], 't')[0].status).toBe('closed');
});
