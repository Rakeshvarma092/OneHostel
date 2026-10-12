import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';
import { HostelOnboardingRow, ONBOARDED_HOSTELS } from './onboarded-hostels';

export type { HostelOnboardingRow } from './onboarded-hostels';

@Component({
  selector: 'app-hostel-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    AppPaginationComponent,
    AppEmptyStateComponent,
  ],
  template: `
    <div class="onboarding-page">
      <div class="saas-card">
        <!-- Card Top Bar -->
        <div class="saas-card__header">
          <div class="saas-card__search">
            <mat-form-field appearance="outline" class="filter-field filter-field--search">
              <mat-icon matPrefix>search</mat-icon>
              <input
                matInput
                type="text"
                placeholder="Search hostels..."
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
          </div>

          <button class="primary-green-btn" (click)="onAddHostel()">
            <mat-icon>add</mat-icon>
            <span>New</span>
          </button>
        </div>

        <!-- Table Container -->
        <div class="table-responsive" *ngIf="filteredRows.length > 0">
          <table mat-table [dataSource]="pagedRows" class="saas-table">
            <ng-container matColumnDef="hostelId">
              <th mat-header-cell *matHeaderCellDef> Hostel ID </th>
              <td mat-cell *matCellDef="let element" class="font-semibold"> {{ element.hostelId }} </td>
            </ng-container>

            <ng-container matColumnDef="hostelName">
              <th mat-header-cell *matHeaderCellDef> Hostel Name </th>
              <td mat-cell *matCellDef="let element" class="font-medium"> {{ element.hostelName }} </td>
            </ng-container>

            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef> City / Branch </th>
              <td mat-cell *matCellDef="let element"> {{ element.city }} </td>
            </ng-container>

            <ng-container matColumnDef="contactPerson">
              <th mat-header-cell *matHeaderCellDef> Contact Person </th>
              <td mat-cell *matCellDef="let element"> {{ element.contactPerson }} </td>
            </ng-container>

            <ng-container matColumnDef="mobileNumber">
              <th mat-header-cell *matHeaderCellDef> Mobile Number </th>
              <td mat-cell *matCellDef="let element"> {{ element.mobileNumber }} </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Status </th>
              <td mat-cell *matCellDef="let element">
                <span
                  class="status-badge"
                  [ngClass]="{
                    'status-badge--active': element.status === 'Active',
                    'status-badge--pending': element.status === 'Pending',
                    'status-badge--blocked': element.status === 'Blocked'
                  }"
                >
                  {{ element.status }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdDate">
              <th mat-header-cell *matHeaderCellDef> Created Date </th>
              <td mat-cell *matCellDef="let element"> {{ element.createdDate }} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header"> Actions </th>
              <td mat-cell *matCellDef="let element" class="actions-cell">
                <button
                  type="button"
                  class="row-edit-btn"
                  aria-label="Edit hostel"
                  (click)="onEditHostel(element)"
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
            [headers]="['Hostel ID', 'Hostel Name', 'City / Branch', 'Contact Person', 'Mobile Number', 'Status', 'Created Date', 'Actions']"
            [message]="searchTerm ? 'No hostels match your search' : 'No Data Found'"
          ></app-empty-state>
        }

        <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="currentPage = $event"></app-pagination>
      </div>
    </div>
  `,
})
export class HostelOnboardingComponent {
  searchTerm = '';
  pageSize = 10;
  currentPage = 0;

  displayedColumns: string[] = [
    'hostelId',
    'hostelName',
    'city',
    'contactPerson',
    'mobileNumber',
    'status',
    'createdDate',
    'actions',
  ];

  rows: HostelOnboardingRow[] = ONBOARDED_HOSTELS;

  get filteredRows(): HostelOnboardingRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.rows;

    return this.rows.filter((row) =>
      [row.hostelName, row.city, row.contactPerson, row.mobileNumber].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  /** Clamps `currentPage` so it stays valid after a search or page-size change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage, this.totalPages - 1);
  }

  get pagedRows(): HostelOnboardingRow[] {
    const start = this.safePage * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  constructor(private router: Router) {}

  onAddHostel(): void {
    this.router.navigate(['/hostel-onboarding/new']);
  }

  onEditHostel(row: HostelOnboardingRow): void {
    this.router.navigate(['/hostel-onboarding', row.hostelId, 'edit']);
  }
}
