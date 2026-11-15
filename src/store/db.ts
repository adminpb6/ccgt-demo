import { openDB } from 'idb';

const dbp = () => openDB('ccgt-demo', 1, { upgrade(db) { db.createObjectStore('kv'); } });

export async function loadState<T>(): Promise<T | undefined> {
  try { return (await (await dbp()).get('kv', 'state')) as T | undefined; } catch { return undefined; }
}
export async function saveState(v: unknown): Promise<void> {
  try { await (await dbp()).put('kv', v, 'state'); } catch { /* tryb prywatny: brak zapisu */ }
}
export async function clearState(): Promise<void> {
  try { await (await dbp()).delete('kv', 'state'); } catch { /* */ }
}
