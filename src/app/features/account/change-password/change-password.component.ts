import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountService } from '../../../core/services/account.service';
import {
  PasswordPolicy,
  PasswordRule,
  PasswordStrength,
  changePasswordGroupValidator,
  passwordPolicyValidator,
  passwordRules,
  passwordStrength,
} from '../../../core/models/account.models';
import { UnsavedChangesAware } from '../../../core/guards/unsaved-changes.guard';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent implements UnsavedChangesAware {
  @ViewChild('currentInput') private currentInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly account = inject(AccountService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  /** Password format from Settings → Security. */
  get policy(): PasswordPolicy {
    return this.account.passwordPolicy;
  }

  get minLength(): number {
    return this.policy.minLength;
  }

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordPolicyValidator(() => this.policy)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: changePasswordGroupValidator },
  );

  visible: Record<PasswordField, boolean> = { currentPassword: false, newPassword: false, confirmPassword: false };
  capsLockOn = false;
  saving = false;
  /** Set after a successful change; swaps the form for a confirmation panel. */
  done = false;

  get rules(): (PasswordRule & { passed: boolean })[] {
    const value = this.form.controls.newPassword.value;
    return passwordRules(this.policy).map((r) => ({ ...r, passed: r.test(value) }));
  }

  get strength(): PasswordStrength {
    return passwordStrength(this.form.controls.newPassword.value, this.policy);
  }

  /** Tip text listing only the character types Settings requires. */
  get requiredMix(): string {
    const p = this.policy;
    const parts = [
      p.requireUppercase && 'uppercase',
      p.requireLowercase && 'lowercase',
      p.requireNumber && 'numbers',
      p.requireSpecialChar && 'special characters',
    ].filter(Boolean) as string[];
    if (!parts.length) return '';
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  }

  get passwordAgeDays(): number {
    return this.account.passwordAgeDays;
  }

  get passwordExpiresInDays(): number | null {
    return this.account.passwordExpiresInDays;
  }

  /** When the password was last changed (for the "Last Changed" card). */
  get lastChangedOn(): string | null {
    return this.account.profile?.passwordChangedAt ?? null;
  }

  /** When the current password expires, or null if passwords never expire. */
  get expiresOn(): Date | null {
    const days = this.passwordExpiresInDays;
    if (days === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  /** Strength bar fill (0–100) and colour tone for the current score (0–4). */
  get strengthPercent(): number {
    return this.form.controls.newPassword.value ? Math.max(8, (this.strength.score / 4) * 100) : 0;
  }

  get strengthTone(): 'weak' | 'fair' | 'good' | 'strong' {
    const s = this.strength.score;
    return s <= 1 ? 'weak' : s === 2 ? 'fair' : s === 3 ? 'good' : 'strong';
  }

  get confirmMatches(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return !!confirmPassword && newPassword === confirmPassword;
  }

  showError(field: PasswordField, error: string): boolean {
    const c = this.form.controls[field];
    return c.hasError(error) && (c.dirty || c.touched);
  }

  showGroupError(error: 'sameAsCurrent' | 'mismatch', field: PasswordField): boolean {
    const c = this.form.controls[field];
    return this.form.hasError(error) && (c.dirty || c.touched);
  }

  toggle(field: PasswordField): void {
    this.visible[field] = !this.visible[field];
  }

  onKey(event: KeyboardEvent): void {
    this.capsLockOn = event.getModifierState?.('CapsLock') ?? false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving = true;

    this.account.changePassword(currentPassword, newPassword).subscribe((result) => {
      this.saving = false;
      if (result === 'wrong-current') {
        const current = this.form.controls.currentPassword;
        current.setErrors({ incorrect: true });
        current.markAsTouched();
        this.currentInput?.nativeElement.focus();
        this.currentInput?.nativeElement.select();
        return;
      }
      this.form.reset();
      this.done = true;
    });
  }

  onCancel(): void {
    this.router.navigate(['/profile']);
  }

  changeAgain(): void {
    this.done = false;
    this.visible = { currentPassword: false, newPassword: false, confirmPassword: false };
  }

  // ---- Leave guard -----------------------------------------------------------

  confirmLeave(): Observable<boolean> {
    if (this.done || !this.form.dirty) return of(true);
    return this.confirm.confirm({
      title: 'Leave without saving?',
      message: "Your password hasn't been changed yet. What you've typed will be cleared.",
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.done && this.form.dirty) event.preventDefault();
  }
}
