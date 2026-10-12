import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Standard "no rows" block for list screens: the table's column headers
 * (so the layout doesn't jump) followed by an icon and a message.
 * Styling comes from src/styles/_table.scss (`.empty-state-*`, `.saas-table`).
 *
 *   <app-empty-state
 *     [headers]="['Hostel ID', 'Hostel Name', …, 'Actions']"
 *     [message]="searchTerm ? 'No hostels match your search' : 'No Data Found'"
 *   ></app-empty-state>
 *
 * Omit `headers` for non-table layouts (e.g. card grids). A header named
 * "Actions" is right-aligned to match the table's actions column.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state-wrapper">
      @if (headers.length) {
        <div class="table-responsive">
          <table class="saas-table empty-header-table">
            <thead>
              <tr>
                @for (h of headers; track $index) {
                  <th [class.actions-header]="h === 'Actions'">{{ h }}</th>
                }
              </tr>
            </thead>
          </table>
        </div>
      }

      <div class="empty-state-body" role="status">
        <div class="empty-state-icon-circle">
          @if (icon === 'search') {
            <div class="icon-magnifier-box">
              <mat-icon class="icon-magnifier">search</mat-icon>
              <div class="mini-chart-bars" aria-hidden="true">
                <span class="bar bar--1"></span>
                <span class="bar bar--2"></span>
              </div>
            </div>
          } @else {
            <mat-icon class="icon-magnifier">{{ icon }}</mat-icon>
          }
        </div>
        <div class="empty-state-text">{{ message }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AppEmptyStateComponent {
  /** Column headers shown above the message; empty = no header row. */
  @Input() headers: string[] = [];
  @Input() message = 'No Data Found';
  /** Material icon; the default "search" gets the magnifier-with-chart look. */
  @Input() icon = 'search';
}
