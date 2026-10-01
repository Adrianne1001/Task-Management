import { FormControl, FormGroup } from '@angular/forms';

import { dateRangeValidator, notBlank } from './project-validators';

describe('notBlank', () => {
  it('fails for whitespace-only text', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
  });

  it('passes for real text and leaves empty values to Validators.required', () => {
    expect(notBlank(new FormControl(' Acme '))).toBeNull();
    expect(notBlank(new FormControl(null))).toBeNull();
  });
});

describe('dateRangeValidator', () => {
  const validator = dateRangeValidator('startDate', 'dueDate');

  function group(startDate: Date | null, dueDate: Date | null): FormGroup {
    return new FormGroup({
      startDate: new FormControl(startDate),
      dueDate: new FormControl(dueDate),
    });
  }

  it('fails when the due date is before the start date', () => {
    expect(validator(group(new Date(2026, 4, 10), new Date(2026, 4, 9)))).toEqual({
      dateRange: true,
    });
  });

  it('allows the due date to equal the start date, even at different times', () => {
    expect(validator(group(new Date(2026, 4, 10, 18), new Date(2026, 4, 10, 9)))).toBeNull();
  });

  it('allows a due date after the start date', () => {
    expect(validator(group(new Date(2026, 4, 10), new Date(2026, 5, 1)))).toBeNull();
  });

  it('skips the check when either date is missing or invalid', () => {
    expect(validator(group(null, new Date(2026, 4, 9)))).toBeNull();
    expect(validator(group(new Date(2026, 4, 10), null))).toBeNull();
    expect(validator(group(new Date('nope'), new Date(2026, 4, 9)))).toBeNull();
  });
});
