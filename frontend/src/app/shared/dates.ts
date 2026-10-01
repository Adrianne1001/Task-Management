const API_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * API dates are calendar dates (`YYYY-MM-DD`) with no time zone. These helpers
 * work in local time on purpose: `Date#toISOString()` converts to UTC and would
 * shift the day for users east of Greenwich.
 */
export function fromApiDate(value: string | null): Date | null {
  const match = value ? API_DATE.exec(value) : null;

  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);

  return new Date(year, month - 1, day);
}

export function toApiDate(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Compares calendar days only, ignoring any time component. */
export function isBeforeDay(date: Date, other: Date): boolean {
  return dayNumber(date) < dayNumber(other);
}

function dayNumber(date: Date): number {
  return date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate();
}
