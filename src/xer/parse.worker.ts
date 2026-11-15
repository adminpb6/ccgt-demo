import { parseXer } from './parse';

export interface ParseRequest { buffer: ArrayBuffer; revision?: string }
self.onmessage = (e: MessageEvent<ParseRequest>) => {
  try {
    const t0 = performance.now();
    const snapshot = parseXer(e.data.buffer, { revision: e.data.revision });
    (self as unknown as Worker).postMessage({ ok: true, snapshot, ms: performance.now() - t0 });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message });
  }
};
