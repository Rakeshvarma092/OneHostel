import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay, map, of, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { SystemSettingsService } from './system-settings.service';
import { AuditChange, diffForAudit } from '../models/audit.models';
import { PROFILE_AUDIT_FIELDS, PasswordPolicy, UserProfile, profileFullName } from '../models/account.models';

const PROFILE_KEY = 'onehostel_profile_';
const PASSWORD_KEY = 'onehostel_pw_';
/** Matches the login screen's "Use demo credentials" password. */
const DEMO_PASSWORD = 'Password123!';
const DAY_MS = 86_400_000;

export type ChangePasswordResult = 'ok' | 'wrong-current';

export type ProfileChanges = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'mobileCode' | 'mobile' | 'avatarDataUrl'>;

/**
 * The signed-in SuperAdmin's own account: profile details and password.
 *
 * UI-only build: the profile and a mock password are kept in localStorage per
 * user. Swap `saveProfile` / `changePassword` for `PUT /me` and
 * `POST /me/password` once the backend exists — passwords must only ever be
 * verified and stored (hashed) server-side.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly profile$: Observable<UserProfile | null> = this.profileSubject.asObservable();

  constructor(
    private auth: AuthService,
    private auditLog: AuditLogService,
    private settings: SystemSettingsService,
  ) {
    // Reload whenever a different user signs in (or out).
    this.auth.currentUser$.subscribe((user) => {
      const profile = user ? this.load(user.id, user.email) : null;
      this.profileSubject.next(profile);
      if (user && profile) this.syncSession(profile);
    });
  }

  get profile(): UserProfile | null {
    return this.profileSubject.value;
  }

  get minPasswordLength(): number {
    return this.settings.settings.security.minPasswordLength;
  }

  /** Password format from Settings → Security (read live, so a saved change applies straight away). */
  get passwordPolicy(): PasswordPolicy {
    const s = this.settings.settings.security;
    return {
      minLength: s.minPasswordLength,
      requireUppercase: s.requireUppercase,
      requireLowercase: s.requireLowercase,
      requireNumber: s.requireNumber,
      requireSpecialChar: s.requireSpecialChar,
    };
  }

  /** Days until the password expires per Settings → Security; null when passwords never expire. */
  get passwordExpiresInDays(): number | null {
    const expiry = this.settings.settings.security.passwordExpiryDays;
    if (!expiry || !this.profile) return null;
    const age = Math.floor((Date.now() - new Date(this.profile.passwordChangedAt).getTime()) / DAY_MS);
    return expiry - age;
  }

  get passwordAgeDays(): number {
    if (!this.profile) return 0;
    return Math.floor((Date.now() - new Date(this.profile.passwordChangedAt).getTime()) / DAY_MS);
  }

  /** Saves profile edits and records an audit entry. Returns the changed fields (empty if nothing changed). */
  saveProfile(changes: ProfileChanges): Observable<AuditChange[]> {
    const current = this.profile;
    if (!current) return of([]);

    const before = { ...current, avatar: current.avatarDataUrl ? 'Uploaded' : '—' };
    const after = { ...current, ...changes, avatar: changes.avatarDataUrl ? 'Uploaded' : '—' };
    const auditChanges = diffForAudit(before, after, PROFILE_AUDIT_FIELDS);
    // A photo swapped for another photo still counts as a change.
    if (current.avatarDataUrl && changes.avatarDataUrl && current.avatarDataUrl !== changes.avatarDataUrl) {
      auditChanges.push({ field: PROFILE_AUDIT_FIELDS['avatar'], oldValue: 'Uploaded', newValue: 'Replaced' });
    }
    if (!auditChanges.length) return of([]);

    const updated: UserProfile = { ...current, ...changes };
    return of(auditChanges).pipe(
      delay(500),
      tap(() => {
        this.persist(updated);
        this.profileSubject.next(updated);
        this.syncSession(updated);
        this.auditLog.record('Update Profile', profileFullName(updated), { changes: auditChanges });
      }),
    );
  }

  /** Saves just the profile photo (applied straight away, so the header avatar updates without a Save). */
  updatePhoto(avatarDataUrl: string): void {
    const current = this.profile;
    if (!current || current.avatarDataUrl === avatarDataUrl) return;

    const oldValue = current.avatarDataUrl ? 'Uploaded' : '—';
    const newValue = !avatarDataUrl ? '—' : current.avatarDataUrl ? 'Replaced' : 'Uploaded';
    const updated: UserProfile = { ...current, avatarDataUrl };
    this.persist(updated);
    this.profileSubject.next(updated);
    this.syncSession(updated);
    this.auditLog.record('Update Profile', profileFullName(updated), {
      changes: [{ field: PROFILE_AUDIT_FIELDS['avatar'], oldValue, newValue }],
    });
  }

  /** Verifies the current password, then stores the new one. */
  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResult> {
    const profile = this.profile;
    if (!profile) return of('wrong-current' as const);

    return of(this.readPassword(profile.userId) === currentPassword).pipe(
      delay(700),
      map((valid): ChangePasswordResult => (valid ? 'ok' : 'wrong-current')),
      tap((result) => {
        const name = profileFullName(profile);
        if (result === 'wrong-current') {
          this.auditLog.record('Change Password', name, { status: 'Failed', details: 'Current password was incorrect.' });
          return;
        }
        this.writePassword(profile.userId, newPassword);
        const updated: UserProfile = { ...profile, passwordChangedAt: new Date().toISOString() };
        this.persist(updated);
        this.profileSubject.next(updated);
        this.auditLog.record('Change Password', name, { details: 'Password changed by the account owner.' });
      }),
    );
  }

  // ---- Storage ---------------------------------------------------------------

  private load(userId: string, email: string): UserProfile {
    try {
      const raw = localStorage.getItem(PROFILE_KEY + userId);
      if (raw) return JSON.parse(raw) as UserProfile;
    } catch {
      // Fall through to the default profile.
    }
    // Persist the starting profile so dates like "password last changed" stay fixed across reloads.
    const profile = this.defaultProfile(userId, email);
    this.persist(profile);
    return profile;
  }

  private defaultProfile(userId: string, email: string): UserProfile {
    return {
      userId,
      firstName: 'Super',
      lastName: 'Admin',
      email,
      mobileCode: '+91',
      mobile: '9876543210',
      designation: 'Super Admin',
      avatarDataUrl: '',
      memberSince: '2025-04-01',
      passwordChangedAt: new Date(Date.now() - 42 * DAY_MS).toISOString(),
    };
  }

  private persist(profile: UserProfile): void {
    try {
      localStorage.setItem(PROFILE_KEY + profile.userId, JSON.stringify(profile));
    } catch {
      // Storage full or blocked — the change still applies for this session.
    }
  }

  private syncSession(profile: UserProfile): void {
    const user = this.auth.currentUser;
    const name = profileFullName(profile);
    if (user && (user.name !== name || user.email !== profile.email || (user.avatarUrl ?? '') !== profile.avatarDataUrl)) {
      this.auth.updateCurrentUser({ name, email: profile.email, avatarUrl: profile.avatarDataUrl });
    }
  }

  private readPassword(userId: string): string {
    try {
      return localStorage.getItem(PASSWORD_KEY + userId) ?? DEMO_PASSWORD;
    } catch {
      return DEMO_PASSWORD;
    }
  }

  private writePassword(userId: string, password: string): void {
    try {
      localStorage.setItem(PASSWORD_KEY + userId, password);
    } catch {
      // Ignore — mock storage only.
    }
  }
}
