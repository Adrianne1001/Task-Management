import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { isBeforeDay } from '../dates';

/**
 * Like `Validators.required`, but whitespace-only text also fails. Mirrors the
 * backend, which trims input before its `required` rule runs.
 */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;

  return typeof value === 'string' && value.trim() === '' ? { required: true } : null;
};

/**
 * Group validator: the end date may not be earlier than the start date. Only
 * applies when both dates are set (either may be left empty), matching the
 * API's `after_or_equal:startDate` rule.
 */
export function dateRangeValidator(startKey: string, endKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start: unknown = group.get(startKey)?.value;
    const end: unknown = group.get(endKey)?.value;

    if (!isValidDate(start) || !isValidDate(end)) {
      return null;
    }

    return isBeforeDay(end, start) ? { dateRange: true } : null;
  };
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
