import { useMemo, useState } from 'react';
import { parseCsv, parseScopeList, parseUpdateRows, toCsv, type UpdateParse } from '../../domain/excel';
import { can } from '../../domain/permissions';
import type { Snapshot } from '../../domain/types';
import { formatPl } from '../../domain/workdays';
import { useMe } from '../../store/selectors';
import { BUILTIN, useStore, type ImportPreview } from '../../store/store';
import { Badge, Btn, Card, Field, download, inputCls } from '../components/ui';

async function readGrid(file: File): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsx } = await import('read-excel-file');
    return (await readXlsx(file)) as unknown[][];
  }
  return parseCsv(await file.text());
}

export function ImportPage() {
  const st = useStore();
  const me = useMe();
  const [preview, setPreview] = useState<ImportPreview>();
  const [excel, setExcel] = useState<{ name: string; parse: UpdateParse }>();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const canImport = can(me.role, 'import');
  const scopeSet = useMemo(() => new Set(st.scope), [st.scope]);

  const run = async (f: () => Promise<void>) => { setErr(''); setMsg(''); try { await f(); } catch (e) { setErr((e as Error).message); } };
  const pickBuiltin = (b: (typeof BUILTIN)[number]) => run(async () => setPreview(st.previewImport(await st.loadBuiltin(b.file, b.revision))));
  const pickFile = (f: File) => run(async () => {
    if (/\.xer$/i.test(f.name)) {
      const snap: Snapshot = await st.parseFile(await f.arrayBuffer(), f.name.replace(/\.xer$/i, ''));
      setPreview(st.previewImport(snap)); setExcel(undefined);
    } else { setExcel({ name: f.name, parse: parseUpdateRows(await readGrid(f)) }); setPreview(undefined); }
  });
  const pickScope = (f: File) => run(async () => {
    const codes = parseScopeList(await readGrid(f));
    const known = codes.filter((c) => st.current!.tasks[c]);
    st.setScope(known);
    setMsg(`Zakres z pliku: ${known.length} zadań (nieznanych kodów: ${codes.length - known.length}).`);
  });

  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return Object.values(st.current!.tasks).filter((t) => !ql || `${t.code} ${t.name}`.toLowerCase().includes(ql)).slice(0, 100);
  }, [st.current, q]);

  return (
    <div className="space-y-3">
      <Card title="Import harmonogramu">
        <p className="text-sm text-slate-600 mb-2">Bieżący: <b>{st.current!.revision}</b> (data statusu {formatPl(st.current!.dataDate)}), {Object.keys(st.current!.tasks).length} zadań, {st.current!.relationCount} relacji.
          {st.current!.warnings.length > 0 && <Badge tone="amber">{st.current!.warnings.join('; ')}</Badge>}</p>
        {!canImport && <p role="note" className="text-amber-800 text-sm mb-2">Import jest dostępny dla roli: harmonogramista lub administrator.</p>}
        <div className="flex gap-2 flex-wrap items-center">
          {BUILTIN.map((b) => <Btn key={b.file} kind="ghost" disabled={!canImport} onClick={() => pickBuiltin(b)}>Wybierz wbudowany {b.label}</Btn>)}
          <label className={`text-sm border-2 border-dashed rounded px-3 py-1.5 ${canImport ? 'cursor-pointer' : 'opacity-40'}`}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && canImport) void pickFile(f); }}>
            Upuść lub wybierz plik XER / Excel (.xlsx, .csv)
            <input type="file" aria-label="Plik importu" className="sr-only" disabled={!canImport} accept=".xer,.xlsx,.csv" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
          </label>
        </div>
        {err && <p role="alert" className="text-red-700 mt-2 text-sm">Błąd: {err}</p>}
        {msg && <p role="status" className="text-blue-800 mt-2 text-sm">{msg}</p>}
      </Card>

      {preview && (
        <Card title={`Podsumowanie porównania: ${st.current!.revision} → ${preview.snapshot.revision}`}>
          <ul className="text-sm space-y-1 mb-3">
            <li data-testid="shift-count">Przesunięcia w zakresie: <b>{preview.diff.shifts.length}</b> (w prawo: {preview.diff.shifts.filter((s) => s.deltaWd > 0).length}, w lewo: {preview.diff.shifts.filter((s) => s.deltaWd < 0).length})</li>
            <li data-testid="added-count">Nowe w zakresie (wg reguły): <b>{preview.added.length}</b></li>
            <li data-testid="removed-count">Usunięte z harmonogramu: <b>{preview.diff.removed.length}</b></li>
            <li>Zakres: {preview.scopeSize} zadań · próg przesunięcia: {st.config!.shiftThresholdWd} d rob.</li>
          </ul>
          <Btn onClick={() => { st.applyImport(preview.snapshot); setMsg(`Zaimportowano ${preview.snapshot.revision}: utworzono monity i wpisy informacyjne.`); setPreview(undefined); }}>Importuj</Btn>
        </Card>
      )}

      {excel && (
        <Card title={`Aktualizacje z Excela: ${excel.name}`}>
          <p className="text-sm">Poprawnych wierszy: <b>{excel.parse.rows.length}</b>. Excel nie przelicza zależnych zadań — relacje i prognoza pochodzą z ostatniego XER.</p>
          {excel.parse.errors.length > 0 && <div role="alert" className="text-sm text-red-700 my-2"><b>Raport błędów:</b><ul className="list-disc ml-5">{excel.parse.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
          <Btn disabled={!canImport || !excel.parse.rows.length} onClick={() => {
            const r = st.applyExcel(excel.parse.rows, `Excel ${new Date().toISOString().slice(0, 10)}`);
            setMsg(`Zastosowano ${r.matched} aktualizacji; bez dopasowania: ${r.unmatched.length}${r.unmatched.length ? ' (' + r.unmatched.slice(0, 5).join(', ') + '…)' : ''}.`); setExcel(undefined);
          }}>Zastosuj aktualizacje</Btn>
        </Card>
      )}

      <Card title={`Zakres (${st.scope!.length} zadań)`}>
        <p className="text-sm text-slate-600 mb-2">Zakres wybiera się ręcznie; reguła po kodach to tylko podpowiedź do masowego zaznaczenia. Zadania poza zakresem są wczytane jako kontekst, ale nie generują monitów.</p>
        <div className="flex gap-2 flex-wrap mb-3">
          <Btn disabled={!can(me.role, 'editScope')} onClick={() => { st.selectByRule(); }}>Zaznacz wg reguły</Btn>
          <Btn kind="ghost" disabled={!can(me.role, 'editScope')} onClick={() => st.setScope([])}>Wyczyść zakres</Btn>
          <Btn kind="ghost" onClick={() => download('zakres.csv', '﻿' + toCsv([['task_code'], ...st.scope!.map((c) => [c])]), 'text/csv;charset=utf-8')}>Eksport CSV</Btn>
          <label className="text-sm border rounded px-3 py-1.5 cursor-pointer">Import listy z Excela/CSV
            <input type="file" aria-label="Plik z listą zakresu" className="sr-only" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && pickScope(e.target.files[0])} /></label>
        </div>
        <input aria-label="Szukaj zadania" placeholder="Szukaj zadania po kodzie lub nazwie…" className={inputCls + ' mb-2'} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-64 overflow-auto text-sm">
          {list.map((t) => (
            <label key={t.code} className="flex gap-2 py-0.5 px-1 hover:bg-slate-50">
              <input type="checkbox" disabled={!can(me.role, 'editScope')} checked={scopeSet.has(t.code)} onChange={(e) => st.toggleScope(t.code, e.target.checked)} />
              <span className="text-slate-500 w-24">{t.code}</span><span>{t.name}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">Pokazano pierwsze 100 pasujących zadań.</p>
      </Card>

      <Card title="Konfiguracja (administrator)">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Próg przesunięcia (dni rob.)"><input type="number" min={0} className={inputCls} disabled={!can(me.role, 'admin')} value={st.config!.shiftThresholdWd} onChange={(e) => st.setConfig({ shiftThresholdWd: Number(e.target.value) })} /></Field>
          <Field label="Próg opóźnienia (dni rob.)"><input type="number" min={0} className={inputCls} disabled={!can(me.role, 'admin')} value={st.config!.delayThresholdWd} onChange={(e) => st.setConfig({ delayThresholdWd: Number(e.target.value) })} /></Field>
          <Field label="Reguła: AC_PP_PM"><input className={inputCls} disabled={!can(me.role, 'admin')} value={st.config!.scopeRule.ppIn.join(', ')} onChange={(e) => st.setConfig({ scopeRule: { ...st.config!.scopeRule, ppIn: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></Field>
          <Field label="Reguła: zespoły"><input className={inputCls} disabled={!can(me.role, 'admin')} value={st.config!.scopeRule.teamIn.join(', ')} onChange={(e) => st.setConfig({ scopeRule: { ...st.config!.scopeRule, teamIn: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></Field>
        </div>
        <Field label="Ograniczenie w delcie (parametr formatu)"><select className={inputCls + ' w-60'} disabled={!can(me.role, 'admin')} value={st.config!.deltaConstraintType} onChange={(e) => st.setConfig({ deltaConstraintType: e.target.value as 'CS_MSOA' | 'CS_MEOA' })}><option>CS_MSOA</option><option>CS_MEOA</option></select></Field>
      </Card>

      <Card title="Historia importów">
        <ul className="text-sm">{st.importLog!.map((l, i) => <li key={i}>{l.at.slice(0, 16).replace('T', ' ')} · {l.revision} · {l.summary}</li>)}</ul>
        <div className="mt-3"><Btn kind="danger" onClick={() => { if (confirm('Zresetować demo do stanu początkowego?')) void st.reset(); }}>Zresetuj demo</Btn></div>
      </Card>
    </div>
  );
}
