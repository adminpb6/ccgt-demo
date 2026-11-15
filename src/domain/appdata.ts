import type { Role } from './types';

export interface AppUser { id: string; name: string; role: Role; objects?: string[] }
export interface ObjectInfo {
  code: string; name: string; area: string; project: string; contractor: string; owner: string; unit: string; package: string;
}
export interface AppData { users: AppUser[]; objects: ObjectInfo[]; contractors: string[]; purchasingSteps: string[]; meta: { dataDateG: string; dataDateH: string } }

export function ownerUserId(app: AppData, objectCode: string): string | undefined {
  return app.users.find((u) => u.objects?.includes(objectCode))?.id;
}
