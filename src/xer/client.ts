import type { Snapshot } from '../domain/types';

/** Parsowanie w Web Workerze (cp1250, 5,2 tys. zadań) — UI nie blokuje się. */
export function parseInWorker(buffer: ArrayBuffer, revision: string): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ ok: boolean; snapshot?: Snapshot; error?: string }>) => {
      w.terminate();
      e.data.ok && e.data.snapshot ? resolve(e.data.snapshot) : reject(new Error(e.data.error ?? 'Błąd parsowania'));
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage({ buffer, revision }, [buffer]);
  });
}
