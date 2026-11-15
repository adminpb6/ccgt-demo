import { expect, test } from 'vitest';
import { parseCsv, parseDateCell, parseScopeList, parseUpdateRows } from '../../src/domain/excel';

test('daty', () => {
  expect(parseDateCell('2026-11-03')).toBe('2026-11-03');
  expect(parseDateCell('03.11.2026')).toBe('2026-11-03');
  expect(parseDateCell(46329)).toBe('2026-11-03');
  expect(parseDateCell('abc')).toBeNull();
});
test('R1a: aktualizacje z CSV (; i polskie nagłówki)', () => {
  const g = parseCsv('task_code;nowy_termin_końca;nowy_termin_startu;uwagi\r\n10SN54-024;2028-02-24;;opóźniona dostawa\r\nX;zły;;\r\n');
  const r = parseUpdateRows(g);
  expect(r.rows).toEqual([{ taskCode: '10SN54-024', newEnd: '2028-02-24', newStart: undefined, note: 'opóźniona dostawa' }]);
  expect(r.errors.length).toBe(1);
});
test('brak kolumn', () => { expect(parseUpdateRows([['a', 'b']]).errors[0]).toMatch(/Brak wymaganych/); });
test('lista zakresu', () => { expect(parseScopeList([['task_code'], ['A-1'], ['A-2'], ['A-1']])).toEqual(['A-1', 'A-2']); });
