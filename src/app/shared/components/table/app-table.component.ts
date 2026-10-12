// eslint-disable @typescript-eslint/no-explicit-any -- see class doc comment below
import { AfterViewInit, Component, ContentChild, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface AppTableColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  /** Optional formatter for plain-text cells; skip when using a custom cell template. */
  format?: (row: T) => string;
}

/**
 * Reusable data table: any feature supplies `columns` + `data` and gets
 * sorting, pagination and row-click for free. Custom cell markup (chips,
 * icons, nested buttons) is supplied via content-projected named templates,
 * so this component never needs to know about feature-specific rendering.
 *
 * The component's own row type is `any` on purpose: Angular's template
 * type-checker cannot reliably infer a class-level generic across three
 * separate inputs (columns/data/cellTemplates) at once, and a concrete row
 * interface has no index signature so it can't be structurally narrowed to
 * `Record<string, unknown>` either. Callers still get full type safety when
 * *building* their own `AppTableColumn<Resident>[]` before passing it in.
 */
@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatPaginatorModule, MatProgressSpinnerModule],
  templateUrl: './app-table.component.html',
  styleUrl: './app-table.component.scss',
})
export class AppTableComponent implements AfterViewInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() set data(value: any[]) {
    this.dataSource.data = value ?? [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() columns: AppTableColumn<any>[] = [];
  @Input() loading = false;
  @Input() pageSizeOptions = [10, 25, 50];
  @Input() pageSize = 10;
  @Input() emptyMessage = 'No records found.';
  /** Optional templates keyed by column key, projected from the parent for custom cells. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() cellTemplates: Record<string, TemplateRef<{ $implicit: any }>> = {};
  /** Template for a trailing "actions" column; omit to hide the column entirely. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ContentChild('rowActions') rowActionsTemplate?: TemplateRef<{ $implicit: any }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() rowClick = new EventEmitter<any>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly dataSource = new MatTableDataSource<any>([]);

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  get displayedColumns(): string[] {
    const keys = this.columns.map((c) => c.key);
    return this.rowActionsTemplate ? [...keys, 'actions'] : keys;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellValue(row: any, column: AppTableColumn<any>): string {
    return column.format ? column.format(row) : String(row[column.key] ?? '');
  }
}
