import type { Role } from './types';

export type Action = 'import' | 'propose' | 'decide' | 'export' | 'editPurchasing' | 'admin' | 'editScope';

/** R10 — tylko UI, nie zabezpieczenie. */
const MATRIX: Record<Action, Role[]> = {
  import: ['admin', 'planner'],
  propose: ['admin', 'owner', 'manager'],
  decide: ['admin', 'planner'],
  export: ['admin', 'planner'],
  editPurchasing: ['admin', 'purchaser'],
  admin: ['admin'],
  editScope: ['admin', 'planner'],
};

export const can = (role: Role, a: Action): boolean => MATRIX[a].includes(role);

/** Propozycje terminów: opiekun i kierownik tylko dla swoich obiektów. */
export function canProposeFor(role: Role, ownedObjects: string[], objectCode: string): boolean {
  if (role === 'admin') return true;
  return (role === 'owner' || role === 'manager') && ownedObjects.includes(objectCode);
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator', owner: 'Opiekun obiektu', director: 'Dyrekcja',
  purchaser: 'Zakupy', planner: 'Harmonogramista', manager: 'Kierownik',
};
