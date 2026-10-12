import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Standard list footer with first / prev / numbered / next / last page buttons.
 * Styling comes from src/styles/_table.scss (`.saas-card__footer`, `.pag-*`).
 *
 *   <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="setPage($event)">
 *     <span>Optional left-hand content, e.g. "Showing 1–10 of 42"</span>
 *   </app-pagination>
 *
 * `page` is 0-based. The parent owns the current page and slices its own rows;
 * this component only renders the controls and reports which page was picked.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="saas-card__footer">
      <ng-content></ng-content>
      <nav class="pagination-right" aria-label="Pagination">
        <div class="pag-arrows">
          <button type="button" class="pag-btn" aria-label="First page" [disabled]="isFirst" (click)="go(0)">
            <mat-icon>first_page</mat-icon>
          </button>
          <button type="button" class="pag-btn" aria-label="Previous page" [disabled]="isFirst" (click)="go(page - 1)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          @for (n of pageNumbers; track n) {
            <button
              type="button"
              class="pag-number"
              [class.pag-number--active]="n === page + 1"
              [attr.aria-current]="n === page + 1 ? 'page' : null"
              [attr.aria-label]="'Page ' + n"
              (click)="go(n - 1)"
            >
              {{ n }}
            </button>
          }
          <button type="button" class="pag-btn" aria-label="Next page" [disabled]="isLast" (click)="go(page + 1)">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <button type="button" class="pag-btn" aria-label="Last page" [disabled]="isLast" (click)="go(totalPages - 1)">
            <mat-icon>last_page</mat-icon>
          </button>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AppPaginationComponent {
  /** Current page, 0-based. */
  @Input() page = 0;
  /** Total number of pages (at least 1). */
  @Input() totalPages = 1;
  /** Emits the 0-based page the user picked. */
  @Output() pageChange = new EventEmitter<number>();

  get pageNumbers(): number[] {
    return Array.from({ length: Math.max(1, this.totalPages) }, (_, i) => i + 1);
  }

  get isFirst(): boolean {
    return this.page <= 0;
  }

  get isLast(): boolean {
    return this.page >= this.totalPages - 1;
  }

  go(page: number): void {
    const clamped = Math.min(Math.max(0, page), Math.max(0, this.totalPages - 1));
    if (clamped !== this.page) this.pageChange.emit(clamped);
  }
}
