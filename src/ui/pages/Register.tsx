import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { can } from '../../domain/permissions';
import { formatPl } from '../../domain/workdays';
import { useMe } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Table, download, inputCls } from '../components/ui';
import { STATUS_PL } from './Monits';

export function Register() {
  const { register, monits, current, appData, exportDelta, decide } = useStore();
  const me = useMe();
  const [obj, setObj] = useState('');
  const [dec, setDec] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [contr, setContr] = useState('');
  const [msg, setMsg] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const pending = monits!.filter((m) => m.status === 'proposed');
  const rows = useMemo(() => register!.filter((r) => {
    const code = r.taskCode.split('-')[0];
    const c = current!.tasks[r.taskCode]?.codes['AC_Wykonawca'] ?? '';
    return (!obj || code === obj) && (!dec || r.decision === dec) && (!contr || c === contr) && (!from || r.decidedAt.slice(0, 10) >= from) && (!to || r.decidedAt.slice(0, 10) <= to);
  }), [register, obj, dec, from, to, contr, current]);
  const toExport = register!.filter((r) => r.decision === 'accepted' && !r.exported).length;
  const doExport = () => {
    const bytes = exportDelta();
    if (!bytes) return setMsg('Brak zaakceptowanych, niewyeksportowanych zmian — plik nie został utworzony.');
    download(`PL5001_SYNTH_delta_export_${current!.dataDate.replace(/-/g, '')}.xer`, bytes);
    setMsg('Wyeksportowano deltę XER (cp1250, CRLF).');
  };
  return (
    <div className="space-y-3">
      <Card title={`Oczekujące na decyzję (${pending.length})`}>
        {!pending.length ? <p className="text-slate-500 italic">Brak propozycji do zatwierdzenia.</p> : (
          <Table rows={pending} rowKey={(m) => m.id} cols={[
            { key: 'task', head: 'Zadanie', cell: (m) => <Link className="underline text-blue-700" to="/monits">{m.taskCode}</Link> },
            { key: 'end', head: 'Nowy koniec', cell: (m) => formatPl(m.proposedEnd ?? '') },
            { key: 'reason', head: 'Powód', cell: (m) => m.reason },
            { key: 'act', head: 'Decyzja', cell: (m) => can(me.role, 'decide') ? (
              <span className="flex gap-1 items-center">
                <input aria-label={`Uzasadnienie ${m.taskCode}`} placeholder="uzasadnienie" className="border rounded px-1 w-36" value={notes[m.id] ?? ''} onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })} />
                <Btn onClick={() => decide(m.id, 'accepted', notes[m.id] ?? '')}>Zatwierdź</Btn>
                <Btn kind="danger" disabled={!notes[m.id]} onClick={() => decide(m.id, 'rejected', notes[m.id] ?? '')}>Odrzuć</Btn>
              </span>) : <Badge tone="amber">{STATUS_PL[m.status]}</Badge> },
          ]} />
        )}
      </Card>
      <Card title={`Rejestr zmian terminów (${rows.length})`}>
        <div className="flex gap-2 flex-wrap mb-3 text-sm items-center">
          <select aria-label="Obiekt" className={inputCls + ' w-48'} value={obj} onChange={(e) => setObj(e.target.value)}><option value="">Wszystkie obiekty</option>{appData!.objects.map((o) => <option key={o.code} value={o.code}>{o.code} {o.name}</option>)}</select>
          <select aria-label="Wykonawca" className={inputCls + ' w-48'} value={contr} onChange={(e) => setContr(e.target.value)}><option value="">Wszyscy wykonawcy</option>{appData!.contractors.map((c) => <option key={c}>{c}</option>)}</select>
          <select aria-label="Decyzja" className={inputCls + ' w-40'} value={dec} onChange={(e) => setDec(e.target.value)}><option value="">Wszystkie decyzje</option><option value="accepted">Zaakceptowane</option><option value="rejected">Odrzucone</option></select>
          <input aria-label="Od" type="date" className={inputCls + ' w-36'} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input aria-label="Do" type="date" className={inputCls + ' w-36'} value={to} onChange={(e) => setTo(e.target.value)} />
          {can(me.role, 'export') && <Btn onClick={doExport}>Eksportuj deltę XER ({toExport})</Btn>}
        </div>
        {msg && <p role="status" className="text-sm text-blue-800 mb-2">{msg}</p>}
        <Table rows={rows} rowKey={(r) => r.id} empty="Rejestr jest pusty — brak decyzji harmonogramisty." cols={[
          { key: 'at', head: 'Data decyzji', cell: (r) => r.decidedAt.slice(0, 16).replace('T', ' ') },
          { key: 'task', head: 'Zadanie', cell: (r) => r.taskCode },
          { key: 'old', head: 'Stary koniec', cell: (r) => formatPl(r.oldEnd) },
          { key: 'new', head: 'Nowy koniec', cell: (r) => formatPl(r.newEnd) },
          { key: 'reason', head: 'Powód', cell: (r) => r.reason },
          { key: 'dec', head: 'Decyzja', cell: (r) => <Badge tone={r.decision === 'accepted' ? 'green' : 'red'}>{r.decision === 'accepted' ? 'zaakceptowano' : 'odrzucono'}</Badge> },
          { key: 'exp', head: 'Wyeksportowano', cell: (r) => (r.exported ? 'tak' : 'nie') },
        ]} />
      </Card>
    </div>
  );
}
