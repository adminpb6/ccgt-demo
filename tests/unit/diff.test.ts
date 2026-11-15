import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { diffSnapshots } from '../../src/domain/diff';
import { selectByRule } from '../../src/domain/scope';
import { DEFAULT_CONFIG } from '../../src/domain/types';
import { parseXer } from '../../src/xer/parse';

const rd = (f: string) => new Uint8Array(readFileSync(`public/data/${f}`));
const G = parseXer(rd('PL5001_SYNTH_schedule_Rev0G_DD30092026.xer'), { revision: 'Rev0G' });
const H = parseXer(rd('PL5001_SYNTH_schedule_Rev0H_DD07102026.xer'), { revision: 'Rev0H' });
const expected: { task_code: string; old_end: string; new_end: string; delta_wd: number }[] =
  JSON.parse(readFileSync('public/data/expected_shifts.json', 'utf8'));

test('zakres wg reguły = 621 (11,9%)', () => {
  const s = selectByRule(G, DEFAULT_CONFIG.scopeRule);
  expect(s.length).toBe(621);
  expect(selectByRule(G, { ppIn: ['PM100'], teamIn: [] }).length).not.toBe(621);
});

// Generator liczył przesunięcia na ułamkowych dniach roboczych (EF jako float), a XER niesie tylko
// daty całkowite. Sześć zadań z przesunięciem dokładnie +1 dzień roboczy mają w prawdzie < 1 dnia
// (np. 0,8), więc nie wchodzą do expected_shifts.json, choć daty XER przesuwają się o 1 d. rob.
// Z samego XER nie da się ich odróżnić od 24PY38-046 (+1 → 1,5). Patrz README („Założenia").
const BORDERLINE = ['16KE73-026', '16KE73-070', '16KE73-142', '25DF82-082', '28YY90-102', '28YY90-112'];

test('diff Rev0G→Rev0H = expected_shifts.json (212 + 6 granicznych ±1 d)', () => {
  const scope = new Set(selectByRule(G, DEFAULT_CONFIG.scopeRule));
  const d = diffSnapshots(G, H, scope, DEFAULT_CONFIG.shiftThresholdWd);
  const got = new Map(d.shifts.map((s) => [s.taskCode, s]));
  const missing = expected.filter((e) => !got.has(e.task_code)).map((e) => e.task_code);
  const extra = [...got.keys()].filter((c) => !expected.some((e) => e.task_code === c)).sort();
  expect({ missing, extra }).toEqual({ missing: [], extra: BORDERLINE });
  for (const c of extra) expect(Math.abs(got.get(c)!.deltaWd)).toBe(1);
  const strict = d.shifts.filter((s) => !BORDERLINE.includes(s.taskCode));
  expect(strict.length).toBe(212);
  for (const e of expected) {
    const s = got.get(e.task_code)!;
    expect(s.toEnd, e.task_code).toBe(e.new_end);
    expect(s.fromEnd, e.task_code).toBe(e.old_end);
    expect(Math.abs(s.deltaWd - e.delta_wd), e.task_code).toBeLessThan(1);
  }
  expect(strict.filter((s) => s.deltaWd > 0).length).toBe(128);
  expect(strict.filter((s) => s.deltaWd < 0).length).toBe(84);
});
