import { fromApiDate, isBeforeDay, toApiDate } from './dates';

describe('dates', () => {
  it('parses API dates as local calendar days', () => {
    const date = fromApiDate('2026-03-01')!;

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 2, 1]);
    expect(date.getHours()).toBe(0);
  });

  it('returns null for empty or malformed API dates', () => {
    expect(fromApiDate(null)).toBeNull();
    expect(fromApiDate('')).toBeNull();
    expect(fromApiDate('03/01/2026')).toBeNull();
  });

  it('formats local dates without shifting the day through UTC', () => {
    // Late evening local time: toISOString() would roll over to the next day
    // for negative UTC offsets, or back a day for positive ones near midnight.
    expect(toApiDate(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31');
    expect(toApiDate(new Date(2026, 11, 1, 0, 15))).toBe('2026-12-01');
  });

  it('round-trips', () => {
    expect(toApiDate(fromApiDate('2025-02-28'))).toBe('2025-02-28');
  });

  it('formats null and invalid dates as null', () => {
    expect(toApiDate(null)).toBeNull();
    expect(toApiDate(new Date('not a date'))).toBeNull();
  });

  it('compares calendar days, ignoring the time of day', () => {
    expect(isBeforeDay(new Date(2026, 0, 1, 23), new Date(2026, 0, 2, 1))).toBe(true);
    expect(isBeforeDay(new Date(2026, 0, 2, 23), new Date(2026, 0, 2, 1))).toBe(false);
    expect(isBeforeDay(new Date(2026, 0, 3), new Date(2026, 0, 2))).toBe(false);
  });
});
