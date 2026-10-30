import { PERMISSION_ACTIONS, type PermissionAction, type PermissionModule } from '@attendance/contracts';

/** A Manager role's permissions: only the modules it can use, each with its allowed actions. */
export type PermissionMatrixValue = Partial<Record<PermissionModule, PermissionAction[]>>;

/** Matrix with one row replaced; an empty row is dropped so the stored role lists only usable modules. */
function withRow(value: PermissionMatrixValue, module: PermissionModule, actions: PermissionAction[]): PermissionMatrixValue {
  const rest = Object.fromEntries(Object.entries(value).filter(([key]) => key !== module)) as PermissionMatrixValue;
  return actions.length > 0 ? { ...rest, [module]: actions } : rest;
}

/** Matrix after flipping one cell. */
export function toggleCell(value: PermissionMatrixValue, module: PermissionModule, action: PermissionAction): PermissionMatrixValue {
  const current = value[module] ?? [];
  return withRow(value, module, current.includes(action) ? current.filter((a) => a !== action) : [...current, action]);
}

/** Matrix with a whole row switched on or off. */
export function toggleRow(value: PermissionMatrixValue, module: PermissionModule, on: boolean): PermissionMatrixValue {
  return withRow(value, module, on ? [...PERMISSION_ACTIONS] : []);
}

/** How many modules a role can use at all. */
export function moduleCount(value: Readonly<Record<string, readonly string[] | undefined>>): number {
  return Object.values(value).filter((actions) => (actions?.length ?? 0) > 0).length;
}
