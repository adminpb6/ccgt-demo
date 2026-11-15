import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseXer } from '../../src/xer/parse';
import { writeDelta } from '../../src/xer/write';

const rd = (f: string) => new Uint8Array(readFileSync(`public/data/${f}`));
const H = parseXer(rd('PL5001_SYNTH_schedule_Rev0H_DD07102026.xer'), { revision: 'Rev0H' });
const expected: { task_code: string; root_cause: boolean }[] = JSON.parse(readFileSync('public/data/expected_shifts.json', 'utf8'));

test('delta: bajt w bajt = PL5001_SYNTH_delta_export_sample.xer', () => {
  const rows = expected.filter((e) => e.root_cause).slice(0, 25)
    .map((e) => ({ code: e.task_code, cstrDate: H.tasks[e.task_code].start }));
  const out = writeDelta(H, rows, 'CS_MSOA');
  const ref = rd('PL5001_SYNTH_delta_export_sample.xer');
  expect(Buffer.from(out).equals(Buffer.from(ref))).toBe(true);
});
