import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService } from '../../../core/services/auth.service';
import { AppButtonComponent } from '../../../shared/components/button/app-button.component';
import { AppFormErrorComponent } from '../../../shared/components/form-error/app-form-error.component';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { ForgotPasswordDialogComponent } from '../forgot-password-dialog/forgot-password-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    AppButtonComponent,
    AppFormErrorComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;

  readonly form = this.fb.group({
    username: ['', [Validators.required, CustomValidators.noWhitespace]],
    password: ['', [Validators.required]],
  });

  loading = false;
  hidePassword = true;
  capsLockOn = false;
  /** Toggled briefly on a failed login to trigger the shake animation, then cleared so it can replay next time. */
  loginFailed = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onPasswordKeyEvent(event: KeyboardEvent): void {
    this.capsLockOn = event.getModifierState?.('CapsLock') ?? false;
  }

  fillDemoCredentials(): void {
    this.form.setValue({
      username: 'superadmin@onehostel.com',
      password: 'Password123!',
    });
    this.form.markAsPristine();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    this.loading = true;

    this.authService.login({ email: username!.trim(), password: password!, rememberMe: true }).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        const message =
          error.status === 401
            ? 'Incorrect username or password.'
            : 'Something went wrong while signing you in. Please try again.';
        this.snackBar.open(message, 'Dismiss', { duration: 5000, panelClass: 'app-snackbar--error' });

        // Brief shake for a clear "try again" cue, then refocus password for a fast retry.
        this.loginFailed = true;
        setTimeout(() => (this.loginFailed = false), 500);
        this.passwordInput?.nativeElement.focus();
      },
    });
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.dialog.open(ForgotPasswordDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      panelClass: 'forgot-password-modal-panel',
    });
  }
}
