import { Link } from 'react-router-dom';
import { currentStep } from '../../domain/purchasing';
import { ROLE_LABEL } from '../../domain/permissions';
import { formatPl } from '../../domain/workdays';
import { useMe, useObjectStats } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Badge, Card, Empty } from '../components/ui';

const Kpi = ({ label, value, to }: { label: string; value: number | string; to?: string }) => {
  const inner = <div className="text-center"><div className="text-3xl font-semibold">{value}</div><div className="text-sm text-slate-600">{label}</div></div>;
  return <Card>{to ? <Link to={to}>{inner}</Link> : inner}</Card>;
};

export function Dashboard() {
  const { monits, current, scope, purchasing, notices, register } = useStore();
  const me = useMe();
  const stats = useObjectStats();
  const mine = new Set(me.objects ?? []);
  const myMonits = monits!.filter((m) => m.ownerId === me.id && m.status !== 'closed');
  const open = monits!.filter((m) => m.status !== 'closed' && m.status !== 'accepted');
  const proposed = monits!.filter((m) => m.status === 'proposed');
  const sc = new Set(scope);
  const dd = current!.dataDate;
  const weekEnd = new Date(Date.parse(dd) + 7 * 86400000).toISOString().slice(0, 10);
  const myWeek = Object.values(current!.tasks).filter((t) => mine.has(t.objectCode) && sc.has(t.code) && t.status !== 'TK_Complete' && t.start.slice(0, 10) <= weekEnd).slice(0, 8);
  const myMiles = Object.values(current!.tasks).filter((t) => mine.has(t.objectCode) && t.type !== 'TT_Task' && t.status !== 'TK_Complete').sort((a, b) => a.end.localeCompare(b.end)).slice(0, 3);
  const top5 = [...stats].sort((a, b) => b.maxDelay - a.maxDelay).slice(0, 5);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Pulpit — {ROLE_LABEL[me.role]}</h1>
      <p className="text-sm text-slate-600">{me.name} · harmonogram {current!.revision}, data statusu {formatPl(dd)}</p>

      {me.role === 'owner' && (
        <div className="grid grid-cols-2 gap-3">
          <Card title={`Mój dzień — otwarte monity (${myMonits.length})`}>
            {!myMonits.length ? <Empty>Brak otwartych monitów.</Empty> : (
              <ul className="text-sm space-y-1">{myMonits.slice(0, 8).map((m) => <li key={m.id}><Link className="underline text-blue-700" to="/monits">{m.taskCode}</Link> <Badge tone="red">{m.status}</Badge> {current!.tasks[m.taskCode]?.name}</li>)}</ul>
            )}
            <Link className="text-sm underline text-blue-700 mt-2 inline-block" to="/monits">Wszystkie monity →</Link>
          </Card>
          <Card title="Zadania w tym tygodniu">{!myWeek.length ? <Empty>Brak zadań w zakresie na ten tydzień.</Empty> : <ul className="text-sm">{myWeek.map((t) => <li key={t.code}>{t.code} · {t.name}</li>)}</ul>}</Card>
          <Card title="Najbliższe kamienie milowe">{!myMiles.length ? <Empty>Brak.</Empty> : <ul className="text-sm">{myMiles.map((t) => <li key={t.code}>{formatPl(t.end)} · {t.name}</li>)}</ul>}</Card>
        </div>
      )}

      {me.role === 'planner' && (
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Propozycje do akceptacji" value={proposed.length} to="/register" />
          <Kpi label="Otwarte monity" value={open.length} to="/monits" />
          <Kpi label="Do wyeksportowania" value={register!.filter((r) => r.decision === 'accepted' && !r.exported).length} to="/register" />
          <Card title="Nowe / usunięte w zakresie" className="col-span-3">
            {!notices!.filter((n) => n.kind === 'added' || n.kind === 'removed').length ? <Empty>Brak powiadomień z importu.</Empty> :
              <ul className="text-sm">{notices!.filter((n) => n.kind !== 'info-left').slice(-10).map((n) => <li key={n.id}>{n.taskCode} — {n.text}</li>)}</ul>}
          </Card>
        </div>
      )}

      {(me.role === 'director' || me.role === 'admin' || me.role === 'manager') && (
        <div className="grid grid-cols-4 gap-3">
          <Kpi label="Obiektów" value={stats.length} to="/objects" />
          <Kpi label="Zadań w zakresie" value={scope!.length} />
          <Kpi label="Otwarte monity" value={open.length} to="/monits" />
          <Kpi label="Obiekty z opóźnieniami" value={stats.filter((s) => s.delayed > 0).length} to="/delays" />
          <Card title="Top 5 opóźnień" className="col-span-4">
            <ul className="text-sm">{top5.map((s) => <li key={s.code}><Link className="underline text-blue-700" to={`/objects/${s.code}`}>{s.code} {s.name}</Link> — maks. {s.maxDelay} dni rob., opóźnione: {s.delayed}</li>)}</ul>
          </Card>
        </div>
      )}

      {me.role === 'purchaser' && (
        <Card title="Pozycje w ścieżce zakupowej">
          <ul className="text-sm">{purchasing!.filter((p) => currentStep(p) < 7).slice(0, 10).map((p) => <li key={p.id}>{p.objectCode} · krok {currentStep(p) + 1}/7: {p.steps[currentStep(p)].name} (plan {formatPl(p.steps[currentStep(p)].planned)})</li>)}</ul>
          <Link className="text-sm underline text-blue-700" to="/purchasing">Cała ścieżka →</Link>
        </Card>
      )}
    </div>
  );
}
