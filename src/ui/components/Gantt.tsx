import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../../domain/types';

export type GRow = { kind: 'wbs'; id: string; depth: number; label: string; open: boolean } | { kind: 'task'; id: string; depth: number; task: Task };

const ROW_H = 26, HEAD_H = 30, LEFT_W = 380;
export const ZOOMS = { tydzień: 22, miesiąc: 6, kwartał: 2 } as const;
export type Zoom = keyof typeof ZOOMS;

const DAY = 86400000;
const day = (s: string) => Date.parse(s.slice(0, 10) + 'T00:00:00Z') / DAY;

interface Props {
  rows: GRow[]; dataDate: string; zoom: Zoom; selected?: string; scope: Set<string>;
  onSelect(code: string): void; onToggleWbs(id: string): void; height?: number;
}

export const Gantt = memo(function Gantt({ rows, dataDate, zoom, selected, scope, onSelect, onToggleWbs, height = 560 }: Props) {
  const px = ZOOMS[zoom];
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [hh, setHh] = useState(height);

  const [min, max] = useMemo(() => {
    let a = Infinity, b = -Infinity;
    for (const r of rows) if (r.kind === 'task') {
      a = Math.min(a, day(r.task.baselineStart), day(r.task.start)); b = Math.max(b, day(r.task.baselineEnd), day(r.task.end));
    }
    if (!isFinite(a)) { a = day(dataDate) - 30; b = day(dataDate) + 90; }
    return [a - 7, b + 14];
  }, [rows, dataDate]);
  const W = (max - min) * px;
  const x = (s: string) => (day(s) - min) * px;

  useEffect(() => { const el = ref.current; if (el) setHh(el.clientHeight); }, [height]);
  // przewiń do daty statusu przy zmianie zoomu/danych
  useEffect(() => { ref.current?.scrollTo({ left: Math.max(0, (day(dataDate) - min) * px - 200) }); }, [px, min, dataDate]);

  const first = Math.max(0, Math.floor(top / ROW_H) - 4);
  const last = Math.min(rows.length, Math.ceil((top + hh) / ROW_H) + 4);
  const index = useMemo(() => new Map(rows.flatMap((r, i) => (r.kind === 'task' ? [[r.task.code, i] as const] : []))), [rows]);

  const sel = selected ? rows[index.get(selected) ?? -1] : undefined;
  const links = useMemo(() => {
    if (!sel || sel.kind !== 'task') return [];
    const out: { from: Task; to: Task }[] = [];
    for (const p of sel.task.preds) { const i = index.get(p.code); if (i != null) out.push({ from: (rows[i] as { task: Task }).task, to: sel.task }); }
    for (const r of rows) if (r.kind === 'task' && r.task.preds.some((p) => p.code === sel.task.code)) out.push({ from: sel.task, to: r.task });
    return out;
  }, [sel, rows, index]);

  const ticks = useMemo(() => {
    const out: { x: number; label: string; major: boolean }[] = [];
    const d0 = new Date(min * DAY);
    const cur = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
    while (+cur / DAY < max) {
      out.push({ x: (+cur / DAY - min) * px, label: `${String(cur.getUTCMonth() + 1).padStart(2, '0')}.${cur.getUTCFullYear()}`, major: cur.getUTCMonth() === 0 });
      cur.setUTCMonth(cur.getUTCMonth() + (zoom === 'kwartał' ? 3 : 1));
    }
    return out;
  }, [min, max, px, zoom]);

  const bodyH = rows.length * ROW_H;
  const sx = x(dataDate);

  return (
    <div ref={ref} onScroll={(e) => setTop(e.currentTarget.scrollTop)} style={{ height }} className="overflow-auto border border-slate-300 bg-white relative" role="region" aria-label="Wykres Gantta" tabIndex={0}>
      <div style={{ width: LEFT_W + W, height: HEAD_H + bodyH, position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 3, height: HEAD_H, display: 'flex' }} className="bg-slate-100 border-b border-slate-300">
          <div style={{ position: 'sticky', left: 0, width: LEFT_W, zIndex: 4 }} className="bg-slate-100 px-2 text-xs font-medium flex items-center border-r border-slate-300">Zadanie</div>
          <svg width={W} height={HEAD_H}>
            {ticks.map((t, i) => <g key={i}><line x1={t.x} x2={t.x} y1={0} y2={HEAD_H} stroke="#cbd5e1" /><text x={t.x + 3} y={19} fontSize={11} fill="#334155">{t.label}</text></g>)}
          </svg>
        </div>
        <div style={{ position: 'sticky', left: 0, width: LEFT_W, zIndex: 2, height: 0 }}>
          {rows.slice(first, last).map((r, k) => {
            const i = first + k;
            const sty = { position: 'absolute' as const, top: i * ROW_H, height: ROW_H, width: LEFT_W, paddingLeft: 6 + r.depth * 14 };
            if (r.kind === 'wbs') return (
              <div key={r.id} style={sty} className="bg-slate-50 border-b border-r border-slate-200 text-xs font-semibold flex items-center cursor-pointer" onClick={() => onToggleWbs(r.id)}>
                <button aria-label={r.open ? 'Zwiń' : 'Rozwiń'} className="mr-1 w-4">{r.open ? '▾' : '▸'}</button><span className="truncate">{r.label}</span>
              </div>
            );
            const t = r.task;
            return (
              <div key={r.id} style={sty} onClick={() => onSelect(t.code)} data-code={t.code}
                className={`bg-white border-b border-r border-slate-100 text-xs flex items-center gap-1 cursor-pointer hover:bg-blue-50 ${selected === t.code ? 'bg-blue-100' : ''}`}>
                {scope.has(t.code) && <span title="W zakresie" className="text-blue-700">●</span>}
                <span className="text-slate-500 shrink-0">{t.code}</span><span className="truncate">{t.name}</span>
              </div>
            );
          })}
        </div>
        <svg width={W} height={bodyH} style={{ position: 'absolute', left: LEFT_W, top: HEAD_H }}>
          {ticks.map((t, i) => <line key={i} x1={t.x} x2={t.x} y1={0} y2={bodyH} stroke="#f1f5f9" />)}
          <line x1={sx} x2={sx} y1={0} y2={bodyH} stroke="#dc2626" strokeDasharray="4 3" />
          {rows.slice(first, last).map((r, k) => {
            if (r.kind !== 'task') return null;
            const i = first + k, y = i * ROW_H, t = r.task;
            const bx = x(t.baselineStart), bw = Math.max(2, x(t.baselineEnd) - bx);
            const fx = x(t.start), fw = Math.max(2, x(t.end) - fx);
            const late = day(t.end) > day(t.baselineEnd);
            const fill = t.status === 'TK_Complete' ? '#16a34a' : late ? '#dc2626' : '#2563eb';
            if (t.type !== 'TT_Task') {
              const cx = x(t.end);
              return <polygon key={r.id} points={`${cx},${y + 4} ${cx + 8},${y + 13} ${cx},${y + 22} ${cx - 8},${y + 13}`} fill="#f59e0b" stroke="#92400e" onClick={() => onSelect(t.code)} style={{ cursor: 'pointer' }}><title>{t.name}</title></polygon>;
            }
            return (
              <g key={r.id} onClick={() => onSelect(t.code)} style={{ cursor: 'pointer' }}>
                <rect x={bx} y={y + 18} width={bw} height={4} fill="#94a3b8"><title>Linia bazowa</title></rect>
                <rect x={fx} y={y + 5} width={fw} height={12} rx={2} fill={fill} stroke={selected === t.code ? '#0f172a' : 'none'} strokeWidth={2}><title>{`${t.name}: ${t.start.slice(0, 10)} → ${t.end.slice(0, 10)}`}</title></rect>
                {t.status === 'TK_Active' && <rect x={fx} y={y + 5} width={fw * (t.pctComplete / 100)} height={12} rx={2} fill="#1e3a8a" />}
              </g>
            );
          })}
          {links.map((l, i) => {
            const a = index.get(l.from.code)!, b = index.get(l.to.code)!;
            const ax = x(l.from.end), ay = a * ROW_H + 11, bx = x(l.to.start), by = b * ROW_H + 11;
            return <polyline key={i} points={`${ax},${ay} ${ax + 6},${ay} ${ax + 6},${by} ${bx},${by}`} fill="none" stroke="#7c3aed" strokeWidth={1.5} markerEnd="url(#arr)" />;
          })}
          <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#7c3aed" /></marker></defs>
        </svg>
      </div>
    </div>
  );
});
