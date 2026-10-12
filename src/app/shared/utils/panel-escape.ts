/**
 * Whether an Escape keypress should close a slide-out side panel.
 *
 * Esc is skipped when something layered on top of the panel already handled it
 * or still owns it — an open dropdown (mat-select / autocomplete / datepicker
 * mark the event `defaultPrevented` when they close) or a confirmation dialog —
 * so the first Esc closes only that, and a second Esc closes the panel.
 */
export function shouldCloseOnEscape(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  if (document.querySelector('.mat-mdc-dialog-container')) return false;
  return true;
}
