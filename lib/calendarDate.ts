export const CALENDAR_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function calendarMonth(value: string, offset: number): string {
  if (!isCalendarDate(`${value}-01`) || !Number.isInteger(offset)) throw Error('Invalid calendar month.');
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7));
  const index = Math.min(10000 * 12 - 1, Math.max(12, year * 12 + month - 1 + offset));
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}
export function calendarDays(month: string): (string | null)[] {
  if (!isCalendarDate(`${month}-01`)) return [];
  const start = new Date(`${month}-01T00:00:00Z`), result: (string | null)[] = Array(start.getUTCDay()).fill(null);
  for (let day = 1; day <= 31; day++) {
    const value = `${month}-${String(day).padStart(2, '0')}`;
    if (!isCalendarDate(value)) break;
    result.push(value);
  }
  while (result.length % 7) result.push(null);
  return result;
}
export function calendarDateLabel(value: string): string {
  return isCalendarDate(value) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Choose a date';
}
