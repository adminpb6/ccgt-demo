import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cumulativeDelay } from '../../domain/diff';
import { can } from '../../domain/permissions';
import type { Task } from '../../domain/types';
import { formatPl } from '../../domain/workdays';
import { useMe } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Gantt, ZOOMS, type GRow, type Zoom } from '../components/Gantt';
import { Badge, Btn, Card, Empty } from '../components/ui';
import { UpdateTaskModal } from './UpdateTask';

export function ObjectGantt() {
  const { code = '' } = useParams();
  const { current, appData, scope, toggleScope, monits } = useStore();
  const me = useMe();
  const [zoom, setZoom] = useState<Zoom>('miesiąc');
  const [sel, setSel] = useState<string>();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'update' | undefined>();
  const [onlyScope, setOnlyScope] = useState(false);
  const scopeSet = useMemo(() => new Set(scope), [scope]);
  const obj = appData!.objects.find((o) => o.code === code);

  const tasks = useMemo(() => Object.values(current!.tasks).filter((t) => t.objectCode === code && (!onlyScope || scopeSet.has(t.code))), [current, code, onlyScope, scopeSet]);

  const rows = useMemo<GRow[]>(() => {
    const wbs = current!.wbs;
    const chain = (id: string) => { const c: string[] = []; for (let n = wbs[id]; n; n = wbs[n.parentId]) c.unshift(n.id); return c; };
    const byWbs = new Map<string, Task[]>();
    for (const t of tasks) (byWbs.get(t.wbsId) ?? byWbs.set(t.wbsId, []).get(t.wbsId)!).push(t);
    const paths = [...byWbs.keys()].map(chain);
    let cut = 0;
    while (paths.length && paths.every((p) => p.length > cut + 1 && p[cut] === paths[0][cut])) cut++;
    // drzewo
    const tree = new Map<string, { children: Set<string>; tasks: Task[] }>();
    const node = (id: string) => tree.get(id) ?? tree.set(id, { children: new Set(), tasks: [] }).get(id)!;
    const roots = new Set<string>();
    for (const [wid, ts] of byWbs) {
      const p = chain(wid).slice(cut);
      p.forEach((id, i) => { node(id); i === 0 ? roots.add(id) : node(p[i - 1]).children.add(id); });
      node(wid).tasks.push(...ts);
    }
    const out: GRow[] = [];
    const walk = (id: string, depth: number) => {
      const n = node(id), open = !closed.has(id);
      out.push({ kind: 'wbs', id: 'w' + id, depth, label: wbs[id]?.name ?? id, open });
      if (!open) return;
      [...n.children].forEach((c) => walk(c, depth + 1));
      n.tasks.sort((a, b) => a.start.localeCompare(b.start)).forEach((t) => out.push({ kind: 'task', id: t.code, depth: depth + 1, task: t }));
    };
    [...roots].forEach((r) => walk(r, 0));
    return out;
  }, [current, tasks, closed]);

  if (!obj) return <Empty>Nie znaleziono obiektu {code}. <Link className="underline" to="/objects">Wróć do listy</Link></Empty>;
  const t = sel ? current!.tasks[sel] : undefined;
  const openMonit = t && monits!.find((m) => m.taskCode === t.code && m.status !== 'closed');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/objects" className="text-blue-700 underline text-sm">← Obiekty</Link>
        <h1 className="text-xl font-semibold">{obj.code} {obj.name}</h1>
        <Badge>{obj.contractor}</Badge><Badge tone="blue">{tasks.length} zadań</Badge>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={onlyScope} onChange={(e) => setOnlyScope(e.target.checked)} /> tylko zakres</label>
          {(Object.keys(ZOOMS) as Zoom[]).map((z) => <Btn key={z} kind={z === zoom ? 'primary' : 'ghost'} onClick={() => setZoom(z)}>{z}</Btn>)}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-3">
        {rows.length ? <Gantt rows={rows} dataDate={current!.dataDate} zoom={zoom} selected={sel} scope={scopeSet} onSelect={setSel}
          onToggleWbs={(id) => setClosed((c) => { const n = new Set(c); const k = id.slice(1); n.has(k) ? n.delete(k) : n.add(k); return n; })} />
          : <Empty>Brak zadań do wyświetlenia (włączony filtr zakresu?)</Empty>}
        <Card title={t ? t.code : 'Szczegóły zadania'}>
          {!t ? <Empty>Kliknij zadanie na wykresie</Empty> : (
            <div className="text-sm space-y-1">
              <p className="font-medium">{t.name}</p>
              <p>Status: <Badge tone={t.status === 'TK_Complete' ? 'green' : t.status === 'TK_Active' ? 'blue' : 'slate'}>{t.status.replace('TK_', '')}</Badge> · {t.pctComplete}%</p>
              <p>Baza: {formatPl(t.baselineStart)} – {formatPl(t.baselineEnd)}</p>
              <p>Prognoza: {formatPl(t.start)} – {formatPl(t.end)}</p>
              <p>Opóźnienie skumulowane: <b>{cumulativeDelay(t)}</b> dni rob. · luz {t.floatDays.toFixed(1)} d</p>
              <p>Wykonawca: {t.codes['AC_Wykonawca'] ?? '—'}</p>
              <p>Poprzednicy: {t.preds.length ? t.preds.map((p) => `${p.code} (${p.type.replace('PR_', '')}${p.lagDays ? ` ${p.lagDays}d` : ''})`).join(', ') : '—'}</p>
              <label className="flex items-center gap-2 pt-1"><input type="checkbox" disabled={!can(me.role, 'editScope')} checked={scopeSet.has(t.code)} onChange={(e) => toggleScope(t.code, e.target.checked)} /> W zakresie</label>
              <div className="flex gap-2 pt-2 flex-wrap">
                {openMonit && <Link to="/monits" className="underline text-blue-700">Otwarty monit ({openMonit.status})</Link>}
                <Btn onClick={() => setModal('update')}>Zgłoś zmianę / przekaż</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
      {modal && t && <UpdateTaskModal task={t} onClose={() => setModal(undefined)} />}
    </div>
  );
}
