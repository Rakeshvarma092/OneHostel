/**
 * Central status → visual tone mapping, used by AppStatusBadgeComponent so
 * every status across every feature (hostel, admin, subscription, payment,
 * template, audit log) renders with the same color meaning.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // Positive / healthy states
  Active: 'success',
  Published: 'success',
  Paid: 'success',
  Completed: 'success',
  Approved: 'success',
  Success: 'success',

  // Attention / in-progress states
  Pending: 'warning',
  'Payment Pending': 'warning',
  Trial: 'warning',
  Draft: 'warning',
  'Due Soon': 'warning',
  'In Progress': 'warning',

  // Neutral / inactive states
  Inactive: 'neutral',
  Archived: 'neutral',
  Cancelled: 'neutral',
  Disabled: 'neutral',

  // Negative / blocking states
  Suspended: 'danger',
  Expired: 'danger',
  Failed: 'danger',
  Overdue: 'danger',
  Rejected: 'danger',
  Blocked: 'danger',

  // Informational
  New: 'info',
  Refunded: 'info',
  Scheduled: 'info',
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONE_MAP[status] ?? 'neutral';
}
