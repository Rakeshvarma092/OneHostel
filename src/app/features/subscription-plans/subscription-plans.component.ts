import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddPlanSidePanelComponent, FEATURE_CONFIG_ITEMS } from './add-plan-side-panel.component';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';
import { AuditLogService } from '../../core/services/audit-log.service';
import { diffForAudit } from '../../core/models/audit.models';

const PLAN_AUDIT_FIELDS: Record<string, string> = {
  planName: 'Plan Name',
  price: 'Price',
  billingCycle: 'Billing Cycle',
  residentLimit: 'Resident Limit',
  features: 'Enabled Features',
};

/** Plan fields in audit-friendly form: the feature toggles become a readable list. */
function planAuditValues(plan: SubscriptionPlanRow): Record<string, unknown> {
  const enabled = plan.featureConfig
    ? FEATURE_CONFIG_ITEMS.filter((f) => plan.featureConfig![f.id]).map((f) => f.name).join(', ')
    : undefined;
  return { ...plan, features: enabled };
}

export interface SubscriptionPlanRow {
  planId: string;
  planName: string;
  price: string;
  billingCycle: 'Monthly' | 'Yearly' | 'Quarterly';
  residentLimit: number;
  status: 'Active' | 'Inactive';
  createdDate: string;
  features?: string;
  featureConfig?: Record<string, boolean>;
}

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    AddPlanSidePanelComponent,
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
                placeholder="Search plans..."
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

          <button class="primary-green-btn" (click)="onAddPlan()">
            <mat-icon>add</mat-icon>
            <span>New</span>
          </button>
        </div>

        <!-- Plan Cards Grid -->
        <div class="plan-grid" *ngIf="filteredRows.length > 0">
          @for (plan of pagedRows; track plan.planId) {
            <article class="plan-card" [class.plan-card--inactive]="plan.status === 'Inactive'">
              <div class="plan-card__top">
                <div class="plan-card__icon">
                  <mat-icon>workspace_premium</mat-icon>
                </div>
                <span
                  class="status-badge"
                  [ngClass]="{
                    'status-badge--active': plan.status === 'Active',
                    'status-badge--blocked': plan.status === 'Inactive'
                  }"
                >
                  {{ plan.status }}
                </span>
              </div>

              <h3 class="plan-card__name">{{ plan.planName }}</h3>
              <span class="plan-card__id">{{ plan.planId }}</span>

              <div class="plan-card__price">
                <span class="plan-card__amount">{{ priceAmount(plan.price) }}</span>
                @if (pricePeriod(plan.price); as period) {
                  <span class="plan-card__period">/ {{ period }}</span>
                }
              </div>

              <ul class="plan-card__details">
                <li>
                  <mat-icon>autorenew</mat-icon>
                  <span class="plan-card__detail-label">Billing Cycle</span>
                  <span class="plan-card__detail-value">{{ plan.billingCycle }}</span>
                </li>
                <li>
                  <mat-icon>groups</mat-icon>
                  <span class="plan-card__detail-label">Resident Limit</span>
                  <span class="plan-card__detail-value">{{ plan.residentLimit }}</span>
                </li>
                <li>
                  <mat-icon>event</mat-icon>
                  <span class="plan-card__detail-label">Created Date</span>
                  <span class="plan-card__detail-value">{{ plan.createdDate }}</span>
                </li>
              </ul>

              @if (enabledFeatures(plan); as features) {
                @if (features.length) {
                  <div class="plan-card__features">
                    @for (feature of features.slice(0, 3); track feature) {
                      <span class="feature-chip">{{ feature }}</span>
                    }
                    @if (features.length > 3) {
                      <span class="feature-chip feature-chip--more">+{{ features.length - 3 }} more</span>
                    }
                  </div>
                }
              }

              <div class="plan-card__footer">
                <button
                  type="button"
                  class="plan-card__edit-btn"
                  [attr.aria-label]="'Edit plan ' + plan.planName"
                  (click)="onEditPlan(plan)"
                >
                  <mat-icon>edit</mat-icon>
                  <span>Edit Plan</span>
                </button>
              </div>
            </article>
          }
        </div>

        <!-- Empty State (cards view: no header row) -->
        @if (filteredRows.length === 0) {
          <app-empty-state
            class="plans-empty"
            [message]="searchTerm ? 'No plans match your search' : 'No Data Found'"
          ></app-empty-state>
        }

        <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="currentPage = $event"></app-pagination>
      </div>
    </div>

    <!-- Right Side Panel Drawer -->
    <app-add-plan-side-panel
      [isOpen]="isSidePanelOpen"
      [mode]="panelMode"
      [plan]="selectedPlan"
      [nextId]="nextPlanId"
      (closePanel)="isSidePanelOpen = false"
      (savePlan)="onSavePlan($event)"
    ></app-add-plan-side-panel>
  `,
  styles: [`
    /* Card, header, badges, empty state and pagination: src/styles/_table.scss */

    /* Plan Cards Grid */
    .plan-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }

    .plan-card {
      position: relative;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #0057E7, #0d9488);
      }

      &:hover {
        transform: translateY(-3px);
        border-color: #bfdbfe;
        box-shadow: 0 14px 30px -12px rgba(15, 34, 74, 0.18);
      }
    }

    .plan-card--inactive {
      background: #fafbfc;

      &::before {
        background: #cbd5e1;
      }

      .plan-card__icon {
        background: #f1f5f9;
        color: #94a3b8;
      }

      .plan-card__amount {
        color: #64748b;
      }
    }

    .plan-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .plan-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0057E7;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .plan-card__name {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }

    .plan-card__id {
      margin-top: 2px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.02em;
    }

    .plan-card__price {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin: 16px 0;
      padding-bottom: 16px;
      border-bottom: 1px dashed #e2e8f0;
    }

    .plan-card__amount {
      font-size: 26px;
      font-weight: 800;
      color: #0f224a;
      letter-spacing: -0.01em;
    }

    .plan-card__period {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
    }

    .plan-card__details {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        color: #0d9488;
      }
    }

    .plan-card__detail-label {
      color: #64748b;
    }

    .plan-card__detail-value {
      margin-left: auto;
      font-weight: 600;
      color: #0f172a;
    }

    .plan-card__features {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 14px;
    }

    .feature-chip {
      padding: 3px 9px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 11.5px;
      font-weight: 500;
    }

    .feature-chip--more {
      background: #eff6ff;
      color: #0057E7;
      font-weight: 600;
    }

    .plan-card__footer {
      margin-top: auto;
      padding-top: 18px;
    }

    .plan-card__edit-btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 12px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #99d5cf;
      color: #0d9488;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: #e6f7f5;
        border-color: #0d9488;
        color: #0b7d73;
      }

      &:focus-visible {
        outline: 2px solid #0d9488;
        outline-offset: 2px;
      }
    }

    @media (max-width: 600px) {
      .plan-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Cards view has no header row above the empty state, so outline it instead. */
    .plans-empty {
      border: 1px dashed #e2e8f0;
      border-radius: 16px;
    }
  `],
})
export class SubscriptionPlansComponent {
  searchTerm = '';
  // Divisible by 2, 3 and 4 so the last row of cards stays full at common grid widths.
  pageSize = 12;
  currentPage = 0;

  rows: SubscriptionPlanRow[] = [
    {
      planId: 'PLN-1001',
      planName: 'Basic',
      price: '₹999 / mo',
      billingCycle: 'Monthly',
      residentLimit: 50,
      status: 'Active',
      createdDate: '2026-08-01',
    },
    {
      planId: 'PLN-1002',
      planName: 'Standard',
      price: '₹1,999 / mo',
      billingCycle: 'Monthly',
      residentLimit: 150,
      status: 'Active',
      createdDate: '2026-08-01',
    },
    {
      planId: 'PLN-1003',
      planName: 'Premium',
      price: '₹19,999 / yr',
      billingCycle: 'Yearly',
      residentLimit: 500,
      status: 'Active',
      createdDate: '2026-08-01',
    },
    {
      planId: 'PLN-1004',
      planName: 'Legacy Basic',
      price: '₹799 / mo',
      billingCycle: 'Monthly',
      residentLimit: 50,
      status: 'Inactive',
      createdDate: '2025-11-12',
    },
  ];

  isSidePanelOpen = false;
  panelMode: 'add' | 'edit' = 'add';
  selectedPlan?: SubscriptionPlanRow;
  nextPlanId?: string;

  constructor(
    private snackBar: MatSnackBar,
    private auditLog: AuditLogService,
  ) {}

  get filteredRows(): SubscriptionPlanRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.rows;

    return this.rows.filter((row) =>
      [row.planName, row.billingCycle, row.status].some((value) => value.toLowerCase().includes(term)),
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  /** Clamps `currentPage` so it stays valid after a search or page-size change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage, this.totalPages - 1);
  }

  get pagedRows(): SubscriptionPlanRow[] {
    const start = this.safePage * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  /** "₹1,999 / mo" → "₹1,999" */
  priceAmount(price: string): string {
    return price.split('/')[0].trim();
  }

  /** "₹1,999 / mo" → "mo"; empty when the price has no period suffix. */
  pricePeriod(price: string): string {
    return price.split('/')[1]?.trim() ?? '';
  }

  enabledFeatures(plan: SubscriptionPlanRow): string[] {
    if (!plan.featureConfig) return [];
    return FEATURE_CONFIG_ITEMS.filter((f) => plan.featureConfig![f.id]).map((f) => f.name);
  }

  private getNextPlanId(): string {
    const numericIds = this.rows
      .map((r) => {
        const match = r.planId.match(/PLN-(\d+)/);
        return match ? parseInt(match[1], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 1000;
    return `PLN-${maxId + 1}`;
  }

  onAddPlan(): void {
    this.panelMode = 'add';
    this.selectedPlan = undefined;
    this.nextPlanId = this.getNextPlanId();
    this.isSidePanelOpen = true;
  }

  onEditPlan(row: SubscriptionPlanRow): void {
    this.panelMode = 'edit';
    this.selectedPlan = row;
    this.isSidePanelOpen = true;
  }

  onSavePlan(result: SubscriptionPlanRow): void {
    this.isSidePanelOpen = false;
    if (this.panelMode === 'add') {
      this.rows = [result, ...this.rows];
      this.auditLog.record('Create Plan', result.planName, {
        details: `${result.price} · ${result.billingCycle} · ${result.residentLimit} residents`,
      });
      this.snackBar.open('Subscription Plan created successfully', 'x', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['app-snackbar--success', 'green-snackbar'],
      });
    } else {
      const index = this.rows.findIndex((r) => r.planId === result.planId);
      if (index !== -1) {
        const previous = this.rows[index];
        const changes = diffForAudit(planAuditValues(previous), planAuditValues(result), PLAN_AUDIT_FIELDS);
        // Only an actual edit is logged; saving with nothing changed is not an audit event.
        if (changes.length) this.auditLog.record('Update Plan', result.planName, { changes });
        if (previous.status !== result.status) {
          this.auditLog.record(result.status === 'Active' ? 'Activate Plan' : 'Deactivate Plan', result.planName, {
            changes: [{ field: 'Status', oldValue: previous.status, newValue: result.status }],
          });
        }
        this.rows[index] = result;
        this.rows = [...this.rows];
        this.snackBar.open('Subscription Plan updated successfully', 'x', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['app-snackbar--success', 'green-snackbar'],
        });
      }
    }
  }
}
