import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { Card, Table } from '../components/ui';

export function Team() {
  const { appData, monits, current, scope } = useStore();
  const nav = useNavigate();
  const sc = new Set(scope);
  const owners = appData!.users.filter((u) => u.role === 'owner');
  const rows = owners.map((u) => {
    const mine = monits!.filter((m) => m.ownerId === u.id);
    const open = mine.filter((m) => m.status === 'new' || m.status === 'negotiating' || m.status === 'rejected').length;
    const answered = mine.filter((m) => m.status !== 'new').length;
    const week = Object.values(current!.tasks).filter((t) => u.objects?.includes(t.objectCode) && sc.has(t.code) && t.status !== 'TK_Complete' && t.start.slice(0, 10) <= addDays(current!.dataDate, 7)).length;
    return { id: u.id, name: u.name, objects: u.objects?.length ?? 0, week, open, resp: mine.length ? Math.round((answered / mine.length) * 100) : 100 };
  });
  return (
    <Card title="Postęp zespołu">
      <Table rows={rows} rowKey={(r) => r.id} onRow={() => nav('/monits')} cols={[
        { key: 'n', head: 'Opiekun', cell: (r) => r.name, sort: (r) => r.name },
        { key: 'o', head: 'Obiekty', cell: (r) => r.objects, sort: (r) => r.objects },
        { key: 'w', head: 'Zadania w tygodniu (zakres)', cell: (r) => r.week, sort: (r) => r.week },
        { key: 'm', head: 'Otwarte monity', cell: (r) => r.open, sort: (r) => r.open },
        { key: 'r', head: 'Terminowość odpowiedzi %', cell: (r) => r.resp, sort: (r) => r.resp },
      ]} />
    </Card>
  );
}
function addDays(d: string, n: number) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
