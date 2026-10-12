import { Component, Input } from '@angular/core';
import { statusTone } from '../../constants/status.constants';

/**
 * Renders any status string (Active, Suspended, Draft, Overdue, ...) as a
 * pill with a consistent color meaning, driven by shared/constants/status.constants.ts.
 * Use this instead of ad-hoc mat-chip/colored-text wherever a status appears.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="app-status-badge app-status-badge--{{ tone }}">{{ status }}</span>`,
  styleUrl: './app-status-badge.component.scss',
})
export class AppStatusBadgeComponent {
  @Input({ required: true }) status = '';

  get tone(): string {
    return statusTone(this.status);
  }
}
