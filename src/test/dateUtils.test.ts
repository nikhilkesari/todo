import { describe, it, expect } from 'vitest';
import {
  getTodayDateString,
  getTomorrowDateString,
  formatDueDate,
  checkIsToday,
  checkIsUpcoming,
  checkIsOverdue,
} from '../utils/dateUtils';
import { addDays, subDays, format } from 'date-fns';

describe('dateUtils', () => {
  it('correctly generates today and tomorrow date strings in YYYY-MM-DD format', () => {
    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today).not.toBe(tomorrow);
  });

  it('correctly identifies today, upcoming, and overdue dates', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    expect(checkIsToday(today)).toBe(true);
    expect(checkIsToday(tomorrow)).toBe(false);
    expect(checkIsToday(yesterday)).toBe(false);

    expect(checkIsUpcoming(tomorrow)).toBe(true);
    expect(checkIsUpcoming(today)).toBe(false);
    expect(checkIsUpcoming(yesterday)).toBe(false);

    expect(checkIsOverdue(yesterday)).toBe(true);
    expect(checkIsOverdue(today)).toBe(false);
    expect(checkIsOverdue(tomorrow)).toBe(false);
  });

  it('formats due dates nicely', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    expect(formatDueDate(today)).toBe('Today');
    expect(formatDueDate(tomorrow)).toBe('Tomorrow');
    expect(formatDueDate('')).toBe('');
  });
});
