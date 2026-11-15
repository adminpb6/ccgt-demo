import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObjectStats } from '../../store/selectors';
import { Card, Table, type Col } from '../components/ui';
import type { ObjStat } from '../../store/selectors';

export function Objects() {
  const stats = useObjectStats();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const rows = stats.filter((s) => (!q || `${s.code} ${s.name} ${s.owner} ${s.contractor}`.toLowerCase().includes(q.toLowerCase())) && (!onlyDelayed || s.delayed > 0));
  const cols: Col<ObjStat>[] = [
    { key: 'code', head: 'Kod', cell: (r) => r.code, sort: (r) => r.code },
    { key: 'name', head: 'Nazwa', cell: (r) => r.name, sort: (r) => r.name },
    { key: 'owner', head: 'Opiekun', cell: (r) => r.owner, sort: (r) => r.owner },
    { key: 'contractor', head: 'Wykonawca', cell: (r) => r.contractor, sort: (r) => r.contractor },
    { key: 'pct', head: 'Postęp %', cell: (r) => <div className="flex items-center gap-2"><div className="w-20 h-2 bg-slate-200 rounded"><div className="h-2 bg-green-600 rounded" style={{ width: `${r.pct}%` }} /></div>{r.pct}</div>, sort: (r) => r.pct },
    { key: 'inScope', head: 'W zakresie', cell: (r) => r.inScope, sort: (r) => r.inScope },
    { key: 'delayed', head: 'Opóźnione', cell: (r) => r.delayed, sort: (r) => r.delayed },
    { key: 'max', head: 'Maks. opóźnienie (dni rob.)', cell: (r) => r.maxDelay, sort: (r) => r.maxDelay },
  ];
  return (
    <Card title={`Obiekty (${rows.length} z ${stats.length})`}>
      <div className="flex gap-3 mb-3 text-sm items-center">
        <input aria-label="Szukaj" placeholder="Szukaj obiektu, opiekuna, wykonawcy…" className="border rounded px-2 py-1 w-80" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1"><input type="checkbox" checked={onlyDelayed} onChange={(e) => setOnlyDelayed(e.target.checked)} /> tylko z opóźnieniami</label>
      </div>
      <Table rows={rows} cols={cols} rowKey={(r) => r.code} onRow={(r) => nav(`/objects/${r.code}`)} empty="Brak obiektów spełniających filtry" />
    </Card>
  );
}
