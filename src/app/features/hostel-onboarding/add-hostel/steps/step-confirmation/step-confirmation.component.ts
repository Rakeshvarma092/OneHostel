import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PLAN_DETAILS, PlanName } from '../../plan-details';

@Component({
  selector: 'app-step-confirmation',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    @if (value) {
      <div class="confirm-grid">
        <div class="confirm-card">
          <div class="confirm-card__header">
            <span class="confirm-card__icon confirm-card__icon--blue"><mat-icon>apartment</mat-icon></span>
            <h3 class="confirm-card__title">Hostel Details</h3>
          </div>
          <div class="confirm-row"><span>Hostel Name</span><strong>{{ value.hostelInfo.hostelName || '—' }}</strong></div>
          <div class="confirm-row"><span>Type</span><strong>{{ value.hostelInfo.hostelType || '—' }}</strong></div>
          <div class="confirm-row"><span>Category</span><strong>{{ value.hostelInfo.hostelCategory || '—' }}</strong></div>
          <div class="confirm-row"><span>Gender</span><strong>{{ value.hostelInfo.gender || '—' }}</strong></div>
          <div class="confirm-row"><span>Contact</span><strong>{{ value.hostelInfo.contactNumber || '—' }}</strong></div>
          <div class="confirm-row"><span>Email</span><strong>{{ value.hostelInfo.email || '—' }}</strong></div>
          <div class="confirm-row">
            <span>Address</span>
            <strong>{{ value.address.addressLine1 }}, {{ value.address.city }}, {{ value.address.state }}, {{ value.address.country }} {{ value.address.pincode }}</strong>
          </div>
          <div class="confirm-row"><span>Capacity</span><strong>{{ value.capacity.buildings }} buildings &middot; {{ value.capacity.floors }} floors &middot; {{ value.capacity.rooms }} rooms &middot; {{ value.capacity.totalBeds }} beds</strong></div>
        </div>

        <div class="confirm-card">
          <div class="confirm-card__header">
            <span class="confirm-card__icon confirm-card__icon--purple"><mat-icon>admin_panel_settings</mat-icon></span>
            <h3 class="confirm-card__title">Admin Details</h3>
          </div>
          <div class="confirm-row"><span>Name</span><strong>{{ value.admin.firstName }} {{ value.admin.lastName }}</strong></div>
          <div class="confirm-row"><span>Username</span><strong>{{ value.admin.username || '—' }}</strong></div>
          <div class="confirm-row"><span>Email</span><strong>{{ value.admin.email || '—' }}</strong></div>
          <div class="confirm-row"><span>Mobile</span><strong>{{ value.admin.mobileNumber || '—' }}</strong></div>
          <div class="confirm-row"><span>Role</span><strong>Admin</strong></div>
          <div class="confirm-row">
            <span>Send credentials via</span>
            <strong>{{ sendMethodsLabel }}</strong>
          </div>
        </div>

        <div class="confirm-card">
          <div class="confirm-card__header">
            <span class="confirm-card__icon confirm-card__icon--amber"><mat-icon>workspace_premium</mat-icon></span>
            <h3 class="confirm-card__title">Subscription Details</h3>
          </div>
          <div class="confirm-row"><span>Plan</span><strong>{{ value.subscription.plan }}</strong></div>
          <div class="confirm-row"><span>Billing Cycle</span><strong>{{ value.subscription.billingCycle }}</strong></div>
          <div class="confirm-row"><span>Start Date</span><strong>{{ value.subscription.startDate | date: 'mediumDate' }}</strong></div>
          <div class="confirm-row"><span>End Date</span><strong>{{ value.subscription.endDate ? (value.subscription.endDate | date: 'mediumDate') : '—' }}</strong></div>
          <div class="confirm-row"><span>Resident Limit</span><strong>{{ planDetail.residentLimit }}</strong></div>
        </div>

        <div class="confirm-card">
          <div class="confirm-card__header">
            <span class="confirm-card__icon confirm-card__icon--teal"><mat-icon>stars</mat-icon></span>
            <h3 class="confirm-card__title">Enabled Features</h3>
          </div>
          <div class="confirm-chips">
            @for (feature of planDetail.features; track feature) {
              <span class="confirm-chip"><mat-icon>check_circle</mat-icon>{{ feature }}</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        @media (max-width: 720px) {
          grid-template-columns: 1fr;
        }
      }

      .confirm-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 18px 20px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        transition: box-shadow 0.15s ease, border-color 0.15s ease;

        &:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
        }
      }

      .confirm-card__header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 12px;
        margin-bottom: 12px;
        border-bottom: 1px solid #eef2f6;
      }

      .confirm-card__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 9px;
        flex-shrink: 0;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .confirm-card__icon--blue {
        background: #e8f0fe;
        color: #0057e7;
      }

      .confirm-card__icon--purple {
        background: #f1ebfd;
        color: #7c3aed;
      }

      .confirm-card__icon--amber {
        background: #fef3e2;
        color: #d97706;
      }

      .confirm-card__icon--teal {
        background: #e6f7f5;
        color: #0d9488;
      }

      .confirm-card__title {
        margin: 0;
        font-size: 13.5px;
        font-weight: 700;
        color: #0f224a;
      }

      .confirm-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 0;
        font-size: 12.5px;
        border-top: 1px solid #f1f5f9;
        border-radius: 6px;
        transition: background 0.15s ease;

        &:first-of-type {
          border-top: none;
        }

        &:hover {
          background: #f8fafc;
        }

        span {
          color: #64748b;
          flex-shrink: 0;
        }

        strong {
          color: #0f172a;
          text-align: right;
        }
      }

      .confirm-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .confirm-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #e6f7f5;
        color: #0d9488;
        border-radius: 999px;
        padding: 4px 12px 4px 8px;
        font-size: 11.5px;
        font-weight: 600;

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }
    `,
  ],
})
export class StepConfirmationComponent {
  @Input() value: any;

  get planDetail() {
    const plan = (this.value?.subscription?.plan as PlanName) ?? 'Standard';
    return PLAN_DETAILS[plan] ?? PLAN_DETAILS.Standard;
  }

  get sendMethodsLabel(): string {
    const methods: string[] = [];
    if (this.value?.admin?.sendEmail) methods.push('Email');
    if (this.value?.admin?.sendSms) methods.push('SMS');
    return methods.length > 0 ? methods.join(' + ') : 'Not sent';
  }
}
