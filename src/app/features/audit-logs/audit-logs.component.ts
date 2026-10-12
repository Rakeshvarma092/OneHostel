import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuditLogService } from '../../core/services/audit-log.service';
import {
  AUDIT_EVENT_NAMES,
  AUDIT_MODULES,
  AuditLog,
  auditAction,
  auditModule,
} from '../../core/models/audit.models';
import { AuditLogDetailPanelComponent } from './audit-log-detail-panel.component';
import { ReportExportService } from '../reports/report-export.service';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';

const ALL = 'All';

const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    AuditLogDetailPanelComponent,
    AppPaginationComponent,
    AppEmptyStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="onboarding-page">
      <div class="saas-card">
        <!-- Filters -->
        <div class="saas-card__header">
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field filter-field--search">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput type="text" placeholder="Search log ID, user, entity, IP..." [(ngModel)]="searchTerm" (ngModelChange)="currentPage = 0" />
              <button
                *ngIf="searchTerm"
                mat-icon-button
                matSuffix
                type="button"
                class="filter-clear-btn"
                aria-label="Clear search"
                (click)="searchTerm = ''"
              >
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field filter-field--date">
              <mat-date-range-input [rangePicker]="picker">
                <input matStartDate placeholder="From" [(ngModel)]="dateFrom" (ngModelChange)="currentPage = 0" />
                <input matEndDate placeholder="To" [(ngModel)]="dateTo" (ngModelChange)="currentPage = 0" />
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-date-range-picker #picker></mat-date-range-picker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-select [(ngModel)]="moduleFilter" (ngModelChange)="onModuleChange()" aria-label="Module">
                <mat-option value="All">All Modules</mat-option>
                <mat-option *ngFor="let m of modules" [value]="m">{{ m }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-select [(ngModel)]="eventFilter" (ngModelChange)="currentPage = 0" aria-label="Action">
                <mat-option value="All">All Actions</mat-option>
                <mat-option *ngFor="let e of eventOptions" [value]="e">{{ e }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-select [(ngModel)]="statusFilter" (ngModelChange)="currentPage = 0" aria-label="Status">
                <mat-option value="All">All Statuses</mat-option>
                <mat-option value="Success">Success</mat-option>
                <mat-option value="Failed">Failed</mat-option>
              </mat-select>
            </mat-form-field>

            <button type="button" class="filter-reset" *ngIf="hasFilters" (click)="resetFilters()">
              <mat-icon>restart_alt</mat-icon> Reset
            </button>
          </div>

          <button type="button" class="btn-export" [disabled]="filteredLogs.length === 0" (click)="exportExcel()">
            <mat-icon>table_view</mat-icon>
            <span>Export Excel</span>
          </button>
        </div>

        <!-- Table -->
        <div class="table-responsive" *ngIf="filteredLogs.length > 0">
          <table mat-table [dataSource]="pagedLogs" class="saas-table">
            <ng-container matColumnDef="logId">
              <th mat-header-cell *matHeaderCellDef> Log ID </th>
              <td mat-cell *matCellDef="let el" class="font-semibold"> {{ el.logId }} </td>
            </ng-container>

            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef> Date &amp; Time </th>
              <td mat-cell *matCellDef="let el"> {{ el.timestamp | date: 'dd-MMM-yy HH:mm' }} </td>
            </ng-container>

            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef> User </th>
              <td mat-cell *matCellDef="let el" class="font-medium"> {{ el.user }} </td>
            </ng-container>

            <ng-container matColumnDef="module">
              <th mat-header-cell *matHeaderCellDef> Module </th>
              <td mat-cell *matCellDef="let el"> {{ module(el) }} </td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef> Action </th>
              <td mat-cell *matCellDef="let el">
                <span class="action-tag action-tag--{{ actionClass(el) }}">{{ action(el) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="entity">
              <th mat-header-cell *matHeaderCellDef> Entity </th>
              <td mat-cell *matCellDef="let el" class="entity-cell" [title]="el.entity"> {{ el.entity }} </td>
            </ng-container>

            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef> IP Address </th>
              <td mat-cell *matCellDef="let el" class="mono"> {{ el.ipAddress }} </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Status </th>
              <td mat-cell *matCellDef="let el">
                <span class="status-badge" [class.status-badge--success]="el.status === 'Success'" [class.status-badge--danger]="el.status === 'Failed'">
                  {{ el.status }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header"> Actions </th>
              <td mat-cell *matCellDef="let el" class="actions-cell">
                <span
                  class="changes-pill"
                  *ngIf="el.changes?.length"
                  [matTooltip]="el.changes.length + ' field change' + (el.changes.length > 1 ? 's' : '') + ' recorded'"
                >
                  <mat-icon>difference</mat-icon>{{ el.changes.length }}
                </span>
                <button type="button" class="row-edit-btn" matTooltip="View" aria-label="View log details" (click)="openLog(el)">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns;"
              class="table-row"
              [class.table-row--failed]="row.status === 'Failed'"
            ></tr>
          </table>
        </div>

        <!-- Empty State -->
        @if (filteredLogs.length === 0) {
          <app-empty-state
            icon="manage_search"
            [headers]="['Log ID', 'Date & Time', 'User', 'Module', 'Action', 'Entity', 'IP Address', 'Status', 'Actions']"
            [message]="hasFilters ? 'No audit entries match your filters' : 'No Data Found'"
          ></app-empty-state>
        }

        <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="setPage($event)">
          <div class="result-count">
            Showing {{ filteredLogs.length === 0 ? 0 : safePage * pageSize + 1 }}–{{ Math.min((safePage + 1) * pageSize, filteredLogs.length) }}
            of {{ filteredLogs.length }}
          </div>
        </app-pagination>
      </div>
    </div>

    <app-audit-log-detail-panel
      [isOpen]="isPanelOpen"
      [log]="selectedLog"
      (closePanel)="isPanelOpen = false"
    ></app-audit-log-detail-panel>
  `,
  styles: [`
    /* Table, card, badges, empty state and pagination: src/styles/_table.scss */

    /* Filters on the left, Export pinned top-right (wraps under on small screens). */
    .saas-card__header {
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: nowrap;
    }

    .filters {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #15803d;
      }

      &:hover:not(:disabled) {
        background: #f8fafc;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .saas-table .table-row--failed {
      background: #fffafb;
    }

    .entity-cell {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px !important;
    }

    .action-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;
    }

    .action-tag--create { background: #eff6ff; color: #1d4ed8; }
    .action-tag--update { background: #f5f3ff; color: #6d28d9; }
    .action-tag--activate { background: #e6f7f5; color: #0f766e; }
    .action-tag--deactivate { background: #fff7ed; color: #c2410c; }
    .action-tag--auth { background: #f1f5f9; color: #334155; }

    .changes-pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      margin-right: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #6d28d9;
      vertical-align: middle;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    @media (max-width: 900px) {
      .saas-card__header {
        flex-direction: column;
      }

      .filters {
        width: 100%;
      }
    }
  `],
})
export class AuditLogsComponent implements OnInit {
  readonly Math = Math;
  readonly modules = AUDIT_MODULES;
  readonly module = auditModule;
  readonly action = auditAction;

  searchTerm = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  moduleFilter = ALL;
  eventFilter = ALL;
  statusFilter = ALL;

  pageSize = 10;
  currentPage = 0;

  displayedColumns = ['logId', 'timestamp', 'user', 'module', 'action', 'entity', 'ipAddress', 'status', 'actions'];

  isPanelOpen = false;
  selectedLog?: AuditLog;

  constructor(
    private auditLog: AuditLogService,
    private exporter: ReportExportService,
    private route: ActivatedRoute,
  ) {}

  /** Other screens deep-link here with ?module=&event=&q= to show a pre-filtered history. */
  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const module = params.get('module');
    const event = params.get('event');
    if (module && (AUDIT_MODULES as string[]).includes(module)) this.moduleFilter = module;
    if (event && (AUDIT_EVENT_NAMES as string[]).includes(event)) this.eventFilter = event;
    this.searchTerm = params.get('q') ?? '';
  }

  /** Action options narrow to the chosen module's events. */
  get eventOptions(): string[] {
    return this.moduleFilter === ALL
      ? AUDIT_EVENT_NAMES
      : AUDIT_EVENT_NAMES.filter((e) => auditModule({ event: e } as AuditLog) === this.moduleFilter);
  }

  onModuleChange(): void {
    if (this.eventFilter !== ALL && !this.eventOptions.includes(this.eventFilter)) this.eventFilter = ALL;
    this.currentPage = 0;
  }

  get hasFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.dateFrom ||
      this.dateTo ||
      this.moduleFilter !== ALL ||
      this.eventFilter !== ALL ||
      this.statusFilter !== ALL
    );
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.dateFrom = this.dateTo = null;
    this.moduleFilter = this.eventFilter = this.statusFilter = ALL;
    this.currentPage = 0;
  }

  actionClass(log: AuditLog): string {
    const action = auditAction(log);
    if (action === 'Create') return 'create';
    if (action === 'Update') return 'update';
    if (action === 'Activate') return 'activate';
    if (action === 'Deactivate') return 'deactivate';
    return 'auth';
  }

  get filteredLogs(): AuditLog[] {
    const term = this.searchTerm.trim().toLowerCase();
    const from = this.dateFrom ? toIsoDate(this.dateFrom) : '';
    const to = this.dateTo ? toIsoDate(this.dateTo) : '';

    return this.auditLog.logs.filter((l) => {
      const day = l.timestamp.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (this.moduleFilter !== ALL && auditModule(l) !== this.moduleFilter) return false;
      if (this.eventFilter !== ALL && l.event !== this.eventFilter) return false;
      if (this.statusFilter !== ALL && l.status !== this.statusFilter) return false;
      if (!term) return true;
      return [l.logId, l.user, l.entity, l.ipAddress, l.event, l.details ?? ''].some((v) =>
        v.toLowerCase().includes(term),
      );
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize));
  }

  /** Clamps the page so it stays valid after a filter change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage, this.totalPages - 1);
  }

  setPage(page: number): void {
    this.currentPage = Math.min(Math.max(0, page), this.totalPages - 1);
  }

  get pagedLogs(): AuditLog[] {
    const start = this.safePage * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  openLog(log: AuditLog): void {
    this.selectedLog = log;
    this.isPanelOpen = true;
  }

  exportExcel(): void {
    const changesText = (l: AuditLog) =>
      (l.changes ?? []).map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ');

    this.exporter.exportExcel({
      title: 'Audit Logs',
      filterSummary: '',
      rows: this.filteredLogs,
      columns: [
        { header: 'Log ID', value: (l: AuditLog) => l.logId },
        { header: 'Date & Time', value: (l: AuditLog) => formatDate(l.timestamp, 'dd-MMM-yy HH:mm:ss', 'en-US') },
        { header: 'User', value: (l: AuditLog) => l.user },
        { header: 'Module', value: (l: AuditLog) => auditModule(l) },
        { header: 'Action', value: (l: AuditLog) => auditAction(l) },
        { header: 'Entity', value: (l: AuditLog) => l.entity },
        { header: 'IP Address', value: (l: AuditLog) => l.ipAddress },
        { header: 'Status', value: (l: AuditLog) => l.status },
        { header: 'Details', value: (l: AuditLog) => l.details ?? '' },
        { header: 'Changes (Old → New)', value: changesText },
      ],
    });
  }
}
