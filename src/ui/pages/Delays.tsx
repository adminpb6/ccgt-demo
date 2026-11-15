import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObjectStats, type ObjStat } from '../../store/selectors';
import { Btn, Card, Table } from '../components/ui';

type View = 'object' | 'owner' | 'contractor';

export function Delays() {
  const stats = useObjectStats();
  const nav = useNavigate();
  const [view, setView] = useState<View>('object');
  const groups = useMemo(() => {
    if (view === 'object') return stats.map((s) => ({ key: s.code, label: `${s.code} ${s.name}`, delayed: s.delayed, max: s.maxDelay, critical: s.critical, to: `/objects/${s.code}` }));
    const m = new Map<string, { key: string; label: string; delayed: number; max: number; critical: number; to?: string }>();
    for (const s of stats as ObjStat[]) {
      const k = view === 'owner' ? s.owner : s.contractor;
      const g = m.get(k) ?? { key: k, label: k, delayed: 0, max: 0, critical: 0 };
      g.delayed += s.delayed; g.max = Math.max(g.max, s.maxDelay); g.critical += s.critical; m.set(k, g);
    }
    return [...m.values()];
  }, [stats, view]);
  const top = [...groups].sort((a, b) => b.max - a.max).slice(0, 10);
  const mx = Math.max(1, ...top.map((t) => t.max));
  return (
    <div className="space-y-3">
      <Card title="Ranking opóźnień">
        <div className="flex gap-2 mb-3">
          {([['object', 'Obiekty'], ['owner', 'Opiekunowie'], ['contractor', 'Wykonawcy']] as const).map(([v, l]) => <Btn key={v} kind={v === view ? 'primary' : 'ghost'} onClick={() => setView(v)}>{l}</Btn>)}
        </div>
        <Table rows={groups} rowKey={(g) => g.key} initialSort={['max', -1]} onRow={(g) => g.to && nav(g.to)} cols={[
          { key: 'label', head: 'Nazwa', cell: (g) => g.label, sort: (g) => g.label },
          { key: 'delayed', head: 'Opóźnione zadania', cell: (g) => g.delayed, sort: (g) => g.delayed },
          { key: 'max', head: 'Maks. opóźnienie (dni rob.)', cell: (g) => g.max, sort: (g) => g.max },
          { key: 'crit', head: 'Krytyczne (luz ≤ 0)', cell: (g) => g.critical, sort: (g) => g.critical },
        ]} />
      </Card>
      <Card title="Top 10 wg maksymalnego opóźnienia">
        <svg role="img" aria-label="Wykres słupkowy top 10" width="100%" height={top.length * 24 + 4} viewBox={`0 0 800 ${top.length * 24 + 4}`}>
          {top.map((t, i) => (
            <g key={t.key} transform={`translate(0 ${i * 24})`}>
              <text x={0} y={16} fontSize={12}>{t.label.slice(0, 34)}</text>
              <rect x={260} y={4} width={(t.max / mx) * 480} height={16} fill="#dc2626" rx={2} />
              <text x={266 + (t.max / mx) * 480} y={16} fontSize={12}>{t.max}</text>
            </g>
          ))}
        </svg>
      </Card>
    </div>
  );
}
