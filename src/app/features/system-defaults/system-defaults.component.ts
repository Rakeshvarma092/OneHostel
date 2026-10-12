import { Component, HostListener, OnDestroy } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_SYSTEM_SETTINGS,
  EMAIL_PROVIDERS,
  PASSWORD_EXPIRY_OPTIONS,
  PAYMENT_GATEWAYS,
  PUSH_PROVIDERS,
  SMS_PROVIDERS,
  SettingsSection,
  SystemSettings,
  TIME_ZONE_OPTIONS,
} from '../../core/models/system-settings.models';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { UnsavedChangesAware } from '../../core/guards/unsaved-changes.guard';
import { applyTax, lateFeeFor } from '../subscription-payments/subscription-payment.models';

export interface PolicyStrength {
  score: number;
  max: number;
  label: 'Weak' | 'Moderate' | 'Strong';
  tips: string[];
}

const MAX_LOGO_BYTES = 512 * 1024;
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

interface SectionNavItem {
  key: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-system-defaults',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatRadioModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './system-defaults.component.html',
  styleUrl: './system-defaults.component.scss',
})
export class SystemDefaultsComponent implements OnDestroy, UnsavedChangesAware {
  readonly sections: SectionNavItem[] = [
    { key: 'general', label: 'General', icon: 'tune', description: 'Branding, support contact and regional formats.' },
    { key: 'security', label: 'Security', icon: 'shield', description: 'Password, login and session policies for all users.' },
    { key: 'communication', label: 'Communication', icon: 'forum', description: 'Providers used to send email, SMS and push notifications.' },
    { key: 'payment', label: 'Payment', icon: 'account_balance', description: 'Payment gateway and invoice numbering.' },
    { key: 'fees', label: 'Fees', icon: 'request_quote', description: 'GST and other charges on subscription payments, such as late payment fees.' },
  ];

  activeSection: SettingsSection = 'general';

  readonly countries = COUNTRY_OPTIONS;
  readonly currencies = CURRENCY_OPTIONS;
  readonly timeZones = TIME_ZONE_OPTIONS;
  readonly dateFormats = DATE_FORMAT_OPTIONS;
  readonly passwordExpiryOptions = PASSWORD_EXPIRY_OPTIONS;
  readonly emailProviders = EMAIL_PROVIDERS;
  readonly smsProviders = SMS_PROVIDERS;
  readonly pushProviders = PUSH_PROVIDERS;
  readonly paymentGateways = PAYMENT_GATEWAYS;

  readonly today = new Date();
  readonly samplePlanAmount = 1999;

  /** Secret inputs the user has chosen to reveal. */
  readonly revealed = new Set<string>();

  logoError = '';

  form!: FormGroup;
  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private settingsService: SystemSettingsService,
    private confirm: ConfirmDialogService,
    private snackBar: MatSnackBar,
  ) {
    this.buildForm(this.settingsService.settings);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Unsaved-changes protection & shortcuts
  // ---------------------------------------------------------------------------

  get hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  /** In-app navigation away from the page (route guard). */
  /** Leaving Settings never prompts: unsaved changes are simply dropped. */
  confirmLeave(): Observable<boolean> {
    return of(true);
  }

  /** Browser refresh / tab close. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) event.preventDefault();
  }

  /** Ctrl+S / Cmd+S saves the open section instead of the browser's "Save page". */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.activeGroup.dirty) this.save();
    }
  }

  /** Loads factory defaults into the form; nothing is stored until the user clicks Save. */
  resetToDefaults(): void {
    const section = this.activeSection;
    this.confirm
      .confirm({
        title: `Reset ${this.activeNav.label} settings?`,
        message: 'The form will be filled with the platform defaults. Review them, then click Submit to apply.',
        confirmLabel: 'Load defaults',
        cancelLabel: 'Cancel',
      })
      .subscribe((ok) => {
        if (!ok) return;
        const group = this.group(section);
        group.patchValue(structuredClone(DEFAULT_SYSTEM_SETTINGS[section]));
        group.markAsDirty();
        this.logoError = '';
      });
  }

  get isAtDefaults(): boolean {
    const current = this.group(this.activeSection).getRawValue();
    const defaults = DEFAULT_SYSTEM_SETTINGS[this.activeSection] as unknown as Record<string, unknown>;
    return Object.keys(defaults).every((k) => String(current[k]) === String(defaults[k]));
  }

  /** Invalid fields in the open section, for the footer hint. */
  get invalidCount(): number {
    return Object.values(this.activeGroup.controls).filter((c) => c.invalid).length;
  }

  // ---------------------------------------------------------------------------
  // Security: policy strength
  // ---------------------------------------------------------------------------

  get policyStrength(): PolicyStrength {
    return this.strengthOf(this.group('security').getRawValue());
  }

  /** "an uppercase letter, a number and a special character" — for the policy summary line. */
  get formatSummary(): string {
    const p = this.group('security').getRawValue();
    const parts = [
      p.requireUppercase && 'an uppercase letter',
      p.requireLowercase && 'a lowercase letter',
      p.requireNumber && 'a number',
      p.requireSpecialChar && 'a special character',
    ].filter(Boolean) as string[];
    if (parts.length <= 1) return parts[0] ?? '';
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  }

  /** Scores only the settings that apply to the chosen login method. */
  private strengthOf(p: {
    loginMethod?: string;
    minPasswordLength: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecialChar?: boolean;
    passwordExpiryDays: number;
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
    otpExpiryMinutes: number;
  }): PolicyStrength {
    const tips: string[] = [];
    let score = 0;
    let max = 0;

    if (p.loginMethod === 'OTP') {
      max += 2;
      const otp = Number(p.otpExpiryMinutes);
      if (otp <= 5) score += 2;
      else if (otp <= 10) {
        score += 1;
        tips.push('OTPs valid for 5 minutes or less are hardest to misuse.');
      } else tips.push('OTPs valid for more than 10 minutes are easier to misuse.');
    } else {
      max += 3;
      const len = Number(p.minPasswordLength);
      if (len >= 12) score += 2;
      else if (len >= 8) {
        score += 1;
        tips.push('Use 12+ characters for the strongest passwords.');
      } else tips.push('Minimum password length below 8 is easy to guess.');

      max += 1;
      const formatRules = [p.requireUppercase, p.requireLowercase, p.requireNumber, p.requireSpecialChar].filter(Boolean).length;
      if (formatRules >= 3) score += 1;
      else tips.push('Require at least 3 of: uppercase, lowercase, number, special character.');

      const expiry = Number(p.passwordExpiryDays);
      if (expiry > 0 && expiry <= 90) score += 1;
      else tips.push(expiry === 0 ? 'Passwords never expire.' : 'Expire passwords within 90 days.');
    }

    max += 2;
    if (Number(p.maxLoginAttempts) <= 5) score += 1;
    else tips.push('Lock accounts after 5 or fewer failed logins.');

    if (Number(p.sessionTimeoutMinutes) <= 30) score += 1;
    else tips.push('A session timeout of 30 minutes or less limits unattended access.');

    const ratio = score / max;
    const label = ratio >= 0.8 ? 'Strong' : ratio >= 0.5 ? 'Moderate' : 'Weak';
    return { score, max, label, tips };
  }

  /** 1..n, for drawing the strength meter's segments. */
  segments(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  private buildForm(s: SystemSettings): void {
    this.subs.unsubscribe();
    this.subs = new Subscription();

    this.form = this.fb.group({
      general: this.fb.group({
        applicationName: [s.general.applicationName, [Validators.required, Validators.maxLength(40)]],
        logoDataUrl: [s.general.logoDataUrl],
        logoFileName: [s.general.logoFileName],
        supportEmail: [s.general.supportEmail, [Validators.required, Validators.email]],
        supportPhoneCode: [s.general.supportPhoneCode, Validators.required],
        supportPhone: [s.general.supportPhone, [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
        defaultCountry: [s.general.defaultCountry, Validators.required],
        currency: [s.general.currency, Validators.required],
        timeZone: [s.general.timeZone, Validators.required],
        dateFormat: [s.general.dateFormat, Validators.required],
      }),
      security: this.fb.group({
        loginMethod: [s.security.loginMethod, Validators.required],
        // Method-specific validators are applied by the loginMethod watcher below.
        minPasswordLength: [s.security.minPasswordLength],
        requireUppercase: [s.security.requireUppercase],
        requireLowercase: [s.security.requireLowercase],
        requireNumber: [s.security.requireNumber],
        requireSpecialChar: [s.security.requireSpecialChar],
        passwordExpiryDays: [s.security.passwordExpiryDays],
        maxLoginAttempts: [s.security.maxLoginAttempts, this.intRange(3, 10)],
        sessionTimeoutMinutes: [s.security.sessionTimeoutMinutes, this.intRange(5, 480)],
        otpExpiryMinutes: [s.security.otpExpiryMinutes],
      }),
      communication: this.fb.group({
        emailProvider: [s.communication.emailProvider, Validators.required],
        emailSenderName: [s.communication.emailSenderName, Validators.required],
        emailSenderAddress: [s.communication.emailSenderAddress, [Validators.required, Validators.email]],
        emailApiKey: [s.communication.emailApiKey],
        smtpHost: [s.communication.smtpHost],
        smtpPort: [s.communication.smtpPort],
        smtpUsername: [s.communication.smtpUsername],
        smtpPassword: [s.communication.smtpPassword],
        smsProvider: [s.communication.smsProvider, Validators.required],
        smsSenderId: [s.communication.smsSenderId, [Validators.required, Validators.pattern(/^[A-Z0-9]{3,11}$/)]],
        smsApiKey: [s.communication.smsApiKey, Validators.required],
        pushEnabled: [s.communication.pushEnabled],
        pushProvider: [s.communication.pushProvider],
        pushProjectId: [s.communication.pushProjectId],
        pushServerKey: [s.communication.pushServerKey],
      }),
      payment: this.fb.group({
        paymentGateway: [s.payment.paymentGateway, Validators.required],
        gatewayMode: [s.payment.gatewayMode, Validators.required],
        gatewayKeyId: [s.payment.gatewayKeyId, Validators.required],
        gatewayKeySecret: [s.payment.gatewayKeySecret, Validators.required],
        currency: [s.payment.currency, Validators.required],
        invoicePrefix: [s.payment.invoicePrefix, [Validators.required, Validators.pattern(/^[A-Z0-9/-]{1,10}$/)]],
      }),
      fees: this.fb.group({
        gstEnabled: [s.fees.gstEnabled],
        gstRate: [s.fees.gstRate],
        gstin: [s.fees.gstin],
        pricesIncludeTax: [s.fees.pricesIncludeTax],
        lateFeeEnabled: [s.fees.lateFeeEnabled],
        lateFeeType: [s.fees.lateFeeType],
        lateFeeValue: [s.fees.lateFeeValue],
        lateFeeGraceDays: [s.fees.lateFeeGraceDays],
      }),
    });

    // Validators that depend on another field's value.
    // Security: only the chosen login method's fields are required.
    const sec = this.group('security');
    this.watch(sec.get('loginMethod')!, (method) => {
      const password = method !== 'OTP';
      const set = (key: string, validators: ValidatorFn[]) => {
        const control = sec.get(key)!;
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      };
      set('minPasswordLength', password ? this.intRange(6, 32) : []);
      set('passwordExpiryDays', password ? [Validators.required] : []);
      set('otpExpiryMinutes', password ? [] : this.intRange(1, 30));
    });

    const comm = this.group('communication');
    this.watch(comm.get('emailProvider')!, (provider) => {
      const smtp = provider === 'SMTP';
      this.setRequired(comm.get('emailApiKey')!, !smtp);
      this.setRequired(comm.get('smtpHost')!, smtp);
      this.setRequired(comm.get('smtpPort')!, smtp, [Validators.min(1), Validators.max(65535)]);
      this.setRequired(comm.get('smtpUsername')!, smtp);
      this.setRequired(comm.get('smtpPassword')!, smtp);
    });
    this.watch(comm.get('pushEnabled')!, (enabled) => {
      this.setRequired(comm.get('pushProvider')!, !!enabled);
      this.setRequired(comm.get('pushProjectId')!, !!enabled);
      this.setRequired(comm.get('pushServerKey')!, !!enabled);
    });
    const fees = this.group('fees');
    this.watch(fees.get('gstEnabled')!, (enabled) => {
      this.setRequired(fees.get('gstRate')!, !!enabled, [Validators.min(0), Validators.max(28)]);
      this.setRequired(fees.get('gstin')!, !!enabled, [Validators.pattern(GSTIN_PATTERN)]);
    });
    // Late fee: fields are required only while it's on; % is capped at 100.
    const applyLateFeeRules = () => {
      const enabled = !!fees.get('lateFeeEnabled')!.value;
      const percent = fees.get('lateFeeType')!.value === 'Percentage';
      this.setRequired(fees.get('lateFeeType')!, enabled);
      this.setRequired(fees.get('lateFeeValue')!, enabled, [Validators.min(0.01), ...(percent ? [Validators.max(100)] : [])]);
      this.setRequired(fees.get('lateFeeGraceDays')!, enabled, [Validators.min(0), Validators.max(60), Validators.pattern(/^\d+$/)]);
    };
    this.watch(fees.get('lateFeeEnabled')!, applyLateFeeRules);
    this.watch(fees.get('lateFeeType')!, applyLateFeeRules);
    // Picking a country pre-fills its dialling code.
    this.subs.add(
      this.group('general')
        .get('defaultCountry')!
        .valueChanges.subscribe((name) => {
          const code = COUNTRY_OPTIONS.find((c) => c.name === name)?.dialCode;
          if (code) this.group('general').get('supportPhoneCode')!.setValue(code);
        }),
    );
  }

  private watch(control: AbstractControl, apply: (value: any) => void): void {
    apply(control.value);
    this.subs.add(control.valueChanges.subscribe(apply));
  }

  private setRequired(control: AbstractControl, required: boolean, extra: ValidatorFn[] = []): void {
    control.setValidators(required ? [Validators.required, ...extra] : []);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private intRange(min: number, max: number): ValidatorFn[] {
    return [Validators.required, Validators.min(min), Validators.max(max), Validators.pattern(/^\d+$/)];
  }

  group(section: SettingsSection): FormGroup {
    return this.form.get(section) as FormGroup;
  }

  value(section: SettingsSection, key: string): any {
    return this.group(section).get(key)?.value;
  }

  get activeGroup(): FormGroup {
    return this.group(this.activeSection);
  }

  get activeNav(): SectionNavItem {
    return this.sections.find((s) => s.key === this.activeSection)!;
  }

  isDirty(section: SettingsSection): boolean {
    return this.group(section).dirty;
  }

  // ---------------------------------------------------------------------------
  // Section switching / save / discard
  // ---------------------------------------------------------------------------

  selectSection(key: SettingsSection): void {
    if (key === this.activeSection) return;
    if (!this.isDirty(this.activeSection)) {
      this.activeSection = key;
      return;
    }
    this.confirm
      .confirm({
        title: 'Discard unsaved changes?',
        message: `You have unsaved changes in ${this.activeNav.label} settings. Leave without saving?`,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.discard(this.activeSection);
        this.activeSection = key;
      });
  }

  discard(section: SettingsSection): void {
    this.group(section).reset(this.settingsService.settings[section]);
    this.group(section).markAsPristine();
    this.logoError = '';
  }

  save(): void {
    const section = this.activeSection;
    const group = this.group(section);
    if (group.invalid) {
      group.markAllAsTouched();
      this.snackBar.open('Please fix the highlighted fields before saving', 'x', { duration: 4000 });
      return;
    }

    const raw = group.getRawValue();
    const changes = this.settingsService.saveSection(section, this.normalize(section, raw));
    group.markAsPristine();

    this.snackBar.open(
      changes.length
        ? `${this.activeNav.label} settings saved · ${changes.length} change${changes.length > 1 ? 's' : ''} recorded in Audit Logs`
        : 'No changes to save',
      'x',
      { duration: 4000, panelClass: changes.length ? ['app-snackbar--success', 'green-snackbar'] : [] },
    );
  }

  /** Number inputs arrive as strings from some browsers; store them as numbers. */
  private normalize(section: SettingsSection, raw: any): any {
    const numericKeys: Record<SettingsSection, string[]> = {
      general: [],
      security: ['minPasswordLength', 'passwordExpiryDays', 'maxLoginAttempts', 'sessionTimeoutMinutes', 'otpExpiryMinutes'],
      communication: ['smtpPort'],
      payment: [],
      fees: ['gstRate', 'lateFeeValue', 'lateFeeGraceDays'],
    };
    const out = { ...raw };
    numericKeys[section].forEach((k) => {
      if (out[k] !== null && out[k] !== '') out[k] = Number(out[k]);
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // General: logo
  // ---------------------------------------------------------------------------

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.logoError = '';
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      this.logoError = 'Use a PNG, JPG or SVG image.';
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.logoError = 'Logo must be 512 KB or smaller.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const g = this.group('general');
      g.patchValue({ logoDataUrl: reader.result as string, logoFileName: file.name });
      g.markAsDirty();
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    const g = this.group('general');
    g.patchValue({ logoDataUrl: '', logoFileName: '' });
    g.markAsDirty();
  }

  // ---------------------------------------------------------------------------
  // Secrets
  // ---------------------------------------------------------------------------

  toggleReveal(key: string): void {
    if (this.revealed.has(key)) this.revealed.delete(key);
    else this.revealed.add(key);
  }

  // ---------------------------------------------------------------------------
  // Previews
  // ---------------------------------------------------------------------------

  /** Example of the next invoice number under the current prefix. */
  /**
   * Example for the Late Payment Fee preview: the sample plan's amount due
   * (with GST as configured), paid a few days after the grace period ends.
   */
  get lateFeePreview(): { amountDue: number; daysLate: number; fee: number; payable: number } | null {
    if (!this.value('fees', 'lateFeeEnabled')) return null;
    const value = Number(this.value('fees', 'lateFeeValue'));
    const graceDays = Number(this.value('fees', 'lateFeeGraceDays'));
    if (isNaN(value) || isNaN(graceDays)) return null;

    // Amount due includes GST exactly as configured above on this tab.
    const amountDue = this.taxPreview?.total ?? this.samplePlanAmount;
    const daysLate = graceDays + 3;
    const fee = lateFeeFor(amountDue, daysLate, {
      enabled: true,
      type: this.value('fees', 'lateFeeType') === 'Percentage' ? 'Percentage' : 'Fixed',
      value,
      graceDays,
    });
    return { amountDue, daysLate, fee, payable: Math.round((amountDue + fee) * 100) / 100 };
  }

  get invoicePreview(): string {
    return `${this.value('payment', 'invoicePrefix') || ''}${this.today.getFullYear()}-0143`;
  }

  /** Same calculation that new payments use (applyTax), so the preview matches real invoices. */
  get taxPreview(): { base: number; tax: number; total: number } | null {
    if (!this.value('fees', 'gstEnabled')) return null;
    const gstRate = Number(this.value('fees', 'gstRate'));
    if (isNaN(gstRate)) return null;
    const t = applyTax(this.samplePlanAmount, {
      gstEnabled: true,
      gstRate,
      pricesIncludeTax: !!this.value('fees', 'pricesIncludeTax'),
    });
    return { base: t.amount, tax: t.tax, total: t.totalAmount };
  }

  get paymentCurrencySymbol(): string {
    return this.value('payment', 'currency') || 'INR';
  }

  /** Codes like GSTIN / invoice prefix / sender ID are upper-case only; convert as the user types. */
  toUpper(section: SettingsSection, key: string): void {
    const c = this.group(section).get(key);
    const v: string = c?.value ?? '';
    if (v !== v.toUpperCase()) c!.setValue(v.toUpperCase());
  }

  hasError(section: SettingsSection, key: string, error: string): boolean {
    const c = this.group(section).get(key);
    return !!c && c.touched && c.hasError(error);
  }
}
