import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { shouldCloseOnEscape } from '../../shared/utils/panel-escape';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  HostelSubscription,
  PaymentMethod,
  PaymentTransaction,
  hasInvoice,
  nextExpiryDate,
  subscriptionsFor,
} from './subscription-payment.models';
import { InvoiceService } from './invoice.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { statusTone } from '../../shared/constants/status.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-subscription-detail-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <!-- Overlay Backdrop -->
    <div class="panel-backdrop" *ngIf="isOpen" (click)="closePanel.emit()"></div>

    <!-- Side Panel Drawer -->
    <div class="side-panel-drawer" [class.side-panel-drawer--open]="isOpen">
      <div class="panel-header">
        <div class="identity">
          <span class="identity__icon"><mat-icon>card_membership</mat-icon></span>
          <div>
            <h2 class="panel-title">Subscription Details</h2>
            <div class="panel-subtitle" *ngIf="subscription">{{ subscription.subscriptionId }}</div>
          </div>
        </div>
        <button mat-icon-button type="button" class="close-btn" (click)="closePanel.emit()" aria-label="Close panel">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-body" #panelBody *ngIf="subscription as sub">
        <!-- Hostel & period -->
        <section class="hero-card">
          <div class="hero-card__top">
            <span class="hero-card__icon"><mat-icon>apartment</mat-icon></span>
            <div class="hero-card__text">
              <div class="hero-card__hostel">{{ sub.hostelName }}</div>
              <div class="hero-card__plan">
                <span class="hero-card__id" matTooltip="Hostel ID">{{ sub.hostelId }}</span>
                {{ sub.planName }} · {{ sub.billingCycle }}
              </div>
            </div>
            <span class="status-badge status-badge--{{ tone(sub.status) }}">{{ sub.status }}</span>
          </div>

          <div class="period">
            <div class="period__dates">
              <div>
                <div class="period__label">Start</div>
                <div class="period__date">{{ sub.startDate | date: 'dd-MMM-yy' }}</div>
              </div>
              <span
                class="period__pill"
                [class.period__pill--warn]="daysRemaining >= 0 && daysRemaining <= 7"
                [class.period__pill--ended]="daysRemaining < 0"
              >
                <mat-icon>{{ daysRemaining < 0 ? 'event_busy' : 'hourglass_bottom' }}</mat-icon>
                {{ periodCaption }}
              </span>
              <div class="period__end">
                <div class="period__label">Expiry</div>
                <div class="period__date">{{ sub.expiryDate | date: 'dd-MMM-yy' }}</div>
              </div>
            </div>
            <div class="period__bar" role="progressbar" [attr.aria-valuenow]="periodElapsedPercent | number: '1.0-0'" aria-valuemin="0" aria-valuemax="100">
              <div
                class="period__fill"
                [class.period__fill--warn]="daysRemaining >= 0 && daysRemaining <= 7"
                [class.period__fill--ended]="daysRemaining < 0"
                [style.width.%]="periodElapsedPercent"
              ></div>
            </div>
          </div>
        </section>

        <!-- Plan & billing -->
        <section class="info-card">
          <div class="info-card__header">
            <span class="info-card__icon"><mat-icon>receipt</mat-icon></span>
            <h3 class="info-card__title">Plan &amp; Billing</h3>
          </div>
          <!-- Key figures -->
          <div class="kpis">
            <div class="kpi kpi--teal">
              <span class="kpi__icon"><mat-icon>account_balance_wallet</mat-icon></span>
              <div>
                <div class="kpi__label">Total Paid</div>
                <div class="kpi__value">{{ totalPaid | currency: 'INR' : 'symbol' : '1.2-2' }}</div>
              </div>
            </div>
            <div class="kpi kpi--blue">
              <span class="kpi__icon"><mat-icon>event_available</mat-icon></span>
              <div>
                <div class="kpi__label">Last Payment</div>
                <div class="kpi__value">{{ lastPayment ? (lastPayment.paymentDate | date: 'dd-MMM-yy') : '—' }}</div>
              </div>
            </div>
          </div>

          <dl class="detail-grid">
            <div><dt>Plan</dt><dd>{{ sub.planName }}</dd></div>
            <div><dt>Billing Cycle</dt><dd>{{ sub.billingCycle }}</dd></div>
            <div>
              <dt>Amount</dt>
              <dd>
                {{ sub.amount > 0 ? (sub.amount | currency: 'INR' : 'symbol' : '1.0-2') : 'Free' }}
                <span class="detail-hint" *ngIf="sub.amount > 0">{{ gstHint }} / {{ cycleUnit }}</span>
              </dd>
            </div>
            <div>
              <dt>Payment Status</dt>
              <dd><span class="status-badge status-badge--{{ tone(sub.paymentStatus) }}">{{ sub.paymentStatus }}</span></dd>
            </div>
          </dl>
        </section>

        <!-- Payment history -->
        <section class="info-card">
          <div class="info-card__header">
            <span class="info-card__icon"><mat-icon>history</mat-icon></span>
            <h3 class="info-card__title">Payment History</h3>
            <span class="count-pill">{{ payments.length }} {{ payments.length === 1 ? 'payment' : 'payments' }}</span>
          </div>

          <div class="history-empty" *ngIf="payments.length === 0">
            <mat-icon>receipt_long</mat-icon>
            <div class="history-empty__title">No payments yet</div>
            <div class="history-empty__hint">Payments for this subscription will appear here.</div>
          </div>

          @if (payments.length > 0) {
            <div class="history">
              @for (group of paymentYears; track group.year) {
                <div class="history-year">
                  <span>{{ group.year }}</span>
                  <span class="history-year__count">{{ group.items.length }}</span>
                </div>

                <ul class="history-list">
                  @for (p of group.items; track p.transactionId) {
                    <li class="history-item">
                      <span class="history-item__icon history-item__icon--{{ tone(p.paymentStatus) }}">
                        <mat-icon>{{ methodIcon(p.paymentMethod) }}</mat-icon>
                      </span>

                      <div class="history-item__main">
                        <div class="history-item__row">
                          <span class="history-amount">{{ p.totalAmount | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
                          <span class="status-badge status-badge--{{ tone(p.paymentStatus) }}">{{ p.paymentStatus }}</span>
                        </div>
                        <div class="history-tags">
                          <span class="tag tag--plan">
                            <mat-icon>workspace_premium</mat-icon>{{ p.planName }} · {{ p.billingCycle }}
                          </span>
                          <span class="tag tag--period">
                            <mat-icon>date_range</mat-icon>
                            {{ p.paymentDate | date: 'dd-MMM-yy' }}
                            <span class="tag__arrow">→</span>
                            {{ periodEnd(p) | date: 'dd-MMM-yy' }}
                          </span>
                        </div>
                        <div class="history-meta">
                          <span class="meta-item">
                            <mat-icon>event_available</mat-icon>Paid {{ p.paymentDate | date: 'dd-MMM-yy' }}
                          </span>
                          <span class="meta-dot" aria-hidden="true"></span>
                          <span class="meta-item">
                            <mat-icon>{{ methodIcon(p.paymentMethod) }}</mat-icon>{{ p.paymentMethod }} via {{ p.paymentGateway }}
                          </span>
                        </div>
                        @if (p.subscriptionId !== sub.subscriptionId) {
                          <div class="history-chips">
                            <span class="chip chip--older" matTooltip="Earlier subscription for this hostel">
                              <mat-icon>history</mat-icon>{{ p.subscriptionId }}
                            </span>
                          </div>
                        }
                      </div>

                      @if (hasInvoice(p)) {
                        <div class="history-actions">
                          <button type="button" class="row-action-btn" matTooltip="View Invoice" aria-label="View invoice" (click)="invoices.viewInvoice(p)">
                            <mat-icon>visibility</mat-icon>
                          </button>
                          <button type="button" class="row-action-btn" matTooltip="Download Receipt" aria-label="Download receipt" (click)="invoices.downloadReceipt(p)">
                            <mat-icon>download</mat-icon>
                          </button>
                        </div>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </section>
      </div>

      <div class="panel-footer">
        <button type="button" class="btn-secondary" (click)="closePanel.emit()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .panel-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.12);
      z-index: 1050;
      animation: fadeIn 0.2s ease-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .side-panel-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 540px;
      max-width: 100vw;
      height: 100vh;
      background: #ffffff;
      z-index: 1060;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .side-panel-drawer--open {
      transform: translateX(0);
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    .identity {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .identity__icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 10px;
      background: #e6f7f5;
      color: #0d9488;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .panel-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .panel-subtitle {
      margin-top: 2px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    .close-btn {
      color: #64748b;

      &:hover {
        color: #0f172a;
        background: #f1f5f9;
      }
    }

    /* Body: light backdrop so the white cards stand out */
    .panel-body {
      flex: 1;
      min-height: 0;
      padding: 18px 20px 24px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 14px;

      /* Cards keep their full height and the body scrolls. Without this the flex
         column squeezed the cards to fit, and their overflow:hidden clipped content
         (Total Paid / Last Payment and the end of Payment History were cut off). */
      > * {
        flex-shrink: 0;
      }
    }

    /* Hero: hostel + subscription period */
    .hero-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      padding: 16px;
    }

    .hero-card__top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .hero-card__icon {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      border-radius: 10px;
      background: #eff6ff;
      color: #0057e7;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .hero-card__text {
      flex: 1;
      min-width: 0;
    }

    .hero-card__hostel {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .hero-card__plan {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 3px;
      font-size: 13px;
      color: #64748b;
    }

    .hero-card__id {
      padding: 1px 6px;
      border-radius: 5px;
      background: #f1f5f9;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
    }

    /* Plan & Billing: key figures */
    .kpis {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 14px 16px 0;
    }

    .kpi {
      --kpi: #0d9488;
      --kpi-tint: #e6f7f5;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--kpi-tint);
    }

    .kpi--blue {
      --kpi: #0057e7;
      --kpi-tint: #eff6ff;
    }

    .kpi__icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 8px;
      background: #ffffff;
      color: var(--kpi);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .kpi__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }

    .kpi__value {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }

    .period__dates {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .period__end {
      text-align: right;
    }

    .period__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }

    .period__date {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .period__pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      background: #e6f7f5;
      color: #0f766e;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .period__pill--warn {
      background: #fff7ed;
      color: #b45309;
    }

    .period__pill--ended {
      background: #f1f5f9;
      color: #64748b;
    }

    .period__bar {
      height: 8px;
      border-radius: 4px;
      background: #e2e8f0;
      overflow: hidden;
    }

    .period__fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #14b8a6, #0d9488);
      transition: width 0.4s ease;
    }

    .period__fill--warn {
      background: linear-gradient(90deg, #fbbf24, #d97706);
    }

    .period__fill--ended {
      background: #94a3b8;
    }

    /* Info cards (green header, same as the Admin details panel) */
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }

    .info-card__header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #e6f7f0;
      border-bottom: 1px solid #d1eee3;
    }

    .info-card__icon {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      border-radius: 8px;
      background: #ffffff;
      color: #0d9488;
      box-shadow: 0 0 0 1px #c6e9dc;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
    }

    .info-card__title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .count-pill {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 999px;
      background: #ffffff;
      color: #0d9488;
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 0 0 1px #c6e9dc;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 18px;
      margin: 0;
      padding: 14px 16px 16px;

      dt {
        margin-bottom: 3px;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #64748b;
      }

      dd {
        margin: 0;
        font-size: 13.5px;
        font-weight: 600;
        color: #0f172a;
      }

      .amount {
        font-size: 15px;
        font-weight: 800;
      }
    }

    .detail-hint {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }

    /* Payment history */
    .history {
      padding: 4px 16px 6px;
    }

    /* Year divider: "2026 ───── 3" */
    .history-year {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 10px 0 2px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #0f766e;

      &::after {
        content: '';
        order: 1;
        flex: 1;
        height: 1px;
        background: #e2e8f0;
      }
    }

    .history-year__count {
      order: 2;
      padding: 1px 7px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
    }

    .history-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* Plan + billing period as two small tags */
    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 6px 0;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .tag--plan {
      background: #e6f7f5;
      color: #0f766e;

      mat-icon {
        color: #0d9488;
      }
    }

    .tag--period {
      background: #f1f5f9;
      color: #334155;
      font-variant-numeric: tabular-nums;

      mat-icon {
        color: #64748b;
      }
    }

    .tag__arrow {
      color: #94a3b8;
      font-weight: 500;
    }

    .chip--older {
      background: #fff7ed;
      color: #b45309;

      mat-icon {
        color: #d97706;
      }
    }

    .history-item {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 0 -8px;
      padding: 12px 8px;
      border-radius: 10px;
      transition: background 0.15s ease;

      &:hover {
        background: #f8fafc;
      }

      /* Timeline line joining payments within a year */
      &:not(:last-child)::before {
        content: '';
        position: absolute;
        left: 24px;
        top: 46px;
        bottom: -12px;
        width: 2px;
        border-radius: 1px;
        background: #e2e8f0;
      }
    }

    .history-item__icon {
      position: relative;
      z-index: 1; /* sit above the timeline line */
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
    }

    .history-item__icon--success { background: #e6f7f5; color: #0d9488; }
    .history-item__icon--warning { background: #fff7ed; color: #d97706; }
    .history-item__icon--danger { background: #ffebf0; color: #e11d48; }
    .history-item__icon--info { background: #f0f9ff; color: #0284c7; }
    .history-item__icon--neutral { background: #f1f5f9; color: #64748b; }

    .history-item__main {
      flex: 1;
      min-width: 0;
    }

    .history-item__row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .history-amount {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }

    /* "Paid on · method via gateway" — softer, with small icons */
    .history-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 8px;
      font-size: 12px;
      color: #64748b;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #94a3b8;
      }
    }

    .meta-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: #cbd5e1;
    }

    .history-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      font-size: 11.5px;
      font-weight: 500;

      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: #64748b;
      }
    }

    .history-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }

    .row-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0; /* default button padding would squeeze (and clip) the icon */
      border-radius: 6px;
      background: transparent;
      border: none;
      color: #0d9488;
      cursor: pointer;
      transition: background 0.15s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: #e6f7f5;
      }
    }

    .history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 16px;
      text-align: center;

      mat-icon {
        margin-bottom: 8px;
        font-size: 30px;
        width: 30px;
        height: 30px;
        color: #94a3b8;
      }
    }

    .history-empty__title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .history-empty__hint {
      margin-top: 2px;
      font-size: 12.5px;
      color: #64748b;
    }

    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      border: 1px solid currentColor;
      white-space: nowrap;
    }

    .status-badge--success { background: #e6f7f5; color: #0d9488; }
    .status-badge--warning { background: #fff7ed; color: #d97706; }
    .status-badge--danger { background: #ffebf0; color: #e11d48; }
    .status-badge--info { background: #f0f9ff; color: #0284c7; }
    .status-badge--neutral { background: #f1f5f9; color: #64748b; }

    /* Footer */
    .panel-footer {
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .btn-secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
    }

    @media (max-width: 520px) {
      .detail-grid,
      .kpis {
        grid-template-columns: 1fr;
      }

      .period__pill {
        display: none;
      }
    }
  `],
})
export class SubscriptionDetailPanelComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() subscription?: HostelSubscription;
  /** All payments; filtered down to this subscription's history. */
  @Input() allPayments: PaymentTransaction[] = [];
  /** All subscriptions; used to include payments from the hostel's earlier subscription IDs. */
  @Input() allSubscriptions: HostelSubscription[] = [];

  @Output() closePanel = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.isOpen && shouldCloseOnEscape(event)) this.closePanel.emit();
  }

  @ViewChild('panelBody') panelBody?: ElementRef<HTMLElement>;

  readonly hasInvoice = hasInvoice;
  readonly tone = statusTone;

  constructor(
    public invoices: InvoiceService,
    private settings: SystemSettingsService,
  ) {}

  /** How GST applies to the plan price, per Settings → Fees (for the next billing). */
  get gstHint(): string {
    const p = this.settings.settings.fees;
    if (!p.gstEnabled || p.gstRate <= 0) return 'no GST';
    return p.pricesIncludeTax ? `incl. ${p.gstRate}% GST` : `+ ${p.gstRate}% GST`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      setTimeout(() => {
        if (this.panelBody) this.panelBody.nativeElement.scrollTop = 0;
      }, 0);
    }
  }

  /**
   * Every payment for this hostel, newest first: all billing periods of the
   * current subscription (renewals keep the same ID) plus any earlier, closed
   * subscriptions the hostel had before re-subscribing.
   */
  get payments(): PaymentTransaction[] {
    const sub = this.subscription;
    if (!sub) return [];
    const ids = new Set([sub.subscriptionId, ...subscriptionsFor(this.allSubscriptions, sub.hostelId).map((s) => s.subscriptionId)]);
    return this.allPayments
      .filter((p) => ids.has(p.subscriptionId))
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.transactionId.localeCompare(a.transactionId));
  }

  /** Payment history grouped by calendar year, newest year first. */
  get paymentYears(): { year: string; items: PaymentTransaction[] }[] {
    const groups: { year: string; items: PaymentTransaction[] }[] = [];
    for (const p of this.payments) {
      const year = p.paymentDate.slice(0, 4);
      if (groups[groups.length - 1]?.year !== year) groups.push({ year, items: [] });
      groups[groups.length - 1].items.push(p);
    }
    return groups;
  }

  /** Billing period a payment covers: from its payment date to the day before the next cycle starts. */
  periodEnd(p: PaymentTransaction): string {
    const [y, m, d] = p.paymentDate.split('-').map(Number);
    const dayBefore = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    return nextExpiryDate(dayBefore, p.billingCycle);
  }

  get lastPayment(): PaymentTransaction | undefined {
    return this.payments.find((p) => p.paymentStatus === 'Paid');
  }

  get totalPaid(): number {
    return this.payments.filter((p) => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.totalAmount, 0);
  }

  /** Icon for each payment method, tinted by payment status in the history list. */
  methodIcon(method: PaymentMethod): string {
    return { UPI: 'qr_code_2', Card: 'credit_card', 'Net Banking': 'account_balance', 'Bank Transfer': 'account_balance' }[method] ?? 'payments';
  }

  get cycleUnit(): string {
    const cycle = this.subscription?.billingCycle;
    return cycle === 'Yearly' ? 'yr' : cycle === 'Quarterly' ? 'qtr' : 'mo';
  }

  /** Whole days until expiry; negative once the expiry date has passed. */
  get daysRemaining(): number {
    if (!this.subscription) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${this.subscription.expiryDate}T00:00:00`);
    return Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
  }

  get periodElapsedPercent(): number {
    if (!this.subscription) return 0;
    const start = new Date(`${this.subscription.startDate}T00:00:00`).getTime();
    const end = new Date(`${this.subscription.expiryDate}T00:00:00`).getTime();
    const pct = ((Date.now() - start) / Math.max(end - start, DAY_MS)) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  get periodCaption(): string {
    const days = this.daysRemaining;
    if (days < 0) return `Ended ${-days} day${days === -1 ? '' : 's'} ago`;
    if (days === 0) return 'Expires today';
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  }
}
