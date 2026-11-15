import { create } from 'zustand';
import type { AppData } from '../domain/appdata';
import { ownerUserId } from '../domain/appdata';
import { diffSnapshots, type DiffResult } from '../domain/diff';
import type { UpdateRow } from '../domain/excel';
import { applyShifts, closeForRemoved, transition, type Notice } from '../domain/monits';
import { seedPurchasing, type PurchItem } from '../domain/purchasing';
import { matchesRule, selectByRule } from '../domain/scope';
import { DEFAULT_CONFIG, type AppConfig, type Monit, type RegisterEntry, type ShiftEvent, type Snapshot } from '../domain/types';
import { parseInWorker } from '../xer/client';
import { writeDelta } from '../xer/write';
import { clearState, loadState, saveState } from './db';

const BASE = import.meta.env.BASE_URL;
const G_FILE = 'PL5001_SYNTH_schedule_Rev0G_DD30092026.xer';
export const BUILTIN = [
  { revision: 'Rev0G', file: G_FILE, label: 'Rev0G (DD 30.09.2026)' },
  { revision: 'Rev0H', file: 'PL5001_SYNTH_schedule_Rev0H_DD07102026.xer', label: 'Rev0H (DD 07.10.2026)' },
];

interface Persisted {
  current: Snapshot; previous: Snapshot | null; scope: string[]; config: AppConfig;
  shifts: ShiftEvent[]; monits: Monit[]; register: RegisterEntry[]; notices: Notice[]; purchasing: PurchItem[];
  userId: string; appData: AppData; importLog: { at: string; revision: string; summary: string }[];
}

export interface ImportPreview { snapshot: Snapshot; diff: DiffResult; added: string[]; scopeSize: number }

interface State extends Partial<Persisted> {
  ready: boolean; error?: string; busy?: string;
  init(): Promise<void>;
  setUser(id: string): void;
  setConfig(c: Partial<AppConfig>): void;
  setScope(codes: string[]): void;
  toggleScope(code: string, on: boolean): void;
  selectByRule(): void;
  previewImport(snap: Snapshot): ImportPreview;
  applyImport(snap: Snapshot): void;
  loadBuiltin(file: string, revision: string): Promise<Snapshot>;
  parseFile(buf: ArrayBuffer, revision: string): Promise<Snapshot>;
  applyExcel(rows: UpdateRow[], label: string): { matched: number; unmatched: string[] };
  confirmContact(id: string): void;
  propose(id: string, p: { proposedStart?: string; proposedEnd: string; reason: string; contractor: string; comment: string }): void;
  decide(id: string, decision: 'accepted' | 'rejected', note: string): void;
  exportDelta(): Uint8Array | null;
  updateTaskPct(code: string, pct: number, comment: string): void;
  reassignObject(objectCode: string, userId: string): void;
  advancePurchasing(itemId: string, stepIdx: number): void;
  reset(): Promise<void>;
}

const now = () => new Date().toISOString();
const PERSIST_KEYS: (keyof Persisted)[] = ['current', 'previous', 'scope', 'config', 'shifts', 'monits', 'register', 'notices', 'purchasing', 'userId', 'importLog', 'appData'];

async function fetchApp(): Promise<AppData> { return (await fetch(`${BASE}data/app-data.json`)).json(); }
async function fetchXer(file: string): Promise<ArrayBuffer> {
  const r = await fetch(`${BASE}data/${file}`);
  if (!r.ok) throw new Error(`Nie można pobrać ${file}`);
  return r.arrayBuffer();
}

export const useStore = create<State>((set, get) => {
  const patch = (p: Partial<Persisted>) => set(p as Partial<State>);
  return {
    ready: false,
    async init() {
      try {
        const appData = await fetchApp();
        const saved = await loadState<Persisted>();
        if (saved?.current) { set({ ...saved, appData: saved.appData ?? appData, ready: true }); return; }
        const snap = await parseInWorker(await fetchXer(G_FILE), 'Rev0G');
        const config = DEFAULT_CONFIG;
        set({
          appData, current: snap, previous: null, config, scope: selectByRule(snap, config.scopeRule),
          shifts: [], monits: [], register: [], notices: [], importLog: [{ at: now(), revision: 'Rev0G', summary: 'Dane startowe' }],
          purchasing: seedPurchasing(appData, snap.dataDate), userId: 'u-plan', ready: true,
        });
      } catch (e) { set({ error: (e as Error).message, ready: true }); }
    },
    setUser: (userId) => patch({ userId }),
    setConfig: (c) => patch({ config: { ...get().config!, ...c } }),
    setScope: (scope) => patch({ scope: [...new Set(scope)] }),
    toggleScope(code, on) {
      const s = new Set(get().scope);
      on ? s.add(code) : s.delete(code);
      patch({ scope: [...s] });
    },
    selectByRule() {
      const { current, config, scope } = get();
      patch({ scope: [...new Set([...(scope ?? []), ...selectByRule(current!, config!.scopeRule)])] });
    },
    previewImport(snapshot) {
      const { current, scope, config } = get();
      const sc = new Set(scope);
      const diff = diffSnapshots(current!, snapshot, sc, config!.shiftThresholdWd);
      const added = Object.values(snapshot.tasks).filter((t) => !current!.tasks[t.code] && matchesRule(t, config!.scopeRule)).map((t) => t.code);
      return { snapshot, diff, added, scopeSize: sc.size };
    },
    applyImport(snapshot) {
      const st = get();
      const at = now();
      const pv = get().previewImport(snapshot);
      const shifts: ShiftEvent[] = pv.diff.shifts.map((s) => ({ ...s, id: `${snapshot.id}:${s.taskCode}`, snapshotId: snapshot.id }));
      const ownerOf = (code: string) => ownerUserId(st.appData!, snapshot.tasks[code]?.objectCode ?? '');
      let { monits, notices } = applyShifts(st.monits ?? [], shifts, ownerOf, at);
      monits = closeForRemoved(monits, pv.diff.removed, at);
      const extra: Notice[] = [
        ...pv.added.map((c) => ({ id: `a:${snapshot.id}:${c}`, kind: 'added' as const, taskCode: c, at, snapshotId: snapshot.id, text: 'Nowe zadanie w zakresie' })),
        ...pv.diff.removed.map((c) => ({ id: `r:${snapshot.id}:${c}`, kind: 'removed' as const, taskCode: c, at, snapshotId: snapshot.id, text: 'Usunięte z harmonogramu' })),
      ];
      patch({
        previous: st.current!, current: snapshot, shifts, monits,
        notices: [...(st.notices ?? []), ...notices, ...extra],
        scope: [...new Set([...(st.scope ?? []).filter((c) => snapshot.tasks[c]), ...pv.added])],
        importLog: [...(st.importLog ?? []), { at, revision: snapshot.revision, summary: `${shifts.length} przesunięć, ${pv.added.length} nowych, ${pv.diff.removed.length} usuniętych` }],
      });
    },
    async loadBuiltin(file, revision) { return parseInWorker(await fetchXer(file), revision); },
    parseFile: (buf, revision) => parseInWorker(buf, revision),
    applyExcel(rows, label) {
      const cur = get().current!;
      const tasks = { ...cur.tasks };
      const unmatched: string[] = [];
      let matched = 0;
      for (const r of rows) {
        const t = tasks[r.taskCode];
        if (!t) { unmatched.push(r.taskCode); continue; }
        matched++;
        const time = (d: string, tt: string) => `${d} ${tt}`;
        tasks[r.taskCode] = { ...t, end: time(r.newEnd, '15:00'), start: r.newStart ? time(r.newStart, '07:00') : t.start };
      }
      const snap: Snapshot = { ...cur, id: `${label}`, revision: label, importedAt: now(), tasks, warnings: [] };
      get().applyImport(snap);
      return { matched, unmatched };
    },
    confirmContact(id) {
      patch({ monits: get().monits!.map((m) => (m.id === id ? transition(m, 'negotiating', get().userId!, now()) : m)) });
    },
    propose(id, p) {
      patch({ monits: get().monits!.map((m) => (m.id === id ? { ...transition(m, 'proposed', get().userId!, now(), p.reason), ...p } : m)) });
    },
    decide(id, decision, note) {
      const st = get();
      const m = st.monits!.find((x) => x.id === id)!;
      const t = st.current!.tasks[m.taskCode];
      const shift = st.shifts!.find((s) => s.id === m.shiftId);
      const at = now();
      const entry: RegisterEntry = {
        id: `r:${id}:${at}`, taskCode: m.taskCode, oldEnd: shift?.fromEnd ?? t.end.slice(0, 10), newEnd: m.proposedEnd ?? t.end.slice(0, 10),
        reason: note || m.reason || '', decision, decidedBy: st.userId!, decidedAt: at, exported: false,
        newStart: m.proposedStart ? `${m.proposedStart} 07:00` : t.start,
      };
      let next = transition(m, decision === 'accepted' ? 'accepted' : 'rejected', st.userId!, at, note);
      if (decision === 'rejected') next = transition(next, 'negotiating', 'system', at, 'wrócił do opiekuna');
      patch({ register: [...st.register!, entry], monits: st.monits!.map((x) => (x.id === id ? next : x)) });
    },
    exportDelta() {
      const st = get();
      const pend = st.register!.filter((r) => r.decision === 'accepted' && !r.exported);
      if (!pend.length) return null;
      const bytes = writeDelta(st.current!, pend.map((r) => ({ code: r.taskCode, cstrDate: r.newStart ?? st.current!.tasks[r.taskCode].start })), st.config!.deltaConstraintType);
      const ids = new Set(pend.map((r) => r.id));
      const codes = new Set(pend.map((r) => r.taskCode));
      const at = now();
      patch({
        register: st.register!.map((r) => (ids.has(r.id) ? { ...r, exported: true } : r)),
        monits: st.monits!.map((m) => (codes.has(m.taskCode) && m.status === 'accepted' ? transition(m, 'closed', 'system', at, 'wyeksportowano deltę') : m)),
      });
      return bytes;
    },
    updateTaskPct(code, pct, comment) {
      const cur = get().current!;
      const t = cur.tasks[code];
      patch({
        current: { ...cur, tasks: { ...cur.tasks, [code]: { ...t, pctComplete: pct } } },
        notices: [...get().notices!, { id: `u:${code}:${now()}`, kind: 'info-left', taskCode: code, at: now(), snapshotId: cur.id, text: `Aktualizacja: ${pct}% — ${comment || 'bez komentarza'}` }],
      });
    },
    reassignObject(objectCode, userId) {
      const app = get().appData!;
      patch({});
      set({ appData: { ...app, users: app.users.map((u) => ({ ...u, objects: u.objects?.filter((o) => o !== objectCode) ?? undefined })).map((u) => (u.id === userId ? { ...u, objects: [...(u.objects ?? []), objectCode] } : u)) } });
    },
    advancePurchasing(itemId, stepIdx) {
      patch({
        purchasing: get().purchasing!.map((it) => (it.id !== itemId ? it : {
          ...it, steps: it.steps.map((s, i) => (i === stepIdx ? { ...s, done: s.done ? undefined : get().current!.dataDate } : s)),
        })),
      });
    },
    async reset() {
      await clearState();
      set({ ready: false, current: undefined });
      await get().init();
    },
  };
});

let timer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  const s = useStore.getState();
  if (!s.ready || !s.current) return;
  const out: Record<string, unknown> = {};
  for (const k of PERSIST_KEYS) out[k] = s[k];
  void saveState(out);
}
useStore.subscribe(() => { clearTimeout(timer); timer = setTimeout(flush, 60); });
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
