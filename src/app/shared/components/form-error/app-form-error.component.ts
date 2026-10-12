import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { getFirstErrorMessage } from '../../validators/validation-messages';

/**
 * Place immediately AFTER a <mat-form-field>'s closing tag (as a sibling,
 * NOT as content inside it), e.g.:
 *   <mat-form-field>
 *     <input matInput formControlName="email">
 *   </mat-form-field>
 *   <app-form-error [control]="form.get('email')" label="Email"></app-form-error>
 *
 * It must NOT be nested inside <mat-form-field>: Angular's content
 * projection for mat-error only matches a bare <mat-error> tag written
 * directly in the consumer's template, not a custom element that happens
 * to render one internally — nesting it causes mat-form-field to project
 * it into the default (input) slot instead of the error subscript area,
 * visually growing the outlined box around the error text.
 */
@Component({
  selector: 'app-form-error',
  standalone: true,
  template: `
    @if (control && control.invalid && (control.dirty || control.touched)) {
      <p class="app-form-error" role="alert">{{ message }}</p>
    }
  `,
  styleUrl: './app-form-error.component.scss',
})
export class AppFormErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() label = 'This field';

  get message(): string | null {
    return getFirstErrorMessage(this.control?.errors ?? null, this.label);
  }
}
