import { format, isToday, isBefore, isAfter, startOfDay, parseISO, addDays } from 'date-fns';

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getTomorrowDateString(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    if (isToday(parsed)) return 'Today';
    const tomorrow = startOfDay(addDays(new Date(), 1));
    if (startOfDay(parsed).getTime() === tomorrow.getTime()) return 'Tomorrow';
    return format(parsed, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function checkIsToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const parsed = parseISO(dateStr);
    return isToday(parsed);
  } catch {
    return false;
  }
}

export function checkIsUpcoming(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const parsed = parseISO(dateStr);
    const today = startOfDay(new Date());
    return isAfter(startOfDay(parsed), today);
  } catch {
    return false;
  }
}

export function checkIsOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const parsed = parseISO(dateStr);
    const today = startOfDay(new Date());
    return isBefore(startOfDay(parsed), today);
  } catch {
    return false;
  }
}
