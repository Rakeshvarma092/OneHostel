import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';

import { CustomValidators } from '../../../shared/validators/custom-validators';
import { MOCK_HOSTEL_RECORDS } from './mock-hostel-records';
import { StepHostelInfoComponent } from './steps/step-hostel-info/step-hostel-info.component';
import { StepAddressComponent } from './steps/step-address/step-address.component';
import { StepCapacityComponent } from './steps/step-capacity/step-capacity.component';
import { StepFacilitiesComponent } from './steps/step-facilities/step-facilities.component';
import { StepAdminComponent } from './steps/step-admin/step-admin.component';
import { StepSubscriptionComponent } from './steps/step-subscription/step-subscription.component';
import { StepConfirmationComponent } from './steps/step-confirmation/step-confirmation.component';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { diffForAudit } from '../../../core/models/audit.models';

/** Hostel fields compared for the "Update Hostel" audit entry (flattened across steps). */
const HOSTEL_AUDIT_FIELDS: Record<string, string> = {
  hostelName: 'Hostel Name',
  hostelType: 'Hostel Type',
  hostelCategory: 'Category',
  gender: 'Gender',
  contactNumber: 'Contact Number',
  email: 'Email',
  website: 'Website',
  addressLine1: 'Address Line 1',
  addressLine2: 'Address Line 2',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  buildings: 'Buildings',
  floors: 'Floors',
  rooms: 'Rooms',
  totalBeds: 'Total Beds',
  plan: 'Plan',
  billingCycle: 'Billing Cycle',
  startDate: 'Subscription Start',
  endDate: 'Subscription End',
};

/**
 * Smart page: owns the whole "Add Hostel" wizard's root FormGroup (one child
 * FormGroup per step) plus the create/draft flow and the post-create success
 * state. Each step is a dumb presentational component that only receives the
 * FormGroup slice (or, for the read-only confirmation step, the raw value)
 * it needs to render.
 */
@Component({
  selector: 'app-add-hostel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatIconModule,
    StepHostelInfoComponent,
    StepAddressComponent,
    StepCapacityComponent,
    StepFacilitiesComponent,
    StepAdminComponent,
    StepSubscriptionComponent,
    StepConfirmationComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './add-hostel.component.html',
  styleUrl: './add-hostel.component.scss',
})
export class AddHostelComponent implements OnInit {
  @ViewChild('stepper') private stepperRef?: MatStepper;

  submitting = false;
  created = false;
  createdHostelId = '';

  /** Set from the `:id` route param — when present, the wizard edits that hostel instead of creating a new one. */
  isEditMode = false;
  private editingHostelId = '';
  /** Values as loaded for editing, so the audit entry can record old → new. */
  private originalAuditValues: Record<string, unknown> = {};

  readonly totalSteps = 7;

  get selectedIndex(): number {
    return this.stepperRef?.selectedIndex ?? 0;
  }

  get isLastStep(): boolean {
    return this.selectedIndex === this.totalSteps - 1;
  }

  private get currentStepGroup(): FormGroup | null {
    const groups: (FormGroup | null)[] = [
      this.hostelInfoGroup,
      this.addressGroup,
      this.capacityGroup,
      this.facilitiesGroup,
      this.adminGroup,
      this.subscriptionGroup,
      null,
    ];
    return groups[this.selectedIndex];
  }

  onToolbarNext(): void {
    const group = this.currentStepGroup;
    if (group && this.stepperRef) {
      this.goNext(group, this.stepperRef);
    }
  }

  readonly form = this.fb.group({
    hostelInfo: this.fb.group({
      hostelName: ['', Validators.required],
      hostelType: ['', Validators.required],
      hostelCategory: ['', Validators.required],
      gender: ['', Validators.required],
      contactCountryCode: ['+1', Validators.required],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      alternateContact: ['', CustomValidators.phoneNumber],
      website: ['', Validators.pattern(/^https?:\/\/.+/)],
      logoFileName: [''],
    }),
    address: this.fb.group({
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      country: ['', Validators.required],
      state: ['', Validators.required],
      city: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      latitude: [''],
      longitude: [''],
    }),
    capacity: this.fb.group({
      buildings: [2, [Validators.required, Validators.min(1)]],
      floors: [5, [Validators.required, Validators.min(1)]],
      rooms: [150, [Validators.required, Validators.min(1)]],
      totalBeds: [500, [Validators.required, Validators.min(1)]],
    }),
    facilities: this.fb.group({
      wifi: [false],
      mess: [false],
      laundry: [false],
      washingMachine: [false],
      parking: [false],
      housekeeping: [false],
      security: [false],
      cctv: [false],
      gym: [false],
      commonRoom: [false],
      studyRoom: [false],
      powerBackup: [false],
      waterFacility: [false],
      other: [false],
      otherFacility: [''],
    }),
    admin: this.fb.group({
      firstName: ['', Validators.required],
      lastName: [''],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      tempPassword: [this.generatePassword(), Validators.required],
      sendEmail: [true],
      sendSms: [true],
    }),
    subscription: this.fb.group({
      plan: ['Standard', Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [null as Date | null, Validators.required],
      billingCycle: ['Monthly', Validators.required],
    }),
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private auditLog: AuditLogService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEditMode = true;
    this.editingHostelId = id;

    const record = MOCK_HOSTEL_RECORDS[id];
    if (record) {
      this.form.patchValue(record);
    }
    this.originalAuditValues = this.flatAuditValues();
  }

  /** Step values flattened to one level; the admin step is excluded so passwords never reach the log. */
  private flatAuditValues(): Record<string, unknown> {
    const v = this.form.getRawValue();
    return { ...v.hostelInfo, ...v.address, ...v.capacity, ...v.subscription };
  }

  private recordAudit(): void {
    const v = this.form.getRawValue();
    const hostelName = v.hostelInfo.hostelName ?? '';

    if (this.isEditMode) {
      this.auditLog.record('Update Hostel', hostelName, {
        changes: diffForAudit(this.originalAuditValues, this.flatAuditValues(), HOSTEL_AUDIT_FIELDS),
      });
      return;
    }

    this.auditLog.record('Create Hostel', hostelName, {
      details: `${v.hostelInfo.hostelType} in ${v.address.city} · ${v.capacity.totalBeds} beds · ${v.subscription.plan} plan`,
    });
    this.auditLog.record('Create Admin', v.admin.username ?? '', {
      details: `Admin for ${hostelName}. Credentials sent by ${[
        v.admin.sendEmail ? 'email' : '',
        v.admin.sendSms ? 'SMS' : '',
      ]
        .filter(Boolean)
        .join(' & ') || 'no channel'}.`,
    });
  }

  get hostelInfoGroup(): FormGroup {
    return this.form.get('hostelInfo') as FormGroup;
  }

  get addressGroup(): FormGroup {
    return this.form.get('address') as FormGroup;
  }

  get capacityGroup(): FormGroup {
    return this.form.get('capacity') as FormGroup;
  }

  get facilitiesGroup(): FormGroup {
    return this.form.get('facilities') as FormGroup;
  }

  get adminGroup(): FormGroup {
    return this.form.get('admin') as FormGroup;
  }

  get subscriptionGroup(): FormGroup {
    return this.form.get('subscription') as FormGroup;
  }

  get formValue() {
    return this.form.getRawValue();
  }

  goNext(group: FormGroup, stepper: MatStepper): void {
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }
    stepper.next();
  }

  regeneratePassword(): void {
    this.adminGroup.get('tempPassword')?.setValue(this.generatePassword());
  }

  onSaveDraft(): void {
    this.snackBar.open('Draft saved. You can continue onboarding this hostel later.', 'Dismiss', { duration: 4000 });
    this.router.navigate(['/hostel-onboarding']);
  }

  onCreateHostel(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    setTimeout(() => {
      this.submitting = false;
      this.created = true;
      this.recordAudit();
      this.createdHostelId = this.isEditMode
        ? this.editingHostelId
        : `HST${String(Math.floor(Math.random() * 900000) + 100000)}`;
    }, 900);
  }

  onSendCredentials(): void {
    this.snackBar.open('Credentials sent to the admin.', 'Dismiss', { duration: 3000 });
  }

  onBackToList(): void {
    this.router.navigate(['/hostel-onboarding']);
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${password}!`;
  }
}
