import type { AppConfig, Snapshot, Task } from './types';

/** Wartość kodu to pełna nazwa ("Zespół-I (Inwestor)"); reguła podaje skrót ("Zespół-I"). */
function codeIs(value: string | undefined, short: string): boolean {
  return value !== undefined && (value === short || value.startsWith(short + ' '));
}

/** Podpowiedź do masowego zaznaczenia (R1): AC_PP_PM ∈ ppIn LUB AC_Zespol ∈ teamIn. */
export function matchesRule(t: Task, rule: AppConfig['scopeRule']): boolean {
  return rule.ppIn.some((x) => codeIs(t.codes['AC_PP_PM'], x)) || rule.teamIn.some((x) => codeIs(t.codes['AC_Zespol'], x));
}

export function selectByRule(snap: Snapshot, rule: AppConfig['scopeRule']): string[] {
  return Object.values(snap.tasks).filter((t) => matchesRule(t, rule)).map((t) => t.code);
}
