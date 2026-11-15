import { NavLink, Outlet } from 'react-router-dom';
import { ROLE_LABEL } from '../../domain/permissions';
import { useMe } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Banner } from './Banner';

const NAV = [
  ['/', 'Pulpit'], ['/objects', 'Obiekty'], ['/monits', 'Monity'], ['/register', 'Rejestr'],
  ['/delays', 'Opóźnienia'], ['/purchasing', 'Zakupy'], ['/team', 'Zespół'], ['/import', 'Import'],
] as const;

export function Layout() {
  const { ready, error, appData, userId, setUser } = useStore();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Banner />
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-2 flex items-center gap-4 flex-wrap">
          <span className="font-semibold">CCGT „Zatoka”</span>
          <nav aria-label="Główna nawigacja" className="flex gap-1 flex-wrap">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => `px-3 py-1 rounded text-sm ${isActive ? 'bg-white text-slate-900' : 'hover:bg-slate-700'}`}>{label}</NavLink>
            ))}
          </nav>
          {ready && appData && (
            <label className="ml-auto text-sm flex items-center gap-2">Rola:
              <select aria-label="Przełącznik roli" className="text-slate-900 rounded px-2 py-1" value={userId} onChange={(e) => setUser(e.target.value)}>
                {appData.users.map((u) => <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>)}
              </select>
            </label>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-4">
        {!ready ? <p role="status">Ładowanie harmonogramu…</p>
          : error ? <p role="alert" className="text-red-700">Błąd: {error}</p>
          : <Outlet />}
      </main>
    </div>
  );
}

export function RoleLine() {
  const me = useMe();
  return <p className="text-sm text-slate-600">Zalogowano jako <b>{me.name}</b> ({ROLE_LABEL[me.role]})</p>;
}
