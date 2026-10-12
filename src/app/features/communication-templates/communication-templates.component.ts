import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import {
  COMMUNICATION_CHANNELS,
  CommunicationChannel,
  CommunicationTemplateRow,
} from './communication-template.models';
import { CommunicationTemplateService } from './communication-template.service';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';

@Component({
  selector: 'app-communication-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    AppPaginationComponent,
    AppEmptyStateComponent,
  ],
  template: `
    <div class="onboarding-page">
      <div class="saas-card">
        <!-- Card Top Bar -->
        <div class="saas-card__header">
          <div class="saas-card__filters">
            <mat-form-field appearance="outline" class="filter-field filter-field--search">
              <mat-icon matPrefix>search</mat-icon>
              <input
                matInput
                type="text"
                placeholder="Search templates..."
                [(ngModel)]="searchTerm"
              />
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

            <div class="channel-chips">
              <button
                type="button"
                class="channel-chip"
                [class.channel-chip--active]="channelFilter === 'All'"
                (click)="channelFilter = 'All'"
              >
                All
              </button>
              @for (ch of channels; track ch.value) {
                <button
                  type="button"
                  class="channel-chip"
                  [class.channel-chip--active]="channelFilter === ch.value"
                  (click)="channelFilter = ch.value"
                >
                  <mat-icon>{{ ch.icon }}</mat-icon>
                  {{ ch.value }}
                </button>
              }
            </div>
          </div>

          <button class="primary-green-btn" (click)="onAddTemplate()">
            <mat-icon>add</mat-icon>
            <span>New</span>
          </button>
        </div>

        <!-- Table Container -->
        <div class="table-responsive" *ngIf="filteredRows.length > 0">
          <table mat-table [dataSource]="pagedRows" class="saas-table">
            <ng-container matColumnDef="templateId">
              <th mat-header-cell *matHeaderCellDef> Template ID </th>
              <td mat-cell *matCellDef="let element" class="font-semibold"> {{ element.templateId }} </td>
            </ng-container>

            <ng-container matColumnDef="templateName">
              <th mat-header-cell *matHeaderCellDef> Template Name </th>
              <td mat-cell *matCellDef="let element" class="font-medium"> {{ element.templateName }} </td>
            </ng-container>

            <ng-container matColumnDef="channel">
              <th mat-header-cell *matHeaderCellDef> Communication Type </th>
              <td mat-cell *matCellDef="let element">
                <span class="channel-tag">
                  <mat-icon>{{ channelIcon(element.channel) }}</mat-icon>
                  {{ element.channel }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="trigger">
              <th mat-header-cell *matHeaderCellDef> Trigger / Event </th>
              <td mat-cell *matCellDef="let element"> {{ element.trigger }} </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Status </th>
              <td mat-cell *matCellDef="let element">
                <span
                  class="status-badge"
                  [ngClass]="{
                    'status-badge--active': element.status === 'Active',
                    'status-badge--blocked': element.status === 'Inactive'
                  }"
                >
                  {{ element.status }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="lastModified">
              <th mat-header-cell *matHeaderCellDef> Last Modified </th>
              <td mat-cell *matCellDef="let element"> {{ element.lastModified | date: 'dd-MMM-yy' }} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header"> Actions </th>
              <td mat-cell *matCellDef="let element" class="actions-cell">
                <button
                  type="button"
                  class="row-edit-btn"
                  aria-label="Edit template"
                  matTooltip="Edit"
                  (click)="onEditTemplate(element)"
                >
                  <mat-icon>edit</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          </table>
        </div>

        <!-- Empty State -->
        @if (filteredRows.length === 0) {
          <app-empty-state
            [headers]="['Template ID', 'Template Name', 'Communication Type', 'Trigger / Event', 'Status', 'Last Modified', 'Actions']"
            [message]="searchTerm || channelFilter !== 'All' ? 'No templates match your filters' : 'No Data Found'"
          ></app-empty-state>
        }

        <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="currentPage = $event"></app-pagination>
      </div>
    </div>
  `,
  styles: [`
    /* Table, card, badges, empty state and pagination: src/styles/_table.scss */

    .saas-card__filters {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .channel-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .channel-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }

      &:hover {
        border-color: #0d9488;
        color: #0d9488;
      }
    }

    .channel-chip--active {
      background: #e6f7f5;
      border-color: #0d9488;
      color: #0d9488;
    }

    .channel-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #64748b;
      }
    }
  `],
})
export class CommunicationTemplatesComponent {
  searchTerm = '';
  channelFilter: CommunicationChannel | 'All' = 'All';
  pageSize = 10;
  currentPage = 0;

  readonly channels = COMMUNICATION_CHANNELS;

  displayedColumns: string[] = [
    'templateId',
    'templateName',
    'channel',
    'trigger',
    'status',
    'lastModified',
    'actions',
  ];

  constructor(
    private router: Router,
    private templateService: CommunicationTemplateService,
  ) {}

  get rows(): CommunicationTemplateRow[] {
    return this.templateService.templates;
  }

  channelIcon(channel: CommunicationChannel): string {
    return COMMUNICATION_CHANNELS.find((c) => c.value === channel)?.icon ?? 'chat';
  }

  get filteredRows(): CommunicationTemplateRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (this.channelFilter !== 'All' && row.channel !== this.channelFilter) return false;
      if (!term) return true;
      return [row.templateId, row.templateName, row.templateCode, row.trigger, row.status].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  /** Clamps `currentPage` so it stays valid after a search or filter change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage, this.totalPages - 1);
  }

  get pagedRows(): CommunicationTemplateRow[] {
    const start = this.safePage * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  onAddTemplate(): void {
    this.router.navigate(['/communication-templates', 'new']);
  }

  onEditTemplate(row: CommunicationTemplateRow): void {
    this.router.navigate(['/communication-templates', row.templateId, 'edit']);
  }
}
