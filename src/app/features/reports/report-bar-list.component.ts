import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface BarItem {
  label: string;
  value: number;
}

/**
 * Single-series horizontal bar chart (magnitude by category) in one hue.
 * The card title names the series, so there is no legend. Each whole row is
 * the hover target; the value is also printed at the bar end, and a
 * visually-hidden table gives screen readers the same data.
 */
@Component({
  selector: 'app-report-bar-list',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <div class="bar-list" *ngIf="items.length > 0; else empty" aria-hidden="true">
      <div
        class="bar-row"
        *ngFor="let item of items"
        [matTooltip]="item.label + ': ' + item.value + ' ' + unit"
        matTooltipPosition="above"
      >
        <div class="bar-row__label" [title]="item.label">{{ item.label }}</div>
        <div class="bar-row__track">
          <div class="bar-row__fill" [style.width.%]="percent(item.value)"></div>
        </div>
        <div class="bar-row__value">{{ item.value }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ caption }}</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">{{ unit }}</th></tr></thead>
      <tbody>
        <tr *ngFor="let item of items"><td>{{ item.label }}</td><td>{{ item.value }}</td></tr>
      </tbody>
    </table>

    <ng-template #empty>
      <div class="bar-empty">No data for the selected filters</div>
    </ng-template>
  `,
  styles: [`
    .bar-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bar-row {
      display: grid;
      grid-template-columns: minmax(90px, 180px) 1fr 44px;
      align-items: center;
      gap: 12px;
      padding: 7px 8px;
      border-radius: 8px;
      cursor: default;
      transition: background 0.12s ease;

      &:hover {
        background: #f8fafc;

        .bar-row__fill {
          background: #0b7d73;
        }
      }
    }

    .bar-row__label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bar-row__track {
      height: 12px;
      position: relative;
    }

    .bar-row__fill {
      height: 100%;
      min-width: 2px;
      background: #0d9488;
      /* Anchored to the baseline on the left; rounded only at the data end. */
      border-radius: 0 4px 4px 0;
      transition: width 0.3s ease, background 0.12s ease;
    }

    .bar-row__value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .bar-empty {
      padding: 28px 0;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 560px) {
      .bar-row {
        grid-template-columns: 100px 1fr 36px;
        gap: 8px;
      }
    }
  `],
})
export class ReportBarListComponent {
  @Input() items: BarItem[] = [];
  /** Unit word for tooltips and the accessible table header, e.g. "hostels". */
  @Input() unit = '';
  @Input() caption = '';

  private get max(): number {
    return Math.max(1, ...this.items.map((i) => i.value));
  }

  percent(value: number): number {
    return (value / this.max) * 100;
  }
}
