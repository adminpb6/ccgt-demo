import type { Pred, ProjectInfo, RelType, Snapshot, Task, WbsNode } from '../domain/types';

export interface XerTable { fields: string[]; rows: string[][] }
export interface XerFile { header: string[]; tables: Record<string, XerTable> }

export class XerError extends Error {
  constructor(msg: string, public line?: number) { super(line ? `Linia ${line}: ${msg}` : msg); }
}

/** cp1250 -> tekst */
export function decodeXer(buf: ArrayBuffer | Uint8Array): string {
  return new TextDecoder('windows-1250').decode(buf);
}

/** Parser surowych tabel XER (%T/%F/%R). */
export function parseXerText(text: string): XerFile {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (!lines[0]?.startsWith('ERMHDR')) throw new XerError('Brak nagłówka ERMHDR', 1);
  const header = lines[0].split('\t');
  const tables: Record<string, XerTable> = {};
  let cur: XerTable | null = null;
  let ended = false;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (l === '') continue;
    if (l.startsWith('%E')) { ended = true; break; }
    if (l.startsWith('%T')) {
      cur = { fields: [], rows: [] };
      tables[l.split('\t')[1]] = cur;
    } else if (l.startsWith('%F')) {
      if (!cur) throw new XerError('%F bez %T', i + 1);
      cur.fields = l.split('\t').slice(1);
    } else if (l.startsWith('%R')) {
      if (!cur) throw new XerError('%R bez %T', i + 1);
      const row = l.split('\t').slice(1);
      if (row.length !== cur.fields.length) {
        throw new XerError(`liczba kolumn wiersza (${row.length}) ≠ liczba pól (${cur.fields.length})`, i + 1);
      }
      cur.rows.push(row);
    } else {
      throw new XerError(`nieznana linia: ${l.slice(0, 40)}`, i + 1);
    }
  }
  if (!ended) throw new XerError('Brak znacznika końca %E');
  return { header, tables };
}

/** Liczba z przecinkiem dziesiętnym: zamiana , -> . PRZED parseFloat. */
export function num(s: string | undefined): number {
  if (s === undefined || s === '') return 0;
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

function col(t: XerTable | undefined, name: string): number {
  if (!t) throw new XerError(`Brak tabeli wymaganej do importu (${name})`);
  const i = t.fields.indexOf(name);
  if (i < 0) throw new XerError(`Brak pola ${name}`);
  return i;
}

export interface BuildOptions { revision?: string; importedAt?: string }

/** Złącza tabele w model domenowy; kluczem zadania jest task_code (kontrola guid). */
export function buildSnapshot(xer: XerFile, opts: BuildOptions = {}): Snapshot {
  const T = xer.tables;
  const warnings: string[] = [];
  const dataDate = xer.header[2] ?? '';

  // kalendarze: godziny w dniu
  const dayHr = new Map<string, number>();
  const cal = T.CALENDAR;
  if (cal) {
    const ci = col(cal, 'clndr_id'), di = col(cal, 'day_hr_cnt');
    for (const r of cal.rows) dayHr.set(r[ci], num(r[di]) || 8);
  }

  // typy i wartości kodów
  const typeName = new Map<string, string>();
  if (T.ACTVTYPE) {
    const a = col(T.ACTVTYPE, 'actv_code_type_id'), b = col(T.ACTVTYPE, 'actv_code_type');
    for (const r of T.ACTVTYPE.rows) typeName.set(r[a], r[b]);
  }
  const codeName = new Map<string, string>();
  if (T.ACTVCODE) {
    const a = col(T.ACTVCODE, 'actv_code_id'), b = col(T.ACTVCODE, 'actv_code_name');
    for (const r of T.ACTVCODE.rows) codeName.set(r[a], r[b]);
  }
  const codesByTask = new Map<string, Record<string, string>>();
  if (T.TASKACTV) {
    const a = col(T.TASKACTV, 'task_id'), b = col(T.TASKACTV, 'actv_code_type_id'), c = col(T.TASKACTV, 'actv_code_id');
    for (const r of T.TASKACTV.rows) {
      let m = codesByTask.get(r[a]);
      if (!m) { m = {}; codesByTask.set(r[a], m); }
      m[typeName.get(r[b]) ?? r[b]] = codeName.get(r[c]) ?? r[c];
    }
  }

  // WBS
  const wbs: Record<string, WbsNode> = {};
  if (T.PROJWBS) {
    const f = (n: string) => col(T.PROJWBS, n);
    const id = f('wbs_id'), pj = f('proj_id'), par = f('parent_wbs_id'), sn = f('wbs_short_name'), nm = f('wbs_name');
    for (const r of T.PROJWBS.rows) wbs[r[id]] = { id: r[id], projId: r[pj], parentId: r[par], shortName: r[sn], name: r[nm] };
  }
  const projects: ProjectInfo[] = [];
  if (T.PROJECT) {
    const id = col(T.PROJECT, 'proj_id'), sn = col(T.PROJECT, 'proj_short_name'), g = col(T.PROJECT, 'guid');
    for (const r of T.PROJECT.rows) projects.push({ id: r[id], shortName: r[sn], guid: r[g] });
  }

  // zadania
  const TK = T.TASK;
  const f = (n: string) => col(TK, n);
  const ix = {
    id: f('task_id'), proj: f('proj_id'), wbs: f('wbs_id'), cal: f('clndr_id'), pct: f('phys_complete_pct'),
    type: f('task_type'), status: f('status_code'), code: f('task_code'), name: f('task_name'),
    tf: f('total_float_hr_cnt'), dur: f('target_drtn_hr_cnt'),
    es: f('early_start_date'), ee: f('early_end_date'), ts: f('target_start_date'), te: f('target_end_date'),
    as: f('act_start_date'), ae: f('act_end_date'), guid: f('guid'),
  };
  const tasks: Record<string, Task> = {};
  const codeById = new Map<string, string>();
  const guids = new Set<string>();
  for (const r of TK.rows) {
    const code = r[ix.code];
    if (tasks[code]) warnings.push(`Zduplikowany task_code: ${code}`);
    if (guids.has(r[ix.guid])) warnings.push(`Zduplikowany guid: ${r[ix.guid]} (${code})`);
    guids.add(r[ix.guid]);
    const dh = dayHr.get(r[ix.cal]) ?? 8;
    const codes = codesByTask.get(r[ix.id]) ?? {};
    tasks[code] = {
      id: r[ix.id], numericId: r[ix.id], code, guid: r[ix.guid], name: r[ix.name],
      type: r[ix.type] as Task['type'], status: r[ix.status] as Task['status'],
      wbsId: r[ix.wbs], projId: r[ix.proj], objectCode: code.split('-')[0],
      baselineStart: r[ix.ts], baselineEnd: r[ix.te], start: r[ix.es], end: r[ix.ee],
      actStart: r[ix.as] || undefined, actEnd: r[ix.ae] || undefined,
      durationDays: num(r[ix.dur]) / dh, floatDays: num(r[ix.tf]) / dh, pctComplete: num(r[ix.pct]),
      codes, preds: [],
    };
    codeById.set(r[ix.id], code);
  }

  // relacje
  let relationCount = 0, missing = 0;
  const edges: [string, string][] = [];
  if (T.TASKPRED) {
    const a = col(T.TASKPRED, 'task_id'), b = col(T.TASKPRED, 'pred_task_id'), c = col(T.TASKPRED, 'pred_type'), d = col(T.TASKPRED, 'lag_hr_cnt');
    for (const r of T.TASKPRED.rows) {
      const succ = codeById.get(r[a]), pred = codeById.get(r[b]);
      relationCount++;
      if (!succ || !pred) { missing++; continue; }
      const p: Pred = { code: pred, type: r[c] as RelType, lagDays: num(r[d]) / 8 };
      tasks[succ].preds.push(p);
      edges.push([pred, succ]);
    }
  }
  if (missing) warnings.push(`Relacje wskazujące poza zbiór: ${missing}`);
  if (hasCycle(Object.keys(tasks), edges)) warnings.push('Wykryto cykl w relacjach');

  return {
    id: opts.revision ?? dataDate, revision: opts.revision ?? dataDate, dataDate,
    importedAt: opts.importedAt ?? new Date().toISOString(),
    tasks, wbs, projects, warnings, relationCount,
  };
}

function hasCycle(nodes: string[], edges: [string, string][]): boolean {
  const indeg = new Map<string, number>(nodes.map((n) => [n, 0]));
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    indeg.set(b, (indeg.get(b) ?? 0) + 1);
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
  }
  const q = nodes.filter((n) => indeg.get(n) === 0);
  let seen = 0;
  while (q.length) {
    const n = q.pop()!; seen++;
    for (const m of adj.get(n) ?? []) {
      const v = indeg.get(m)! - 1; indeg.set(m, v); if (v === 0) q.push(m);
    }
  }
  return seen !== nodes.length;
}

export function parseXer(buf: ArrayBuffer | Uint8Array, opts: BuildOptions = {}): Snapshot {
  return buildSnapshot(parseXerText(decodeXer(buf)), opts);
}
