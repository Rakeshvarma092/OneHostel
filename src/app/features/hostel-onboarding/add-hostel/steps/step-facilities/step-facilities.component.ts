import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface FacilityOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-step-facilities',
  standalone: true,
  imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <div [formGroup]="formGroup">
      <div class="facilities-grid">
        @for (facility of facilities; track facility.key) {
          <mat-checkbox [formControlName]="facility.key">{{ facility.label }}</mat-checkbox>
        }
      </div>

      @if (formGroup.get('other')?.value) {
        <div class="field-group other-field">
          <label class="field-label">Other Facility</label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="otherFacility" placeholder="e.g. Rooftop lounge" />
          </mat-form-field>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .facilities-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 20px;

        @media (max-width: 720px) {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .other-field {
        width: 100%;
        max-width: 420px;
      }

      ::ng-deep .facilities-grid .mat-mdc-checkbox {
        --mdc-checkbox-selected-icon-color: #0d9488;
        --mdc-checkbox-selected-focus-icon-color: #0d9488;
        --mdc-checkbox-selected-hover-icon-color: #0d9488;
        --mdc-checkbox-selected-pressed-icon-color: #0d9488;
        --mdc-checkbox-selected-checkmark-color: #ffffff;
        --mat-checkbox-checked-ripple-color: #0d9488;
      }
    `,
  ],
})
export class StepFacilitiesComponent {
  @Input({ required: true }) formGroup!: FormGroup;

  readonly facilities: FacilityOption[] = [
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'mess', label: 'Mess' },
    { key: 'laundry', label: 'Laundry' },
    { key: 'washingMachine', label: 'Washing Machine' },
    { key: 'parking', label: 'Parking' },
    { key: 'housekeeping', label: 'Housekeeping' },
    { key: 'security', label: 'Security' },
    { key: 'cctv', label: 'CCTV' },
    { key: 'gym', label: 'Gym' },
    { key: 'commonRoom', label: 'Common Room' },
    { key: 'studyRoom', label: 'Study Room' },
    { key: 'powerBackup', label: 'Power Backup' },
    { key: 'waterFacility', label: 'Water Facility' },
    { key: 'other', label: 'Other' },
  ];
}
