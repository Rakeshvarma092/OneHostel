import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * App-wide custom validators, used alongside Angular's built-in Validators
 * (required, email, minLength, ...). Keep every cross-feature validation rule
 * here so it is written once and tested once.
 */
export class CustomValidators {
  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (typeof value === 'string' && value.trim().length === 0 && value.length > 0) {
      return { whitespace: true };
    }
    return null;
  }

  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const pattern = /^[+]?[0-9]{7,15}$/;
    return pattern.test(value) ? null : { phoneNumber: true };
  }

  static matchField(matchTo: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parent = control.parent;
      if (!parent) return null;
      const target = parent.get(matchTo);
      if (!target) return null;
      return control.value === target.value ? null : { fieldMismatch: true };
    };
  }

  static minAge(minYears: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const dob = new Date(control.value);
      const ageDate = new Date(Date.now() - dob.getTime());
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return age >= minYears ? null : { minAge: { requiredAge: minYears } };
    };
  }
}
