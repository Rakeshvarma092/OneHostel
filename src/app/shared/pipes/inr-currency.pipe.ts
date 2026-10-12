import { Pipe, PipeTransform } from '@angular/core';

const formatters = new Map<number, Intl.NumberFormat>();

/**
 * Formats a number as Indian Rupees with Indian digit grouping
 * (₹12,34,567 rather than ₹1,234,567). `fractionDigits` fixes the decimals shown.
 *
 * Usage: {{ amount | inrCurrency }}  or  {{ amount | inrCurrency: 2 }}
 */
@Pipe({ name: 'inrCurrency', standalone: true })
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, fractionDigits = 0): string {
    if (value === null || value === undefined || isNaN(value)) return '';

    let formatter = formatters.get(fractionDigits);
    if (!formatter) {
      formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
      formatters.set(fractionDigits, formatter);
    }
    return formatter.format(value);
  }
}
