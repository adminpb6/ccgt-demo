import { useState } from 'react';
import { can } from '../../domain/permissions';
import { currentStep } from '../../domain/purchasing';
import { formatPl } from '../../domain/workdays';
import { useMe } from '../../store/selectors';
import { useStore } from '../../store/store';
import { Badge, Btn, Card, Empty } from '../components/ui';

export function Purchasing() {
  const { purchasing, current, appData, advancePurchasing } = useStore();
  const me = useMe();
  const [open, setOpen] = useState<string>();
  const dd = current!.dataDate;
  const items = (purchasing ?? []).filter((it) => me.role !== 'owner' || (me.objects ?? []).includes(it.objectCode));
  if (!items.length) return <Card><Empty>Brak pozycji zakupowych.</Empty></Card>;
  const edit = can(me.role, 'editPurchasing');
  return (
    <Card title="Ścieżka zakupowa (7 kroków)">
      {!edit && <p className="text-sm text-slate-600 mb-2">Podgląd — edycję kroków ma rola Zakupy.</p>}
      <ul className="divide-y">
        {items.map((it) => {
          const cur = currentStep(it);
          const overdue = it.steps.some((s) => !s.done && s.planned < dd);
          const o = appData!.objects.find((x) => x.code === it.objectCode);
          return (
            <li key={it.id} className="py-2">
              <button className="w-full text-left flex items-center gap-3" onClick={() => setOpen(open === it.id ? undefined : it.id)} aria-expanded={open === it.id}>
                <span className="font-medium w-72 truncate">{it.objectCode} {o?.name}</span>
                <span className="flex gap-1" aria-label={`Krok ${Math.min(cur + 1, 7)} z 7`}>
                  {it.steps.map((s, i) => <span key={i} title={s.name} className={`w-6 h-3 rounded ${s.done ? 'bg-green-600' : i === cur ? 'bg-amber-500' : 'bg-slate-300'}`} />)}
                </span>
                <span className="text-sm">{cur >= 7 ? 'Zakończona' : it.steps[cur].name}</span>
                {overdue && <Badge tone="red">opóźniony krok</Badge>}
              </button>
              {open === it.id && (
                <table className="text-sm mt-2 ml-4"><thead><tr className="text-left"><th className="pr-4">Krok</th><th className="pr-4">Plan</th><th className="pr-4">Wykonano</th><th className="pr-4">Odpowiedzialny</th><th /></tr></thead>
                  <tbody>{it.steps.map((s, i) => (
                    <tr key={i}><td className="pr-4">{i + 1}. {s.name}</td><td className="pr-4">{formatPl(s.planned)}</td><td className="pr-4">{s.done ? formatPl(s.done) : '—'}</td><td className="pr-4">{s.owner}</td>
                      <td>{edit && (i === cur || (s.done && i === cur - 1)) && <Btn kind="ghost" onClick={() => advancePurchasing(it.id, i)}>{s.done ? 'Cofnij' : 'Zakończ krok'}</Btn>}</td></tr>
                  ))}</tbody></table>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
