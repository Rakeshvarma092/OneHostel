import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  HostelSubscription,
  PAYMENT_STATUSES,
  PaymentTransaction,
  SUBSCRIPTION_STATUSES,
  hasInvoice,
} from './subscription-payment.models';
import { SubscriptionDetailPanelComponent } from './subscription-detail-panel.component';
import { InvoiceService } from './invoice.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { AppPaginationComponent } from '../../shared/components/pagination/app-pagination.component';
import { AppEmptyStateComponent } from '../../shared/components/empty-state/app-empty-state.component';
import { statusTone } from '../../shared/constants/status.constants';

type TabKey = 'subscriptions' | 'payments';

const EXPIRING_WINDOW_DAYS = 30;

@Component({
  selector: 'app-subscription-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    SubscriptionDetailPanelComponent,
    AppPaginationComponent,
    AppEmptyStateComponent,
  ],
  template: `
    <div class="onboarding-page">
      <!-- Summary tiles -->
      <div class="stat-row">
        <button type="button" class="stat-tile" (click)="applyQuickFilter('subscriptions', 'Active')">
          <div class="stat-tile__icon stat-tile__icon--success"><mat-icon>verified</mat-icon></div>
          <div>
            <div class="stat-tile__value">{{ countByStatus('Active') }}</div>
            <div class="stat-tile__label">Active Subscriptions</div>
          </div>
        </button>
        <button type="button" class="stat-tile" (click)="applyQuickFilter('subscriptions', 'Payment Pending')">
          <div class="stat-tile__icon stat-tile__icon--warning"><mat-icon>pending_actions</mat-icon></div>
          <div>
            <div class="stat-tile__value">{{ countByStatus('Payment Pending') }}</div>
            <div class="stat-tile__label">Payment Pending</div>
          </div>
        </button>
        <div class="stat-tile stat-tile--static">
          <div class="stat-tile__icon stat-tile__icon--danger"><mat-icon>event_busy</mat-icon></div>
          <div>
            <div class="stat-tile__value">{{ expiringSoonCount }}</div>
            <div class="stat-tile__label">Expiring in {{ expiringWindowDays }} days</div>
          </div>
        </div>
        <button type="button" class="stat-tile" (click)="applyQuickFilter('payments', 'Paid')">
          <div class="stat-tile__icon stat-tile__icon--info"><mat-icon>account_balance_wallet</mat-icon></div>
          <div>
            <div class="stat-tile__value">{{ totalCollected | currency: 'INR' : 'symbol' : '1.0-0' }}</div>
            <div class="stat-tile__label">Total Collected</div>
          </div>
        </button>
      </div>

      <div class="saas-card">
        <!-- Tabs -->
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            [class.tab--active]="activeTab === 'subscriptions'"
            [attr.aria-selected]="activeTab === 'subscriptions'"
            (click)="activeTab = 'subscriptions'"
          >
            <mat-icon>card_membership</mat-icon>
            Subscriptions
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            [class.tab--active]="activeTab === 'payments'"
            [attr.aria-selected]="activeTab === 'payments'"
            (click)="activeTab = 'payments'"
          >
            <mat-icon>receipt_long</mat-icon>
            Payments
          </button>
        </div>

        <!-- Filters -->
        <div class="saas-card__header">
          <mat-form-field appearance="outline" class="filter-field filter-field--search">
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              type="text"
              [placeholder]="activeTab === 'subscriptions' ? 'Search subscription, hostel, plan...' : 'Search transaction, hostel, invoice...'"
              [(ngModel)]="search[activeTab]"
            />
            <button
              *ngIf="search[activeTab]"
              mat-icon-button
              matSuffix
              type="button"
              class="filter-clear-btn"
              aria-label="Clear search"
              (click)="search[activeTab] = ''"
            >
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="statusFilter[activeTab]" aria-label="Filter by status">
              <mat-option value="All">All Statuses</mat-option>
              <mat-option *ngFor="let s of statusOptions" [value]="s">
                {{ s }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          @if (hasFilters) {
            <button type="button" class="filter-reset" (click)="resetFilters()">
              <mat-icon>restart_alt</mat-icon> Reset
            </button>
          }
        </div>

        <!-- Subscriptions table -->
        <ng-container *ngIf="activeTab === 'subscriptions'">
          <div class="table-responsive" *ngIf="filteredSubscriptions.length > 0">
            <table mat-table [dataSource]="pagedSubscriptions" class="saas-table">
              <ng-container matColumnDef="subscriptionId">
                <th mat-header-cell *matHeaderCellDef> Subscription ID </th>
                <td mat-cell *matCellDef="let el" class="font-semibold"> {{ el.subscriptionId }} </td>
              </ng-container>

              <ng-container matColumnDef="hostel">
                <th mat-header-cell *matHeaderCellDef> Hostel </th>
                <td mat-cell *matCellDef="let el" class="font-medium"> {{ el.hostelName }} </td>
              </ng-container>

              <ng-container matColumnDef="plan">
                <th mat-header-cell *matHeaderCellDef> Plan </th>
                <td mat-cell *matCellDef="let el"> {{ el.planName }} </td>
              </ng-container>

              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef> Start Date </th>
                <td mat-cell *matCellDef="let el"> {{ el.startDate | date: 'dd-MMM-yy' }} </td>
              </ng-container>

              <ng-container matColumnDef="expiryDate">
                <th mat-header-cell *matHeaderCellDef> Expiry Date </th>
                <td mat-cell *matCellDef="let el">
                  <span [class.expiring-soon]="isExpiringSoon(el)" [matTooltip]="isExpiringSoon(el) ? 'Expires within ' + expiringWindowDays + ' days' : ''">
                    {{ el.expiryDate | date: 'dd-MMM-yy' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="billingCycle">
                <th mat-header-cell *matHeaderCellDef> Billing Cycle </th>
                <td mat-cell *matCellDef="let el"> {{ el.billingCycle }} </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef class="num"> Amount </th>
                <td mat-cell *matCellDef="let el" class="num">
                  {{ el.amount > 0 ? (el.amount | currency: 'INR' : 'symbol' : '1.0-2') : 'Free' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="paymentStatus">
                <th mat-header-cell *matHeaderCellDef> Payment Status </th>
                <td mat-cell *matCellDef="let el">
                  <span class="status-badge status-badge--{{ tone(el.paymentStatus) }}">{{ el.paymentStatus }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef> Subscription Status </th>
                <td mat-cell *matCellDef="let el">
                  <span class="status-badge status-badge--{{ tone(el.status) }}">{{ el.status }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-header"> Actions </th>
                <td mat-cell *matCellDef="let el" class="actions-cell">
                  <button type="button" class="row-edit-btn" matTooltip="View" aria-label="View subscription" (click)="openSubscription(el)">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="subscriptionColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: subscriptionColumns;" class="table-row"></tr>
            </table>
          </div>

          @if (filteredSubscriptions.length === 0) {
            <app-empty-state [headers]="subscriptionHeaders" [message]="emptyMessage"></app-empty-state>
          }
        </ng-container>

        <!-- Payments table -->
        <ng-container *ngIf="activeTab === 'payments'">
          <div class="table-responsive" *ngIf="filteredPayments.length > 0">
            <table mat-table [dataSource]="pagedPayments" class="saas-table">
              <ng-container matColumnDef="transactionId">
                <th mat-header-cell *matHeaderCellDef> Transaction ID </th>
                <td mat-cell *matCellDef="let el" class="font-semibold"> {{ el.transactionId }} </td>
              </ng-container>

              <ng-container matColumnDef="subscriptionId">
                <th mat-header-cell *matHeaderCellDef> Subscription ID </th>
                <td mat-cell *matCellDef="let el">
                  <button type="button" class="link-cell" (click)="openSubscriptionById(el.subscriptionId)">
                    {{ el.subscriptionId }}
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="hostel">
                <th mat-header-cell *matHeaderCellDef> Hostel </th>
                <td mat-cell *matCellDef="let el" class="font-medium"> {{ el.hostelName }} </td>
              </ng-container>

              <ng-container matColumnDef="plan">
                <th mat-header-cell *matHeaderCellDef> Plan </th>
                <td mat-cell *matCellDef="let el"> {{ el.planName }} </td>
              </ng-container>

              <ng-container matColumnDef="totalAmount">
                <th mat-header-cell *matHeaderCellDef class="num"> Total Amount </th>
                <td mat-cell *matCellDef="let el" class="num font-medium"> {{ el.totalAmount | currency: 'INR' : 'symbol' : '1.2-2' }} </td>
              </ng-container>

              <ng-container matColumnDef="paymentDate">
                <th mat-header-cell *matHeaderCellDef> Payment Date </th>
                <td mat-cell *matCellDef="let el"> {{ el.paymentDate | date: 'dd-MMM-yy' }} </td>
              </ng-container>

              <ng-container matColumnDef="paymentMethod">
                <th mat-header-cell *matHeaderCellDef> Payment Method </th>
                <td mat-cell *matCellDef="let el"> {{ el.paymentMethod }} </td>
              </ng-container>

              <ng-container matColumnDef="paymentGateway">
                <th mat-header-cell *matHeaderCellDef> Payment Gateway </th>
                <td mat-cell *matCellDef="let el"> {{ el.paymentGateway }} </td>
              </ng-container>

              <ng-container matColumnDef="paymentStatus">
                <th mat-header-cell *matHeaderCellDef> Payment Status </th>
                <td mat-cell *matCellDef="let el">
                  <span class="status-badge status-badge--{{ tone(el.paymentStatus) }}">{{ el.paymentStatus }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="invoiceNumber">
                <th mat-header-cell *matHeaderCellDef> Invoice Number </th>
                <td mat-cell *matCellDef="let el"> {{ el.invoiceNumber || '—' }} </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-header"> Actions </th>
                <td mat-cell *matCellDef="let el" class="actions-cell">
                  <button
                    type="button"
                    class="row-edit-btn"
                    [disabled]="!hasInvoice(el)"
                    [matTooltip]="hasInvoice(el) ? 'View Invoice' : 'No invoice for ' + el.paymentStatus.toLowerCase() + ' payments'"
                    aria-label="View invoice"
                    (click)="invoices.viewInvoice(el)"
                  >
                    <mat-icon>description</mat-icon>
                  </button>
                  <button
                    type="button"
                    class="row-edit-btn"
                    [disabled]="!hasInvoice(el)"
                    [matTooltip]="hasInvoice(el) ? 'Download Receipt' : ''"
                    aria-label="Download receipt"
                    (click)="invoices.downloadReceipt(el)"
                  >
                    <mat-icon>download</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="paymentColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: paymentColumns;" class="table-row"></tr>
            </table>
          </div>

          @if (filteredPayments.length === 0) {
            <app-empty-state [headers]="paymentHeaders" [message]="emptyMessage"></app-empty-state>
          }
        </ng-container>

        <app-pagination [page]="safePage" [totalPages]="totalPages" (pageChange)="setPage($event)"></app-pagination>
      </div>
    </div>

    <app-subscription-detail-panel
      [isOpen]="isPanelOpen"
      [subscription]="selectedSubscription"
      [allPayments]="payments"
      [allSubscriptions]="subscriptions"
      (closePanel)="isPanelOpen = false"
    ></app-subscription-detail-panel>
  `,
  styles: [`
    /* Card, table, badges, empty state and pagination: src/styles/_table.scss */

    /* Summary tiles */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    @media (max-width: 1100px) {
      .stat-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .stat-row {
        grid-template-columns: 1fr;
      }
    }

    .stat-tile {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      background: #ffffff;
      border: none;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(15, 34, 74, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03);
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: box-shadow 0.15s ease, transform 0.15s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 30px rgba(15, 34, 74, 0.08), 0 0 0 1px rgba(13, 148, 136, 0.25);
      }
    }

    .stat-tile--static {
      cursor: default;

      &:hover {
        transform: none;
        box-shadow: 0 10px 30px rgba(15, 34, 74, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03);
      }
    }

    .stat-tile__icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .stat-tile__icon--success { background: #e6f7f5; color: #0d9488; }
    .stat-tile__icon--warning { background: #fff7ed; color: #d97706; }
    .stat-tile__icon--danger { background: #ffebf0; color: #e11d48; }
    .stat-tile__icon--info { background: #eff6ff; color: #0057e7; }

    .stat-tile__value {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .stat-tile__label {
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
    }

    /* Tabs sit above the filters, so the card needs less top padding. */
    .onboarding-page .saas-card {
      padding-top: 20px;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: #0f172a;
      }
    }

    .tab--active {
      color: #0d9488;
      border-bottom-color: #0d9488;

      &:hover {
        color: #0d9488;
      }
    }

    .saas-table .num {
      text-align: right;
    }

    .expiring-soon {
      color: #d97706;
      font-weight: 600;
    }

    .link-cell {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      color: #0057e7;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  `],
})
export class SubscriptionPaymentsComponent {
  activeTab: TabKey = 'subscriptions';
  pageSize = 10;

  /** Search, status filter and page are kept per tab so switching tabs doesn't lose them. */
  search: Record<TabKey, string> = { subscriptions: '', payments: '' };
  statusFilter: Record<TabKey, string> = { subscriptions: 'All', payments: 'All' };
  currentPage: Record<TabKey, number> = { subscriptions: 0, payments: 0 };

  readonly expiringWindowDays = EXPIRING_WINDOW_DAYS;
  readonly hasInvoice = hasInvoice;
  readonly tone = statusTone;

  /** Live lists from the shared store, so recorded payments show up everywhere at once. */
  get subscriptions(): HostelSubscription[] {
    return this.store.subscriptions;
  }

  get payments(): PaymentTransaction[] {
    return this.store.payments;
  }

  subscriptionColumns = [
    'subscriptionId',
    'hostel',
    'plan',
    'startDate',
    'expiryDate',
    'billingCycle',
    'amount',
    'paymentStatus',
    'status',
    'actions',
  ];
  subscriptionHeaders = [
    'Subscription ID',
    'Hostel',
    'Plan',
    'Start Date',
    'Expiry Date',
    'Billing Cycle',
    'Amount',
    'Payment Status',
    'Subscription Status',
    'Actions',
  ];

  paymentColumns = [
    'transactionId',
    'subscriptionId',
    'hostel',
    'plan',
    'totalAmount',
    'paymentDate',
    'paymentMethod',
    'paymentGateway',
    'paymentStatus',
    'invoiceNumber',
    'actions',
  ];
  paymentHeaders = [
    'Transaction ID',
    'Subscription ID',
    'Hostel',
    'Plan',
    'Total Amount',
    'Payment Date',
    'Payment Method',
    'Payment Gateway',
    'Payment Status',
    'Invoice Number',
    'Actions',
  ];

  isPanelOpen = false;
  /** Tracked by ID so the panel shows the latest data after a payment updates the subscription. */
  private selectedSubscriptionId?: string;

  get selectedSubscription(): HostelSubscription | undefined {
    return this.selectedSubscriptionId ? this.store.bySubscriptionId(this.selectedSubscriptionId) : undefined;
  }

  constructor(
    public invoices: InvoiceService,
    private store: SubscriptionPaymentService,
  ) {}

  get statusOptions(): string[] {
    return this.activeTab === 'subscriptions' ? SUBSCRIPTION_STATUSES : PAYMENT_STATUSES;
  }

  // ---- Summary tiles ----

  countByStatus(status: string): number {
    return this.subscriptions.filter((s) => s.status === status).length;
  }

  get totalCollected(): number {
    return this.payments.filter((p) => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.totalAmount, 0);
  }

  /** Live subscriptions (not already ended/cancelled) whose expiry falls within the window. */
  isExpiringSoon(sub: HostelSubscription): boolean {
    if (!['Active', 'Trial', 'Payment Pending'].includes(sub.status)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = (new Date(`${sub.expiryDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000;
    return days >= 0 && days <= EXPIRING_WINDOW_DAYS;
  }

  get expiringSoonCount(): number {
    return this.subscriptions.filter((s) => this.isExpiringSoon(s)).length;
  }

  /** True when the current tab has a search term or a status filter applied. */
  get hasFilters(): boolean {
    return !!this.search[this.activeTab].trim() || this.statusFilter[this.activeTab] !== 'All';
  }

  /** Clears the current tab's search and status filter. */
  resetFilters(): void {
    this.search[this.activeTab] = '';
    this.statusFilter[this.activeTab] = 'All';
    this.currentPage[this.activeTab] = 0;
  }

  applyQuickFilter(tab: TabKey, status: string): void {
    this.activeTab = tab;
    this.search[tab] = '';
    this.statusFilter[tab] = status;
    this.currentPage[tab] = 0;
  }

  // ---- Filtering ----

  private matches(term: string, values: (string | undefined)[]): boolean {
    return values.some((v) => !!v && v.toLowerCase().includes(term));
  }

  get filteredSubscriptions(): HostelSubscription[] {
    const term = this.search.subscriptions.trim().toLowerCase();
    const status = this.statusFilter.subscriptions;
    return this.subscriptions.filter(
      (s) =>
        (status === 'All' || s.status === status) &&
        (!term || this.matches(term, [s.subscriptionId, s.hostelName, s.planName, s.billingCycle])),
    );
  }

  get filteredPayments(): PaymentTransaction[] {
    const term = this.search.payments.trim().toLowerCase();
    const status = this.statusFilter.payments;
    return this.payments
      .filter(
        (p) =>
          (status === 'All' || p.paymentStatus === status) &&
          (!term ||
            this.matches(term, [
              p.transactionId,
              p.subscriptionId,
              p.hostelName,
              p.planName,
              p.invoiceNumber,
              p.paymentMethod,
              p.paymentGateway,
            ])),
      )
      // Newest first, so earlier billing periods sit below the current ones.
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.transactionId.localeCompare(a.transactionId));
  }

  // ---- Pagination (for whichever tab is active) ----

  private get activeCount(): number {
    return this.activeTab === 'subscriptions' ? this.filteredSubscriptions.length : this.filteredPayments.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.activeCount / this.pageSize));
  }

  get emptyMessage(): string {
    return this.search[this.activeTab] || this.statusFilter[this.activeTab] !== 'All'
      ? 'No records match your filters'
      : 'No Data Found';
  }

  /** Clamps the page so it stays valid after a search or filter change shrinks the result set. */
  get safePage(): number {
    return Math.min(this.currentPage[this.activeTab], this.totalPages - 1);
  }

  setPage(page: number): void {
    this.currentPage[this.activeTab] = Math.min(Math.max(0, page), this.totalPages - 1);
  }

  get pagedSubscriptions(): HostelSubscription[] {
    const start = this.safePage * this.pageSize;
    return this.filteredSubscriptions.slice(start, start + this.pageSize);
  }

  get pagedPayments(): PaymentTransaction[] {
    const start = this.safePage * this.pageSize;
    return this.filteredPayments.slice(start, start + this.pageSize);
  }

  // ---- Detail panel ----

  openSubscription(sub: HostelSubscription): void {
    this.selectedSubscriptionId = sub.subscriptionId;
    this.isPanelOpen = true;
  }

  openSubscriptionById(subscriptionId: string): void {
    const sub = this.subscriptions.find((s) => s.subscriptionId === subscriptionId);
    if (sub) this.openSubscription(sub);
  }
}
