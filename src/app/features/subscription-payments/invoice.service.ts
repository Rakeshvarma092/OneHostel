import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceDialogComponent } from './invoice-dialog.component';
import { PaymentTransaction } from './subscription-payment.models';
import { SystemSettingsService } from '../../core/services/system-settings.service';

/** Solid status-pill colours, matching the invoice popup. */
const STATUS_COLORS: Record<string, string> = {
  Paid: '#16a34a',
  Refunded: '#0284c7',
  Pending: '#d97706',
  Failed: '#e11d48',
};

/**
 * View Invoice / Download Receipt actions, shared by the Payments table and the
 * subscription detail panel. The receipt is generated client-side as a
 * self-contained HTML file until the backend serves real PDF receipts; it has a
 * print-ready A4 layout (browser Print → Save as PDF).
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

  constructor(
    private dialog: MatDialog,
    private settings: SystemSettingsService,
  ) {}

  viewInvoice(payment: PaymentTransaction): void {
    this.dialog
      .open(InvoiceDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        data: payment,
        autoFocus: false,
        panelClass: 'invoice-dialog-panel',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === 'download') this.downloadReceipt(payment);
      });
  }

  downloadReceipt(payment: PaymentTransaction): void {
    const blob = new Blob([this.buildReceiptHtml(payment)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${payment.invoiceNumber ?? payment.transactionId}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private buildReceiptHtml(p: PaymentTransaction): string {
    const esc = (value: string): string =>
      value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const fmtDate = (iso: string): string =>
      new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const general = this.settings.settings.general;
    const appName = esc(general.applicationName || 'OneHostel');
    const supportEmail = esc(general.supportEmail);
    const supportPhone = esc(`${general.supportPhoneCode} ${general.supportPhone}`.trim());

    const number = esc(p.invoiceNumber ?? p.transactionId);
    const statusColor = STATUS_COLORS[p.paymentStatus] ?? '#64748b';
    const stamp = p.paymentStatus === 'Paid' ? 'PAID' : p.paymentStatus === 'Refunded' ? 'REFUNDED' : '';
    // Tax is read from the payment itself (stored when it was paid), never from current Settings.
    const taxNote =
      p.taxRate === 0 ? 'No GST applied' : p.taxInclusive ? 'Plan price includes GST' : 'GST added on the plan price';
    const generatedOn = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${number} · ${appName}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 16px 48px;
    background: #eef2f7;
    color: #0f172a;
    font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Receipt sheet */
  .receipt {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px;
    background: #f8fafc;
    border-radius: 20px;
    box-shadow: 0 30px 60px -24px rgba(15, 23, 42, .3);
  }

  .head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .mark { display: grid; grid-template-columns: repeat(2, 16px); gap: 4px; }
  .mark i { display: block; width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(135deg, #2f7bff, #0057e7); }
  .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
  .brand-sub { font-size: 13px; color: #475569; margin-top: 2px; }
  .brand-gstin { font-size: 11.5px; font-weight: 600; letter-spacing: .04em; color: #64748b; margin-top: 3px; }
  table.totals td.tax-note { padding-top: 6px; text-align: right; font-size: 11.5px; font-weight: 400; color: #64748b; }
  .doc { text-align: right; }
  .doc-label { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #334155; }
  .doc-number { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }

  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 1px 3px rgba(15, 23, 42, .05); }
  .label { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #475569; margin-bottom: 6px; }

  .parties { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 18px; padding: 18px 20px; margin-bottom: 14px; }
  .divider { background: #e2e8f0; }
  .party-name { font-size: 15.5px; font-weight: 800; word-break: break-word; }
  .party-sub { font-size: 13px; color: #475569; margin-top: 4px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; color: #334155; }
  .meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 12px; margin-top: 12px; font-size: 13px; color: #334155; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 999px; color: #fff; font-size: 12.5px; font-weight: 700; }

  .items { padding: 14px 16px 16px; }
  .items-head { display: flex; justify-content: space-between; padding: 0 4px 10px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #334155; }
  .item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
  .item-icon { width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; background: #fff4e6; color: #f97316; display: flex; align-items: center; justify-content: center; }
  .item-icon svg { width: 22px; height: 22px; }
  .item-text { flex: 1; min-width: 0; }
  .item-name { font-size: 14.5px; font-weight: 700; }
  .item-sub { font-size: 13px; color: #475569; margin-top: 2px; }
  .item-amount { font-size: 15px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .tear { position: relative; height: 1px; margin: 18px -16px 14px; background: repeating-linear-gradient(90deg, #cbd5e1 0 8px, transparent 8px 14px); }
  .tear::before, .tear::after { content: ''; position: absolute; top: -9px; width: 18px; height: 18px; border-radius: 50%; background: #f8fafc; box-shadow: inset 0 0 0 1px #e2e8f0; }
  .tear::before { left: -10px; } .tear::after { right: -10px; }

  .totals-wrap { position: relative; display: flex; justify-content: flex-end; }
  .stamp { position: absolute; left: 12px; top: 50%; transform: translateY(-50%) rotate(-12deg); padding: 4px 14px; border: 2px solid currentColor; border-radius: 8px; font-size: 22px; font-weight: 900; letter-spacing: .18em; opacity: .18; }
  table.totals { width: min(100%, 300px); border-collapse: collapse; font-size: 14px; }
  .totals td { padding: 6px 4px; color: #334155; }
  .totals td:last-child { text-align: right; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums; }
  .totals tr.grand td { background: #e6f7f5; padding: 12px 14px; }
  .totals tr.grand td:first-child { border-radius: 10px 0 0 10px; font-weight: 800; color: #0f766e; }
  .totals tr.grand td:last-child { border-radius: 0 10px 10px 0; font-size: 19px; font-weight: 800; }
  .totals tr.spacer td { padding: 4px; }

  .note { margin-top: 14px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; }

  .foot { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #64748b; }
  .foot a { color: #0057e7; text-decoration: none; }

  @media (max-width: 560px) {
    body { padding: 16px 10px 32px; }
    .receipt { padding: 18px; }
    .head { flex-direction: column; align-items: flex-start; }
    .doc { text-align: left; }
    .parties { grid-template-columns: 1fr; }
    .divider { height: 1px; }
    .stamp { display: none; }
  }

  @page { size: A4; margin: 14mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt { box-shadow: none; max-width: none; padding: 0; background: #fff; }
    .card { box-shadow: none; }
    .tear::before, .tear::after { background: #fff; }
  }
</style>
</head>
<body>
  <main class="receipt">
    <header class="head">
      <div class="brand">
        <span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <div>
          <div class="brand-name">${appName}</div>
          <div class="brand-sub">Payment Receipt</div>
          ${p.gstin ? `<div class="brand-gstin">GSTIN <span class="mono">${esc(p.gstin)}</span></div>` : ''}
        </div>
      </div>
      <div class="doc">
        <div class="doc-label">Receipt</div>
        <div class="doc-number">${number}</div>
      </div>
    </header>

    <section class="card parties">
      <div>
        <div class="label">Billed To</div>
        <div class="party-name">${esc(p.hostelName)}</div>
        <div class="party-sub">Subscription <span class="mono">${esc(p.subscriptionId)}</span></div>
        <div class="meta">
          <span>Payment Date: <strong>${esc(fmtDate(p.paymentDate))}</strong></span>
          <span class="status" style="background:${statusColor}">${esc(p.paymentStatus)}</span>
        </div>
      </div>
      <div class="divider" aria-hidden="true"></div>
      <div>
        <div class="label">Payment</div>
        <div class="party-name">${esc(p.paymentMethod)} · ${esc(p.paymentGateway)}</div>
        <div class="party-sub">Transaction ID <span class="mono">${esc(p.transactionId)}</span></div>
        <div class="party-sub">Invoice Number <span class="mono">${esc(p.invoiceNumber ?? '—')}</span></div>
      </div>
    </section>

    <section class="card items">
      <div class="items-head"><span>Description</span><span>Amount</span></div>
      <div class="item">
        <span class="item-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.68 13.69 12 11.93l2.31 1.76-.88-2.85L15.75 9h-2.84L12 6.19 11.09 9H8.25l2.31 1.84-.88 2.85zM20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 2.03.76 3.87 2 5.28V23l6-2 6 2v-7.72A7.96 7.96 0 0 0 20 10zm-8-6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6z"/></svg>
        </span>
        <div class="item-text">
          <div class="item-name">${esc(p.planName)} Plan</div>
          <div class="item-sub">${esc(p.billingCycle)} subscription</div>
        </div>
        <div class="item-amount">${esc(this.inr.format(p.amount))}</div>
      </div>

      <div class="tear" aria-hidden="true"></div>

      <div class="totals-wrap">
        ${stamp ? `<div class="stamp" style="color:${statusColor}" aria-hidden="true">${stamp}</div>` : ''}
        <table class="totals">
          <tr><td>${p.taxRate > 0 ? 'Subtotal (excl. GST)' : 'Subtotal'}</td><td>${esc(this.inr.format(p.amount))}</td></tr>
          ${p.taxRate > 0 ? `<tr><td>GST (${p.taxRate}%)</td><td>${esc(this.inr.format(p.tax))}</td></tr>` : ''}
          <tr class="spacer"><td colspan="2"></td></tr>
          <tr class="grand"><td>Total Amount</td><td>${esc(this.inr.format(p.totalAmount))}</td></tr>
          <tr><td colspan="2" class="tax-note">${taxNote}</td></tr>
        </table>
      </div>
    </section>

    ${
      p.paymentStatus === 'Refunded'
        ? '<div class="note">This payment has been refunded to the original payment method.</div>'
        : ''
    }

    <footer class="foot">
      <span>This is a computer-generated receipt and does not require a signature.</span>
      <span>Questions? <a href="mailto:${supportEmail}">${supportEmail}</a>${supportPhone ? ` · ${supportPhone}` : ''}</span>
      <span>Generated ${esc(generatedOn)}</span>
    </footer>
  </main>
</body>
</html>`;
  }
}
