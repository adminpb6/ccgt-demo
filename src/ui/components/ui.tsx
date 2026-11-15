import { useState, type ReactNode } from 'react';

export const Card = ({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 ${className}`}>
    {title && <h2 className="font-semibold mb-2">{title}</h2>}{children}
  </section>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="text-slate-500 italic py-6 text-center">{children}</p>;

export const Btn = ({ children, onClick, disabled, kind = 'primary', ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...rest} disabled={disabled} onClick={onClick}
    className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 ${kind === 'primary' ? 'bg-blue-700 text-white hover:bg-blue-800' : kind === 'danger' ? 'bg-red-700 text-white' : 'border border-slate-300 hover:bg-slate-100'}`}>{children}</button>
);

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'red' | 'green' | 'amber' | 'blue' }) {
  const c = { slate: 'bg-slate-200 text-slate-800', red: 'bg-red-100 text-red-800', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-900', blue: 'bg-blue-100 text-blue-800' }[tone];
  return <span className={`px-2 py-0.5 rounded text-xs ${c}`}>{children}</span>;
}

export interface Col<T> { key: string; head: string; cell: (r: T) => ReactNode; sort?: (r: T) => number | string; className?: string }

export function Table<T>({ rows, cols, rowKey, onRow, empty = 'Brak danych', initialSort }: {
  rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; empty?: string; initialSort?: [string, 1 | -1];
}) {
  const [sort, setSort] = useState<[string, 1 | -1] | undefined>(initialSort);
  const col = cols.find((c) => c.key === sort?.[0]);
  const data = col?.sort ? [...rows].sort((a, b) => {
    const x = col.sort!(a), y = col.sort!(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sort![1];
  }) : rows;
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b border-slate-300">
          {cols.map((c) => (
            <th key={c.key} scope="col" className={`py-1.5 px-2 font-medium ${c.className ?? ''}`} aria-sort={sort?.[0] === c.key ? (sort[1] === 1 ? 'ascending' : 'descending') : undefined}>
              {c.sort ? <button className="font-medium hover:underline" onClick={() => setSort([c.key, sort?.[0] === c.key && sort[1] === -1 ? 1 : -1])}>{c.head}{sort?.[0] === c.key ? (sort[1] === 1 ? ' ▲' : ' ▼') : ''}</button> : c.head}
            </th>
          ))}
        </tr></thead>
        <tbody>
          {data.map((r) => (
            <tr key={rowKey(r)} tabIndex={onRow ? 0 : undefined} onClick={() => onRow?.(r)} onKeyDown={(e) => e.key === 'Enter' && onRow?.(r)}
              className={`border-b border-slate-100 ${onRow ? 'cursor-pointer hover:bg-blue-50 focus:bg-blue-50' : ''}`}>
              {cols.map((c) => <td key={c.key} className={`py-1.5 px-2 ${c.className ?? ''}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white rounded-lg p-5 w-[520px] max-w-[95vw]">
        <div className="flex justify-between mb-3"><h2 className="font-semibold">{title}</h2><button aria-label="Zamknij" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-sm mb-2"><span className="block text-slate-600 mb-0.5">{label}</span>{children}</label>
);
export const inputCls = 'border border-slate-300 rounded px-2 py-1 w-full';

export function download(name: string, data: Uint8Array | string, mime = 'application/octet-stream') {
  const blob = new Blob([data as BlobPart], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
