import { expect, test } from 'vitest';
import { workdaysBetween, wdIndex } from '../../src/domain/workdays';

test('pn→pt', () => { expect(workdaysBetween('2026-10-05', '2026-10-09')).toBe(4); });
test('pt→pn (weekend)', () => { expect(workdaysBetween('2026-10-09', '2026-10-12')).toBe(1); });
test('granica roku', () => { expect(workdaysBetween('2026-12-31', '2027-01-04')).toBe(2); });
test('ujemne', () => { expect(workdaysBetween('2026-10-12', '2026-10-09')).toBe(-1); });
test('tydzień = 5', () => { expect(workdaysBetween('2026-10-05', '2026-10-12')).toBe(5); });
test('sobota = następny poniedziałek', () => { expect(wdIndex('2026-10-10')).toBe(wdIndex('2026-10-12')); });
