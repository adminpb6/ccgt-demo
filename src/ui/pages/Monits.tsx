import { useState } from 'react';
import { Link } from 'react-router-dom';
import { can } from '../../domain/permissions';
import type { Monit, MonitStatus } from '../../domain/types';
import { formatPl } from '../../domain/workdays';
import { useMe } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Empty, Field, inputCls } from '../components/ui';

export const STATUS_PL: Record<MonitStatus, string> = {
  new: 'Nowy', negotiating: 'Negocjacje', proposed: 'Zaproponowany', accepted: 'Zaakceptowany', rejected: 'Odrzucony', closed: 'Zamknięty',
};
const TONE: Record<MonitStatus, 'red' | 'amber' | 'blue' | 'green' | 'slate'> = { new: 'red', negotiating: 'amber', proposed: 'blue', accepted: 'green', rejected: 'red', closed: 'slate' };

export function useVisibleMonits(): Monit[] {
  const { monits, appData } = useStore();
  const me = useMe();
  if (me.role === 'owner' || me.role === 'manager') {
    const mine = new Set(me.objects ?? []);
    return monits!.filter((m) => m.ownerId === me.id || mine.has(m.taskCode.split('-')[0]));
  }
  void appData;
  return monits!;
}

export function Monits() {
  const all = useVisibleMonits();
  const [filter, setFilter] = useState<MonitStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string>();
  const list = all.filter((m) => filter === 'all' || m.status === filter);
  const opened = all.find((m) => m.id === openId);
  return (
    <div className="grid grid-cols-[420px_1fr] gap-3">
      <Card title={`Monity (${list.length})`}>
        <select aria-label="Filtr statusu" className={inputCls + ' mb-2'} value={filter} onChange={(e) => setFilter(e.target.value as MonitStatus | 'all')}>
          <option value="all">Wszystkie statusy</option>{(Object.keys(STATUS_PL) as MonitStatus[]).map((s) => <option key={s} value={s}>{STATUS_PL[s]}</option>)}
        </select>
        {!list.length ? <Empty>Brak monitów. Wgraj nowy harmonogram w zakładce Import.</Empty> : (
          <ul className="divide-y max-h-[70vh] overflow-auto">
            {list.map((m) => <li key={m.id}><button onClick={() => setOpenId(m.id)} className={`w-full text-left py-2 px-1 hover:bg-blue-50 ${m.id === openId ? 'bg-blue-100' : ''}`}>
              <span className="font-medium">{m.taskCode}</span> <Badge tone={TONE[m.status]}>{STATUS_PL[m.status]}</Badge>
            </button></li>)}
          </ul>
        )}
      </Card>
      {opened ? <MonitCard m={opened} /> : <Card><Empty>Wybierz monit z listy</Empty></Card>}
    </div>
  );
}

function MonitCard({ m }: { m: Monit }) {
  const { current, shifts, appData, confirmContact, propose, decide } = useStore();
  const me = useMe();
  const t = current!.tasks[m.taskCode];
  const s = shifts!.find((x) => x.id === m.shiftId);
  const obj = appData!.objects.find((o) => o.code === t?.objectCode);
  const mine = can(me.role, 'propose') && (me.role === 'admin' || (me.objects ?? []).includes(t?.objectCode ?? '') || m.ownerId === me.id);
  const [end, setEnd] = useState(m.proposedEnd ?? s?.toEnd ?? '');
  const [start, setStart] = useState(m.proposedStart ?? '');
  const [reason, setReason] = useState(m.reason ?? '');
  const [contractor, setContractor] = useState(m.contractor ?? obj?.contractor ?? '');
  const [comment, setComment] = useState(m.comment ?? '');
  const [note, setNote] = useState('');
  if (!t) return <Card><Empty>Zadanie nie istnieje w bieżącym harmonogramie.</Empty></Card>;
  return (
    <Card title={`${m.taskCode} — ${t.name}`}>
      <div className="grid grid-cols-2 gap-x-6 text-sm mb-3">
        <p>Obiekt: <Link className="underline text-blue-700" to={`/objects/${t.objectCode}`}>{t.objectCode} {obj?.name}</Link></p>
        <p>Status: <Badge tone={TONE[m.status]}>{STATUS_PL[m.status]}</Badge></p>
        <p>Stary termin końca: <b>{formatPl(s?.fromEnd ?? '')}</b></p>
        <p>Nowy (z harmonogramu): <b>{formatPl(s?.toEnd ?? t.end)}</b> {s && <Badge tone="red">+{s.deltaWd} dni rob.</Badge>}</p>
        <p>Wykonawca: {t.codes['AC_Wykonawca'] ?? '—'}</p><p>Opiekun: {appData!.users.find((u) => u.id === m.ownerId)?.name ?? '—'}</p>
      </div>
      {m.status === 'new' && mine && <Btn onClick={() => confirmContact(m.id)}>Potwierdź kontakt z wykonawcą</Btn>}
      {m.status === 'negotiating' && mine && (
        <form className="border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (end && reason) propose(m.id, { proposedStart: start || undefined, proposedEnd: end, reason, contractor, comment }); }}>
          <h3 className="font-medium mb-2">Propozycja nowego terminu</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nowy termin końca"><input required type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            <Field label="Nowy termin startu (opcjonalnie)"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          </div>
          <Field label="Powód"><input required className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Field label="Wykonawca"><input className={inputCls} value={contractor} onChange={(e) => setContractor(e.target.value)} /></Field>
          <Field label="Komentarz"><textarea className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <Btn type="submit">Wyślij propozycję</Btn>
        </form>
      )}
      {m.status === 'proposed' && (
        <div className="border-t pt-3 text-sm space-y-2">
          <p>Propozycja opiekuna: koniec <b>{formatPl(m.proposedEnd ?? '')}</b>{m.proposedStart && <> · start {formatPl(m.proposedStart)}</>}</p>
          <p>Powód: {m.reason} · wykonawca: {m.contractor} {m.comment && <>· „{m.comment}”</>}</p>
          {can(me.role, 'decide') ? (
            <div className="flex gap-2 items-end">
              <input aria-label="Uzasadnienie decyzji" placeholder="Uzasadnienie (wymagane przy odrzuceniu)" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
              <Btn onClick={() => decide(m.id, 'accepted', note)}>Zatwierdź</Btn>
              <Btn kind="danger" disabled={!note} onClick={() => decide(m.id, 'rejected', note)}>Odrzuć</Btn>
            </div>
          ) : <Badge tone="amber">Czeka na decyzję harmonogramisty</Badge>}
        </div>
      )}
      <h3 className="font-medium mt-4 mb-1 text-sm">Historia</h3>
      <ul className="text-xs text-slate-600 space-y-0.5">{[...m.history].reverse().map((h, i) => <li key={i}>{h.at.slice(0, 16).replace('T', ' ')} · {h.by} · {h.action}{h.note ? ` — ${h.note}` : ''}</li>)}</ul>
    </Card>
  );
}
