import { useMemo } from 'react';
import type { AppUser } from '../domain/appdata';
import { cumulativeDelay } from '../domain/diff';
import type { Snapshot, Task } from '../domain/types';
import { useStore } from './store';

export interface ObjStat {
  code: string; name: string; owner: string; ownerId: string; contractor: string;
  total: number; done: number; pct: number; delayed: number; maxDelay: number; critical: number; inScope: number;
}

export function computeObjectStats(snap: Snapshot, app: NonNullable<ReturnType<typeof useStore.getState>['appData']>, scope: Set<string>, delayThr: number): ObjStat[] {
  const by = new Map<string, Task[]>();
  for (const t of Object.values(snap.tasks)) (by.get(t.objectCode) ?? by.set(t.objectCode, []).get(t.objectCode)!).push(t);
  return app.objects.map((o) => {
    const ts = by.get(o.code) ?? [];
    let done = 0, delayed = 0, maxDelay = 0, critical = 0, inScope = 0;
    for (const t of ts) {
      if (scope.has(t.code)) inScope++;
      if (t.status === 'TK_Complete') { done++; continue; }
      const d = cumulativeDelay(t);
      if (d >= delayThr) { delayed++; if (t.floatDays <= 0) critical++; }
      if (d > maxDelay) maxDelay = d;
    }
    const owner = app.users.find((u) => u.objects?.includes(o.code));
    return {
      code: o.code, name: o.name, owner: owner?.name ?? '—', ownerId: owner?.id ?? '', contractor: o.contractor,
      total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 1000) / 10 : 0, delayed, maxDelay, critical, inScope,
    };
  });
}

export function useObjectStats(): ObjStat[] {
  const { current, appData, scope, config } = useStore();
  return useMemo(
    () => (current && appData ? computeObjectStats(current, appData, new Set(scope), config!.delayThresholdWd) : []),
    [current, appData, scope, config],
  );
}

export function useMe(): AppUser {
  const { appData, userId } = useStore();
  return appData!.users.find((u) => u.id === userId) ?? appData!.users[0];
}
