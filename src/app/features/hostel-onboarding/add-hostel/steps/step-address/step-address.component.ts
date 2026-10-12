import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AppFormErrorComponent } from '../../../../../shared/components/form-error/app-form-error.component';

@Component({
  selector: 'app-step-address',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    AppFormErrorComponent,
  ],
  template: `
    <div [formGroup]="formGroup" class="step-grid">
      <div class="field-group">
        <label class="field-label">Address Line 1<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="addressLine1" placeholder="Enter Address Line 1" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('addressLine1')" label="Address line 1"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Address Line 2</label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="addressLine2" placeholder="Optional" />
        </mat-form-field>
      </div>

      <div class="field-group">
        <label class="field-label">Pincode<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input
            matInput
            formControlName="pincode"
            placeholder="Enter 6-digit Pincode"
            maxlength="6"
            inputmode="numeric"
          />
          <mat-icon matSuffix class="pincode-search-icon">search</mat-icon>
        </mat-form-field>
        <app-form-error [control]="formGroup.get('pincode')" label="Pincode"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">City<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="city" placeholder="Enter City" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('city')" label="City"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">State<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="state" placeholder="Enter State" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('state')" label="State"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Country<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <mat-select formControlName="country" placeholder="Select Country">
            <mat-option value="United States">United States</mat-option>
            <mat-option value="United Kingdom">United Kingdom</mat-option>
            <mat-option value="India">India</mat-option>
            <mat-option value="Canada">Canada</mat-option>
            <mat-option value="Australia">Australia</mat-option>
          </mat-select>
        </mat-form-field>
        <app-form-error [control]="formGroup.get('country')" label="Country"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Latitude</label>
        <mat-form-field appearance="outline">
          <input matInput type="number" formControlName="latitude" placeholder="Optional" />
        </mat-form-field>
      </div>

      <div class="field-group">
        <label class="field-label">Longitude</label>
        <mat-form-field appearance="outline">
          <input matInput type="number" formControlName="longitude" placeholder="Optional" />
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [
    `
      .step-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        @media (max-width: 720px) {
          grid-template-columns: 1fr;
        }
      }

      .pincode-search-icon {
        color: #94a3b8;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    `,
  ],
})
export class StepAddressComponent {
  @Input({ required: true }) formGroup!: FormGroup;
}
