import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface UnsavedChangesAware {
  confirmLeave(): Observable<boolean> | boolean;
}

/**
 * Asks before leaving a page with unsaved edits. Navigation to /login is always
 * allowed: logout has already cleared the session by then, so "Stay" would
 * leave a signed-out user on a protected page.
 */
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = (component, _route, _state, nextState) =>
  nextState?.url.startsWith('/login') ? true : component.confirmLeave();
