import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { num, parseXer, parseXerText, decodeXer } from '../../src/xer/parse';

const G = readFileSync('public/data/PL5001_SYNTH_schedule_Rev0G_DD30092026.xer');

describe('parser Rev0G', () => {
  const t0 = performance.now();
  const snap = parseXer(new Uint8Array(G));
  const ms = performance.now() - t0;
  test('liczności', () => {
    expect(Object.keys(snap.tasks).length).toBe(5208);
    expect(snap.relationCount).toBe(7065);
    // SPEC: 1950 węzłów WBS — dane (stats.json, tabela PROJWBS) mają 1572; patrz README
    expect(Object.keys(snap.wbs).length).toBe(1572);
    expect(snap.projects.length).toBe(3);
  });
  test('wydajność < 1.5 s (bez workera)', () => { expect(ms).toBeLessThan(1500); });
  test('polskie znaki bez uszkodzeń', () => {
    const t = snap.tasks['24PY38-001'];
    expect(t.name).toBe('Projekt wykonawczy – Turbina gazowa');
    expect(decodeXer(G)).not.toContain('�');
  });
  test('task_code i guid unikalne, bez ostrzeżeń o duplikatach', () => {
    expect(snap.warnings.filter((w) => w.startsWith('Zduplikowany'))).toEqual([]);
    expect(new Set(Object.values(snap.tasks).map((t) => t.guid)).size).toBe(5208);
  });
  test('liczby z przecinkiem', () => {
    expect(num('1752,4')).toBe(1752.4);
    expect(snap.tasks['24PY38-001'].floatDays).toBeCloseTo(2063.2 / 8);
  });
  test('kody aktywności', () => {
    expect(Object.keys(snap.tasks['24PY38-001'].codes).length).toBeGreaterThanOrEqual(10);
  });
});

describe('błędy', () => {
  test('liczba kolumn z numerem linii', () => {
    const bad = 'ERMHDR\t19.12\t2026-09-30\r\n%T\tX\r\n%F\ta\tb\r\n%R\t1\r\n%E\r\n';
    expect(() => parseXerText(bad)).toThrow(/Linia 4/);
  });
});
