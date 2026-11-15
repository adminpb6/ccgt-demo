export type Role = 'admin' | 'owner' | 'director' | 'purchaser' | 'planner' | 'manager';
export type RelType = 'PR_FS' | 'PR_SS' | 'PR_FF' | 'PR_SF';

export interface Pred { code: string; type: RelType; lagDays: number }

export interface Task {
  id: string; code: string; guid: string; name: string;
  type: 'TT_Task' | 'TT_Mile' | 'TT_FinMile';
  status: 'TK_NotStart' | 'TK_Active' | 'TK_Complete';
  wbsId: string; projId: string; objectCode: string;
  /** daty w formacie 'YYYY-MM-DD HH:MM' (bez strefy) */
  baselineStart: string; baselineEnd: string; // target_*
  start: string; end: string;                 // early_* (prognoza)
  actStart?: string; actEnd?: string;
  durationDays: number; floatDays: number;
  pctComplete: number;
  codes: Record<string, string>;              // typ kodu -> wartość
  preds: Pred[];
  /** pola potrzebne do zapisu delty */
  numericId: string;
}

export interface WbsNode { id: string; projId: string; parentId: string; shortName: string; name: string }
export interface ProjectInfo { id: string; shortName: string; guid: string }

export interface Snapshot {
  id: string; revision: string; dataDate: string; importedAt: string;
  tasks: Record<string, Task>;               // klucz: task_code
  wbs: Record<string, WbsNode>;
  projects: ProjectInfo[];
  warnings: string[];
  relationCount: number;
}

export interface ShiftEvent {
  id: string; taskCode: string; fromEnd: string; toEnd: string; deltaWd: number; snapshotId: string;
}

export type MonitStatus = 'new' | 'negotiating' | 'proposed' | 'accepted' | 'rejected' | 'closed';
export interface Monit {
  id: string; taskCode: string; ownerId: string; shiftId: string;
  status: MonitStatus;
  proposedStart?: string; proposedEnd?: string; reason?: string; contractor?: string; comment?: string;
  createdAt: string; history: { at: string; by: string; action: string; note?: string }[];
}

export interface RegisterEntry {
  id: string; taskCode: string; oldEnd: string; newEnd: string; reason: string;
  decision: 'accepted' | 'rejected'; decidedBy: string; decidedAt: string; exported: boolean;
  newStart?: string;
}

export interface AppConfig {
  scopeRule: { ppIn: string[]; teamIn: string[] };
  shiftThresholdWd: number; delayThresholdWd: number;
  deltaConstraintType: 'CS_MSOA' | 'CS_MEOA';
}

export const DEFAULT_CONFIG: AppConfig = {
  scopeRule: { ppIn: ['PM100', 'PM200', 'PM300'], teamIn: ['Zespół-I', 'Zespół-E'] },
  shiftThresholdWd: 1, delayThresholdWd: 5, deltaConstraintType: 'CS_MSOA',
};
