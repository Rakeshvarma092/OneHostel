import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { shouldCloseOnEscape } from '../../shared/utils/panel-escape';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuditLog, auditAction, auditModule } from '../../core/models/audit.models';

@Component({
  selector: 'app-audit-log-detail-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="panel-backdrop" *ngIf="isOpen" (click)="closePanel.emit()"></div>

    <div class="side-panel-drawer" [class.side-panel-drawer--open]="isOpen">
      <div class="panel-header">
        <div class="identity">
          <span class="identity__icon"><mat-icon>manage_history</mat-icon></span>
          <div>
            <h2 class="panel-title">Audit Log Details</h2>
            <div class="panel-subtitle" *ngIf="log">{{ log.logId }}</div>
          </div>
        </div>
        <button mat-icon-button type="button" class="close-btn" (click)="closePanel.emit()" aria-label="Close panel">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="panel-body" *ngIf="log as l">
        <!-- Summary -->
        <section class="hero" [class.hero--failed]="l.status === 'Failed'">
          <span class="hero__icon">
            <mat-icon>{{ l.status === 'Failed' ? 'error' : 'check_circle' }}</mat-icon>
          </span>
          <div class="hero__text">
            <div class="hero__top">
              <span class="hero__event">{{ l.event }}</span>
              <span class="status-pill" [class.status-pill--failed]="l.status === 'Failed'">{{ l.status }}</span>
            </div>
            <div class="hero__entity">{{ l.entity }}</div>
          </div>
        </section>

        <!-- Event details -->
        <section class="info-card">
          <div class="info-card__header">
            <span class="info-card__icon"><mat-icon>fact_check</mat-icon></span>
            <h3 class="info-card__title">Event Details</h3>
          </div>
          <dl class="detail-grid">
            <div class="detail-item">
              <dt><mat-icon>schedule</mat-icon>Date &amp; Time</dt>
              <dd>{{ l.timestamp | date: 'dd-MMM-yy HH:mm:ss' }}</dd>
            </div>
            <div class="detail-item">
              <dt><mat-icon>person</mat-icon>User</dt>
              <dd>{{ l.user }}</dd>
            </div>
            <div class="detail-item">
              <dt><mat-icon>category</mat-icon>Module</dt>
              <dd>{{ module(l) }}</dd>
            </div>
            <div class="detail-item">
              <dt><mat-icon>bolt</mat-icon>Action</dt>
              <dd><span class="action-chip">{{ action(l) }}</span></dd>
            </div>
            <div class="detail-item">
              <dt><mat-icon>label</mat-icon>Entity</dt>
              <dd>{{ l.entity }}</dd>
            </div>
            <div class="detail-item">
              <dt><mat-icon>language</mat-icon>IP Address</dt>
              <dd class="mono">{{ l.ipAddress }}</dd>
            </div>
          </dl>
        </section>

        <!-- Details -->
        <section class="info-card" *ngIf="l.details">
          <div class="info-card__header">
            <span class="info-card__icon"><mat-icon>notes</mat-icon></span>
            <h3 class="info-card__title">Details</h3>
          </div>
          <p class="details-text">{{ l.details }}</p>
        </section>

        <!-- Changes -->
        <section class="info-card" *ngIf="l.changes?.length">
          <div class="info-card__header">
            <span class="info-card__icon"><mat-icon>difference</mat-icon></span>
            <h3 class="info-card__title">Changes</h3>
            <span class="count-pill">{{ l.changes!.length }} {{ l.changes!.length === 1 ? 'change' : 'changes' }}</span>
          </div>
          <ul class="changes">
            <li class="change" *ngFor="let c of l.changes">
              <div class="change__field">{{ c.field }}</div>
              <div class="change__values">
                <span class="old-value" [attr.aria-label]="'Old value: ' + c.oldValue">{{ c.oldValue }}</span>
                <mat-icon class="change__arrow" aria-hidden="true">arrow_forward</mat-icon>
                <span class="new-value" [attr.aria-label]="'New value: ' + c.newValue">{{ c.newValue }}</span>
              </div>
            </li>
          </ul>
        </section>

        <div class="immutable-note">
          <mat-icon>lock</mat-icon>
          <span>Audit entries are read-only and cannot be edited or deleted.</span>
        </div>
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

    /* Body: light backdrop, cards keep full height and the body scrolls */
    .panel-body {
      flex: 1;
      min-height: 0;
      padding: 18px 20px 24px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 14px;

      > * {
        flex-shrink: 0;
      }
    }

    /* Summary */
    .hero {
      --tone: #0d9488;
      --tone-tint: #e6f7f5;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid var(--tone);
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .hero--failed {
      --tone: #e11d48;
      --tone-tint: #ffebf0;
    }

    .hero__icon {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--tone-tint);
      color: var(--tone);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .hero__text {
      min-width: 0;
    }

    .hero__top {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .hero__event {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .hero__entity {
      margin-top: 3px;
      font-size: 13px;
      color: #475569;
      word-break: break-word;
    }

    .status-pill {
      padding: 2px 10px;
      border-radius: 999px;
      background: #e6f7f5;
      color: #0f766e;
      font-size: 11.5px;
      font-weight: 700;
    }

    .status-pill--failed {
      background: #ffebf0;
      color: #be123c;
    }

    /* Cards (green header, same as the other detail panels) */
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

    /* Event details grid */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 18px;
      margin: 0;
      padding: 14px 16px 16px;

      dt {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #64748b;

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
          color: #94a3b8;
        }
      }

      dd {
        margin: 0;
        font-size: 13.5px;
        font-weight: 600;
        color: #0f172a;
        word-break: break-word;
      }
    }

    .action-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12.5px;
      font-weight: 600;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px !important;
    }

    .details-text {
      margin: 0;
      padding: 14px 16px 16px;
      font-size: 13.5px;
      line-height: 1.55;
      color: #334155;
    }

    /* Changes: field, then old → new */
    .changes {
      list-style: none;
      margin: 0;
      padding: 4px 16px;
    }

    .change {
      padding: 12px 0;

      & + & {
        border-top: 1px dashed #e2e8f0;
      }
    }

    .change__field {
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
    }

    .change__values {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .change__arrow {
      flex-shrink: 0;
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #94a3b8;
    }

    .old-value,
    .new-value {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      word-break: break-word;
    }

    .old-value {
      background: #fef2f2;
      color: #b91c1c;
      text-decoration: line-through;
      text-decoration-color: rgba(185, 28, 28, 0.4);
    }

    .new-value {
      background: #f0fdf4;
      color: #15803d;
      font-weight: 600;
    }

    .immutable-note {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px;
      font-size: 12px;
      color: #64748b;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    /* Footer */
    .panel-footer {
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      display: flex;
      justify-content: flex-end;
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
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AuditLogDetailPanelComponent {
  @Input() isOpen = false;
  @Input() log?: AuditLog;
  @Output() closePanel = new EventEmitter<void>();

  readonly module = auditModule;
  readonly action = auditAction;

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.isOpen && shouldCloseOnEscape(event)) this.closePanel.emit();
  }
}
