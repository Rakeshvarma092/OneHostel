import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, delay, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.models';
import { AuditLogService } from './audit-log.service';

const TOKEN_KEY = 'onehostel_token';
const USER_KEY = 'onehostel_user';

/**
 * Single source of truth for auth state. Persists the session to
 * localStorage (rememberMe) or sessionStorage (tab-only) and exposes the
 * current user as an observable so any component (e.g. the header) can
 * react to login/logout without re-fetching anything.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readUser());
  readonly currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private auditLog: AuditLogService,
  ) {}

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    // No backend exists yet for this UI-only build, so a successful login is
    // simulated locally instead of calling `${this.apiUrl}/login`. Swap the
    // body below for `this.http.post<LoginResponse>(...)` once a real auth
    // endpoint is available — the rest of the app (guards, interceptor,
    // currentUser$) already expects exactly this Observable<LoginResponse> shape.
    const response: LoginResponse = {
      token: `mock-token-${Date.now()}`,
      user: { id: 'mock-superadmin', name: request.email, email: request.email },
    };

    return of(response).pipe(
      delay(600),
      tap((res) => {
        this.setSession(res, request.rememberMe ?? false);
        this.auditLog.record('Login', res.user.name);
      }),
    );
  }

  logout(): void {
    const user = this.currentUser;
    if (user) this.auditLog.record('Logout', user.name, { user: user.name });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  /** Applies profile edits (name, email, photo) to the session so the header updates immediately. */
  updateCurrentUser(changes: Partial<Pick<AuthUser, 'name' | 'email' | 'avatarUrl'>>): void {
    const user = this.currentUser;
    if (!user) return;
    const updated: AuthUser = { ...user, ...changes };
    // Write back to whichever storage holds this session (remember-me vs tab-only).
    const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    try {
      storage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {
      // Storage full (a large photo can do this) — the change still applies for this session.
    }
    this.currentUserSubject.next(updated);
  }

  private setSession(response: LoginResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
