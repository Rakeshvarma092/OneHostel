import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppFormErrorComponent } from '../../../../../shared/components/form-error/app-form-error.component';

@Component({
  selector: 'app-step-hostel-info',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, AppFormErrorComponent],
  template: `
    <div [formGroup]="formGroup">
      <h3 class="step-section-title">Basic Details</h3>
      <div class="step-grid">
        <div class="field-group">
          <label class="field-label">Hostel Name<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="hostelName" placeholder="Enter Hostel Name" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelName')" label="Hostel name"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Hostel Type<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="hostelType" placeholder="Select Hostel Type">
              <mat-option value="Regular Hostel">Regular Hostel</mat-option>
              <mat-option value="College Hostel">College Hostel</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelType')" label="Hostel type"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Hostel Category<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="hostelCategory" placeholder="Select Category">
              <mat-option value="Premium">Premium</mat-option>
              <mat-option value="Standard">Standard</mat-option>
              <mat-option value="Economy">Economy</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelCategory')" label="Hostel category"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Gender<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="gender" placeholder="Select Gender">
              <mat-option value="Male">Male</mat-option>
              <mat-option value="Female">Female</mat-option>
              <mat-option value="Co-ed">Co-ed</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('gender')" label="Gender"></app-form-error>
        </div>
      </div>

      <h3 class="step-section-title">Contact &amp; Online Presence</h3>
      <div class="step-grid">
        <div class="field-group">
          <label class="field-label">Mobile Number<span class="required-mark">*</span></label>
          <div class="combined-phone-field">
            <select class="phone-code-select" formControlName="contactCountryCode">
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+91">+91</option>
              <option value="+61">+61</option>
              <option value="+971">+971</option>
            </select>
            <span class="phone-divider"></span>
            <input
              type="tel"
              class="phone-number-input"
              formControlName="contactNumber"
              placeholder="Enter 10-digit number"
              maxlength="10"
              inputmode="numeric"
            />
          </div>
          <app-form-error [control]="formGroup.get('contactNumber')" label="Mobile number"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Email<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <input matInput type="email" formControlName="email" placeholder="Enter Email Address" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('email')" label="Email"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Alternate Contact</label>
          <mat-form-field appearance="outline">
            <input matInput type="tel" formControlName="alternateContact" placeholder="Optional" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('alternateContact')" label="Alternate contact"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Website</label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="website" placeholder="https://example.com (optional)" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('website')" label="Website"></app-form-error>
        </div>
      </div>

      <h3 class="step-section-title">Branding</h3>
      <div class="field-group logo-field">
        <label class="field-label">Logo</label>
        <div class="logo-dropzone" (click)="fileInput.click()">
          <span class="logo-dropzone__choose">Choose File</span>
          <span class="logo-dropzone__hint">
            {{ formGroup.get('logoFileName')?.value || 'Accepts JPG, PNG, JPEG' }}
          </span>
        </div>
        <input #fileInput type="file" accept="image/jpeg,image/png,image/jpg" class="upload-input" (change)="onLogoSelected($event)" />
      </div>
    </div>
  `,
  styles: [
    `
      .step-section-title {
        margin: 0 0 14px;
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #94a3b8;
      }

      .step-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 28px;

        @media (max-width: 720px) {
          grid-template-columns: 1fr;
        }
      }

      /* Single bordered box housing both the country-code select and the
         number input, matching the plain-label + bordered-box look used
         for every other field — this one is custom since it holds two
         native controls, which a single mat-form-field can't host at once. */
      .combined-phone-field {
        display: flex;
        align-items: center;
        width: 100%;
        height: 44px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 12px;
        transition: border-color 0.15s ease;

        &:focus-within {
          border-color: #0057e7;
          border-width: 2px;
          padding: 0 11px;
        }
      }

      .phone-code-select {
        border: none;
        outline: none;
        background: transparent;
        font-size: 13.5px;
        color: #1e293b;
        padding-right: 8px;
        cursor: pointer;
      }

      .phone-divider {
        width: 1px;
        height: 20px;
        background: #e2e8f0;
        margin-right: 10px;
        flex-shrink: 0;
      }

      .phone-number-input {
        flex: 1 1 auto;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-size: 13.5px;
        color: #1e293b;

        &::placeholder {
          color: #94a3b8;
        }
      }

      .field-group.logo-field {
        max-width: 420px;
      }

      .logo-dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 28px 16px;
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;

        &:hover {
          border-color: #0d9488;
          background: #f7fdfc;
        }
      }

      .logo-dropzone__choose {
        font-size: 14px;
        font-weight: 700;
        color: #0d9488;
      }

      .logo-dropzone__hint {
        font-size: 12px;
        color: #64748b;
      }

      .upload-input {
        display: none;
      }
    `,
  ],
})
export class StepHostelInfoComponent {
  @Input({ required: true }) formGroup!: FormGroup;

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.formGroup.get('logoFileName')?.setValue(file?.name ?? '');
  }
}
