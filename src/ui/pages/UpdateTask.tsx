import { useState } from 'react';
import { useStore } from '../../store/store';
import type { Task } from '../../domain/types';
import { Btn, Field, Modal, inputCls } from '../components/ui';

export function UpdateTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { updateTaskPct, appData, reassignObject } = useStore();
  const [pct, setPct] = useState(task.pctComplete);
  const [comment, setComment] = useState('');
  const [to, setTo] = useState('');
  const owners = appData!.users.filter((u) => u.role === 'owner');
  return (
    <Modal title={`Aktualizacja: ${task.code}`} onClose={onClose}>
      <Field label="Procent wykonania"><input type="number" min={0} max={100} className={inputCls} value={pct} onChange={(e) => setPct(Number(e.target.value))} /></Field>
      <Field label="Komentarz"><textarea className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <Field label="Przekaż obiekt innemu opiekunowi">
        <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}><option value="">— bez zmian —</option>{owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      </Field>
      <div className="flex gap-2 justify-end">
        <Btn kind="ghost" onClick={onClose}>Anuluj</Btn>
        <Btn disabled={to === ''} kind="ghost" onClick={() => { reassignObject(task.objectCode, to); onClose(); }}>Przekaż</Btn>
        <Btn onClick={() => { updateTaskPct(task.code, pct, comment); onClose(); }}>Zapisz</Btn>
      </div>
    </Modal>
  );
}
