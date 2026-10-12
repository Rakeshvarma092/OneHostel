export type AuditModule =
  | 'Auth'
  | 'Hostel'
  | 'Admin'
  | 'Resident'
  | 'Subscription Plan'
  | 'Subscription & Payment'
  | 'Communication Template'
  | 'Settings';

/** Every tracked platform event, and the Module / Action it is shown under. */
export const AUDIT_EVENTS = {
  Login: { module: 'Auth', action: 'Login' },
  Logout: { module: 'Auth', action: 'Logout' },
  'Reset Password': { module: 'Auth', action: 'Reset Password' },
  'Change Password': { module: 'Auth', action: 'Change Password' },
  'Update Profile': { module: 'Auth', action: 'Update Profile' },
  'Create Hostel': { module: 'Hostel', action: 'Create' },
  'Update Hostel': { module: 'Hostel', action: 'Update' },
  'Activate Hostel': { module: 'Hostel', action: 'Activate' },
  'Deactivate Hostel': { module: 'Hostel', action: 'Deactivate' },
  'Create Admin': { module: 'Admin', action: 'Create' },
  'Update Admin': { module: 'Admin', action: 'Update' },
  'Activate Admin': { module: 'Admin', action: 'Activate' },
  'Deactivate Admin': { module: 'Admin', action: 'Deactivate' },
  'Lock Admin': { module: 'Admin', action: 'Lock' },
  'Unlock Admin': { module: 'Admin', action: 'Unlock' },
  'Activate Resident': { module: 'Resident', action: 'Activate' },
  'Deactivate Resident': { module: 'Resident', action: 'Deactivate' },
  'Block Resident': { module: 'Resident', action: 'Block' },
  'Unblock Resident': { module: 'Resident', action: 'Unblock' },
  'Create Plan': { module: 'Subscription Plan', action: 'Create' },
  'Update Plan': { module: 'Subscription Plan', action: 'Update' },
  'Activate Plan': { module: 'Subscription Plan', action: 'Activate' },
  'Deactivate Plan': { module: 'Subscription Plan', action: 'Deactivate' },
  'Record Payment': { module: 'Subscription & Payment', action: 'Record Payment' },
  'Create Template': { module: 'Communication Template', action: 'Create' },
  'Update Template': { module: 'Communication Template', action: 'Update' },
  'Change Settings': { module: 'Settings', action: 'Update' },
} as const satisfies Record<string, { module: AuditModule; action: string }>;

export type AuditEvent = keyof typeof AUDIT_EVENTS;

export const AUDIT_EVENT_NAMES = Object.keys(AUDIT_EVENTS) as AuditEvent[];

export const AUDIT_MODULES: AuditModule[] = [
  'Auth',
  'Hostel',
  'Admin',
  'Resident',
  'Subscription Plan',
  'Subscription & Payment',
  'Communication Template',
  'Settings',
];

export type AuditStatus = 'Success' | 'Failed';

/** One field's before/after value on a sensitive change. */
export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AuditLog {
  logId: string;
  /** ISO date-time. */
  timestamp: string;
  user: string;
  event: AuditEvent;
  /** The record acted on — hostel name, plan name, username, etc. */
  entity: string;
  ipAddress: string;
  status: AuditStatus;
  /** Why it failed, or extra context. */
  details?: string;
  /** Old → new values, recorded for updates and status changes. */
  changes?: AuditChange[];
}

export function auditModule(log: AuditLog): AuditModule {
  return AUDIT_EVENTS[log.event].module;
}

export function auditAction(log: AuditLog): string {
  return AUDIT_EVENTS[log.event].action;
}

/**
 * Field-by-field diff for audit entries. Only keys listed in `labels` are
 * compared, so secrets (passwords, tokens) are never captured by accident.
 */
export function diffForAudit(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): AuditChange[] {
  const show = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (v instanceof Date) return v.toISOString().split('T')[0];
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };

  return Object.entries(labels)
    .filter(([key]) => show(before[key]) !== show(after[key]))
    .map(([key, field]) => ({ field, oldValue: show(before[key]), newValue: show(after[key]) }));
}
