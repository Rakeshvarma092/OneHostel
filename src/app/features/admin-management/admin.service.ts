import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { AuditLogService } from '../../core/services/audit-log.service';
import { diffForAudit } from '../../core/models/audit.models';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ConfirmDialogData } from '../../shared/components/confirm-dialog/app-confirm-dialog.component';
import { AdminStatus, HostelAdmin, MOCK_ADMINS, adminFullName, maskEmail, maskMobile } from './admin.models';

export type AdminAction = 'resetPassword' | 'activate' | 'deactivate' | 'lock' | 'unlock';

export const ADMIN_ACTION_META: Record<AdminAction, { label: string; icon: string; danger?: boolean }> = {
  resetPassword: { label: 'Reset Password', icon: 'lock_reset' },
  activate: { label: 'Activate', icon: 'check_circle' },
  deactivate: { label: 'Deactivate', icon: 'block', danger: true },
  lock: { label: 'Lock', icon: 'lock', danger: true },
  unlock: { label: 'Unlock', icon: 'lock_open' },
};

/** Which account actions make sense for each status. */
export function availableActions(status: AdminStatus): AdminAction[] {
  switch (status) {
    case 'Active':
      return ['resetPassword', 'lock', 'deactivate'];
    case 'Locked':
      return ['unlock', 'resetPassword', 'deactivate'];
    case 'Inactive':
      return ['activate'];
  }
}

const ADMIN_AUDIT_FIELDS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  mobileCode: 'Country Code',
  mobile: 'Mobile',
  role: 'Role',
};

/** Local wall-clock ISO (yyyy-mm-ddTHH:mm:ss), matching the mock data. */
function nowIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

/**
 * Hostel admin accounts and the account actions a SuperAdmin can take.
 * Each action asks for confirmation, updates the account and writes an
 * audit entry. UI-only build: data is in-memory mock data.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly adminsSubject = new BehaviorSubject<HostelAdmin[]>(structuredClone(MOCK_ADMINS));
  readonly admins$ = this.adminsSubject.asObservable();

  constructor(
    private auditLog: AuditLogService,
    private confirm: ConfirmDialogService,
    private snackBar: MatSnackBar,
  ) {}

  get admins(): HostelAdmin[] {
    return this.adminsSubject.value;
  }

  byId(adminId: string): HostelAdmin | undefined {
    return this.admins.find((a) => a.adminId === adminId);
  }

  /** Saves profile edits (name, email, mobile, role). Returns false if nothing changed. */
  update(
    adminId: string,
    changes: Pick<HostelAdmin, 'firstName' | 'lastName' | 'email' | 'mobileCode' | 'mobile' | 'role'>,
  ): boolean {
    const current = this.byId(adminId);
    if (!current) return false;
    const auditChanges = diffForAudit({ ...current }, { ...changes }, ADMIN_AUDIT_FIELDS);
    if (!auditChanges.length) return false;

    this.patch(adminId, changes);
    this.auditLog.record('Update Admin', current.username, { changes: auditChanges });
    this.toast('Admin details updated');
    return true;
  }

  /** Confirms with the user, then applies the action. Emits the updated admin, or null if cancelled. */
  perform(admin: HostelAdmin, action: AdminAction): Observable<HostelAdmin | null> {
    const name = adminFullName(admin);
    const dialogs: Record<AdminAction, ConfirmDialogData> = {
      resetPassword: {
        title: 'Reset password?',
        message: `A new temporary password will be sent to ${name} at:`,
        icon: 'lock_reset',
        details: [
          { icon: 'mail', label: 'Email', value: maskEmail(admin.email) },
          { icon: 'smartphone', label: 'Mobile', value: `${admin.mobileCode} ${maskMobile(admin.mobile)}` },
        ],
        note: `${name} must set a new password at next login.`,
        confirmLabel: 'Send temporary password',
      },
      activate: {
        title: 'Activate admin?',
        message: `${name} will be able to sign in to ${admin.hostelName} again.`,
        icon: 'check_circle_outline',
        tone: 'success',
        confirmLabel: 'Activate',
      },
      deactivate: {
        title: 'Deactivate admin?',
        message: `${name} will be signed out and can no longer access ${admin.hostelName}.`,
        icon: 'person_off',
        note: 'You can reactivate the account later.',
        confirmLabel: 'Deactivate',
        danger: true,
      },
      lock: {
        title: 'Lock account?',
        message: `${name} will be signed out immediately and blocked from signing in until the account is unlocked.`,
        icon: 'lock',
        note: 'Use this if you suspect the account is compromised.',
        confirmLabel: 'Lock account',
        danger: true,
      },
      unlock: {
        title: 'Unlock account?',
        message: `${name} will be able to sign in again.`,
        icon: 'lock_open',
        tone: 'success',
        note: 'Consider also resetting the password if the lock was due to suspicious activity.',
        confirmLabel: 'Unlock',
      },
    };
    const dialog = dialogs[action];

    if (!availableActions(admin.status).includes(action)) return of(null);

    return this.confirm.confirm({ cancelLabel: 'Cancel', ...dialog }).pipe(
      map((ok) => {
        if (!ok) return null;
        this.apply(admin, action);
        return this.byId(admin.adminId) ?? null;
      }),
    );
  }

  private apply(admin: HostelAdmin, action: AdminAction): void {
    const now = nowIso();
    const statusChange = (to: AdminStatus) => [{ field: 'Status', oldValue: admin.status, newValue: to }];

    switch (action) {
      case 'resetPassword':
        // The temporary password itself is generated and delivered server-side; it is never shown or logged here.
        this.patch(admin.adminId, { lastPasswordChange: now });
        this.auditLog.record('Reset Password', admin.username, {
          details: `Temporary password sent to ${maskEmail(admin.email)} and mobile ${maskMobile(admin.mobile)}.`,
        });
        this.toast(`Temporary password sent to ${adminFullName(admin)}`);
        break;

      case 'activate':
        this.patch(admin.adminId, { status: 'Active' });
        this.auditLog.record('Activate Admin', admin.username, { changes: statusChange('Active') });
        this.toast(`${adminFullName(admin)} activated`);
        break;

      case 'deactivate':
        this.patch(admin.adminId, { status: 'Inactive', lockReason: undefined, lockedAt: undefined });
        this.auditLog.record('Deactivate Admin', admin.username, { changes: statusChange('Inactive') });
        this.toast(`${adminFullName(admin)} deactivated`);
        break;

      case 'lock':
        this.patch(admin.adminId, { status: 'Locked', lockReason: 'Locked manually by SuperAdmin.', lockedAt: now });
        this.auditLog.record('Lock Admin', admin.username, { changes: statusChange('Locked') });
        this.toast(`${adminFullName(admin)}'s account locked`);
        break;

      case 'unlock':
        this.patch(admin.adminId, { status: 'Active', lockReason: undefined, lockedAt: undefined });
        this.auditLog.record('Unlock Admin', admin.username, {
          changes: statusChange('Active'),
          details: admin.lockReason ? `Previous lock: ${admin.lockReason}` : undefined,
        });
        this.toast(`${adminFullName(admin)}'s account unlocked`);
        break;
    }
  }

  private patch(adminId: string, changes: Partial<HostelAdmin>): void {
    this.adminsSubject.next(this.admins.map((a) => (a.adminId === adminId ? { ...a, ...changes } : a)));
  }

  private toast(message: string): void {
    this.snackBar.open(message, 'x', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar--success', 'green-snackbar'],
    });
  }
}
