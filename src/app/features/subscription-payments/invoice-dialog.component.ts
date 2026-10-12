import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PaymentTransaction } from './subscription-payment.models';
import { statusTone } from '../../shared/constants/status.constants';

@Component({
  selector: 'app-invoice-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="invoice">
      <!-- Header -->
      <header class="inv-head">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <div>
            <div class="brand__name">OneHostel</div>
            <div class="brand__tagline">Hostel Management Platform</div>
            @if (payment.gstin) {
              <div class="brand__gstin">GSTIN <span>{{ payment.gstin }}</span></div>
            }
          </div>
        </div>

        <div class="inv-pill">
          <h2 class="inv-pill__label">Invoice</h2>
          <div class="inv-pill__number">{{ payment.invoiceNumber }}</div>
        </div>
      </header>

      <div class="inv-body">
        <!-- Billed to | Payment -->
        <section class="card parties">
          <div class="party">
            <div class="label">Billed To</div>
            <div class="party__name">{{ payment.hostelName }}</div>
            <div class="party__sub">Subscription {{ payment.subscriptionId }}</div>
            <div class="party__meta">
              <span class="issued"><mat-icon>calendar_today</mat-icon>Issued {{ payment.paymentDate | date: 'dd-MMM-yy' }}</span>
              <span class="status status--{{ tone }}">{{ payment.paymentStatus }}</span>
            </div>
          </div>

          <div class="parties__divider" aria-hidden="true"></div>

          <div class="party">
            <div class="label">Payment</div>
            <div class="party__name">{{ payment.paymentMethod }} · {{ payment.paymentGateway }}</div>
            <div class="party__sub txn">
              <span class="txn__label">TXN ID</span>
              <span class="txn__value">{{ payment.transactionId }}</span>
            </div>
          </div>
        </section>

        <!-- Items + totals -->
        <section class="card items">
          <div class="items__head">
            <span>Description</span>
            <span>Amount</span>
          </div>

          <div class="item">
            <span class="item__icon"><mat-icon>workspace_premium</mat-icon></span>
            <div class="item__text">
              <div class="item__name">{{ payment.planName }} Plan</div>
              <div class="item__sub">{{ payment.billingCycle }} subscription</div>
            </div>
            <div class="item__amount">{{ payment.amount | currency: 'INR' : 'symbol' : '1.2-2' }}</div>
          </div>

          <!-- Receipt tear line -->
          <div class="tear" aria-hidden="true"></div>

          <div class="totals-wrap">
            @if (stampLabel) {
              <div class="stamp stamp--{{ tone }}" aria-hidden="true">{{ stampLabel }}</div>
            }
            <dl class="totals">
              <div class="totals__row">
                <dt>{{ payment.taxRate > 0 ? 'Subtotal (excl. GST)' : 'Subtotal' }}</dt>
                <dd>{{ payment.amount | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              </div>
              @if (payment.taxRate > 0) {
                <div class="totals__row">
                  <dt>GST ({{ payment.taxRate }}%)</dt>
                  <dd>{{ payment.tax | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
                </div>
              }
              <div class="totals__grand">
                <dt>Total</dt>
                <dd>{{ payment.totalAmount | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              </div>
              <div class="tax-note">
                @if (payment.taxRate === 0) {
                  No GST applied
                } @else if (payment.taxInclusive) {
                  Plan price includes GST
                } @else {
                  GST added on the plan price
                }
              </div>
            </dl>
          </div>
        </section>

        @if (payment.paymentStatus === 'Refunded') {
          <div class="refund-note">
            <mat-icon>info</mat-icon>
            <span>This payment has been refunded to the original payment method.</span>
          </div>
        }
      </div>

      <div class="inv-actions">
        <button type="button" class="btn-secondary" mat-dialog-close>Close</button>
        <button type="button" class="btn-primary" (click)="dialogRef.close('download')">
          <mat-icon>download</mat-icon>
          <span>Download Receipt</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Rounder dialog shell for the invoice (panelClass set in InvoiceService). */
    ::ng-deep .invoice-dialog-panel .mat-mdc-dialog-surface {
      border-radius: 20px !important;
      background: #f8fafc !important;
      box-shadow: 0 30px 60px -20px rgba(15, 23, 42, 0.35) !important;
    }

    .invoice {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #f8fafc;
      border-radius: inherit;
      overflow: hidden;
    }

    /* ---- Header ---- */
    .inv-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 24px 24px 18px;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    /* Four-square logo mark */
    .brand__mark {
      display: grid;
      grid-template-columns: repeat(2, 16px);
      gap: 4px;
      flex-shrink: 0;

      i {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        background: linear-gradient(135deg, #2f7bff, #0057e7);
      }
    }

    .brand__name {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.01em;
      color: #0f172a;
    }

    .brand__tagline {
      margin-top: 2px;
      font-size: 13px;
      color: #475569;
    }

    .brand__gstin {
      margin-top: 3px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #64748b;

      span {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #334155;
      }
    }

    /* How GST was applied to this payment */
    .tax-note {
      margin-top: 6px;
      text-align: right;
      font-size: 11.5px;
      color: #64748b;
    }

    .inv-pill {
      flex-shrink: 0;
      padding: 4px 0;
      text-align: right;
    }

    .inv-pill__label {
      margin: 0;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #334155;
    }

    .inv-pill__number {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }

    /* ---- Body ---- */
    .inv-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 0 24px 4px;
      overflow-y: auto;

      > * {
        flex-shrink: 0;
      }
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }

    .label {
      margin-bottom: 6px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
    }

    /* Billed to | Payment */
    .parties {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      gap: 18px;
      padding: 18px 20px;
    }

    .parties__divider {
      background: #e2e8f0;
    }

    .party {
      min-width: 0;
    }

    .party__name {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      word-break: break-word;
    }

    .party__sub {
      margin-top: 4px;
      font-size: 13px;
      color: #475569;
    }

    .party__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px 12px;
      margin-top: 12px;
    }

    .issued {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #334155;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #475569;
      }
    }

    /* Solid status pill */
    .status {
      --status: #64748b;
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--status);
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 700;
    }

    .status--success { --status: #16a34a; }
    .status--info { --status: #0284c7; }
    .status--warning { --status: #d97706; }
    .status--danger { --status: #e11d48; }
    .status--neutral { --status: #64748b; }

    .txn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .txn__label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    .txn__value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      color: #334155;
    }

    /* Items + totals */
    .items {
      padding: 14px 16px 16px;
    }

    .items__head {
      display: flex;
      justify-content: space-between;
      padding: 0 4px 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #334155;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .item__icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #fff4e6;
      color: #f97316;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .item__text {
      flex: 1;
      min-width: 0;
    }

    .item__name {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .item__sub {
      margin-top: 2px;
      font-size: 13px;
      color: #475569;
    }

    .item__amount {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* Dashed "receipt tear" with notches */
    .tear {
      position: relative;
      height: 1px;
      margin: 18px -16px 14px;
      background: repeating-linear-gradient(90deg, #cbd5e1 0 8px, transparent 8px 14px);

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: -9px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #f8fafc;
        box-shadow: inset 0 0 0 1px #e2e8f0;
      }

      &::before { left: -10px; }
      &::after { right: -10px; }
    }

    .totals-wrap {
      position: relative;
      display: flex;
      justify-content: flex-end;
    }

    /* Faint tilted stamp behind the totals */
    .stamp {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%) rotate(-12deg);
      padding: 4px 14px;
      border: 2px solid currentColor;
      border-radius: 8px;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.18em;
      opacity: 0.18;
      pointer-events: none;
      user-select: none;
    }

    .stamp--success { color: #0d9488; }
    .stamp--info { color: #0284c7; }

    .totals {
      width: min(100%, 300px);
      margin: 0;
    }

    .totals__row {
      display: flex;
      justify-content: space-between;
      padding: 6px 4px;
      font-size: 14px;
      color: #334155;

      dd {
        margin: 0;
        font-weight: 600;
        color: #0f172a;
        font-variant-numeric: tabular-nums;
      }
    }

    /* Teal total bar */
    .totals__grand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #e6f7f5;

      dt {
        font-size: 14px;
        font-weight: 800;
        color: #0f766e;
      }

      dd {
        margin: 0;
        font-size: 19px;
        font-weight: 800;
        color: #0f172a;
        font-variant-numeric: tabular-nums;
      }
    }

    .refund-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 10px 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    /* ---- Actions ---- */
    .inv-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px 22px;
      flex-shrink: 0;
    }

    .btn-secondary,
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border-radius: 10px;
      font-size: 14.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:focus-visible {
        outline: 2px solid #0057e7;
        outline-offset: 2px;
      }

      &:active {
        transform: translateY(1px);
      }
    }

    .btn-secondary {
      min-width: 140px;
      padding: 0 22px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;

      &:hover {
        background: #f1f5f9;
      }
    }

    .btn-primary {
      min-width: 200px;
      padding: 0 24px;
      background: #0057e7;
      border: 1px solid #0057e7;
      color: #ffffff;
      box-shadow: 0 6px 16px -6px rgba(0, 87, 231, 0.6);

      &:hover {
        background: #0045b5;
        border-color: #0045b5;
      }
    }

    @media (max-width: 520px) {
      .inv-head {
        flex-direction: column;
        align-items: flex-start;
      }

      .inv-pill {
        text-align: left;
      }

      .parties {
        grid-template-columns: 1fr;
      }

      .parties__divider {
        height: 1px;
      }

      .inv-actions {
        flex-direction: column-reverse;

        > * {
          width: 100%;
        }
      }
    }
  `],
})
export class InvoiceDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<InvoiceDialogComponent, 'download' | undefined>,
    @Inject(MAT_DIALOG_DATA) public payment: PaymentTransaction,
  ) {}

  get tone(): string {
    return statusTone(this.payment.paymentStatus);
  }

  /** Decorative stamp behind the totals; only for settled invoices. */
  get stampLabel(): string | null {
    if (this.payment.paymentStatus === 'Paid') return 'PAID';
    if (this.payment.paymentStatus === 'Refunded') return 'REFUNDED';
    return null;
  }
}
