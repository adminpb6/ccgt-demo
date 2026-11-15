import type { AppData } from './appdata';

export interface PurchStep { name: string; planned: string; done?: string; owner: string }
export interface PurchItem { id: string; objectCode: string; name: string; steps: PurchStep[] }

function hash(s: string): number { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function addDays(d: string, n: number): string { return new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }

/** Syntetyczne pozycje zakupowe: po jednej na obiekt, 7 stałych kroków, deterministyczne statusy. */
export function seedPurchasing(app: AppData, dataDate: string): PurchItem[] {
  return app.objects.map((o) => {
    const h = hash(o.code);
    const doneCount = h % 8; // 0..7 kroków zakończonych
    let t = addDays(dataDate, -doneCount * 21);
    const steps = app.purchasingSteps.map((name, i) => {
      t = addDays(t, 14 + ((h >> (i + 3)) % 21));
      const s: PurchStep = { name, planned: t, owner: 'Rafał Pawlak (zakupy)' };
      if (i < doneCount) s.done = addDays(t, ((h >> i) % 7) - 3);
      return s;
    });
    return { id: `p:${o.code}`, objectCode: o.code, name: `${o.name} (${o.contractor})`, steps };
  });
}

export function currentStep(item: PurchItem): number { const i = item.steps.findIndex((s) => !s.done); return i < 0 ? item.steps.length : i; }
