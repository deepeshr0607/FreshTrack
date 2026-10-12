import type { ExpirySelection, PantryCategory } from './api';

/** Tracking assumptions, editable per entry; these are not food-safety guarantees. */
export function expiryPreset(name: string, category: PantryCategory): { label: string; days: number } | null {
  const words = name.normalize('NFKC').toLowerCase().split(/[^a-z]+/);
  for (const [word, days] of [['milk', 7], ['spinach', 5], ['bread', 5]] as const) {
    if (words.includes(word)) return { label: word, days };
  }
  const defaults: Partial<Record<PantryCategory, number>> = { PRODUCE: 5, DAIRY: 7, BAKERY: 5 };
  const days = defaults[category];
  return days ? { label: `${category.toLowerCase()} default`, days } : null;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000') ||
      !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw Error('Use a valid date in YYYY-MM-DD format.');
  }
  return value;
}
export function resolveExpiry(value: unknown): { expiresOn: string; expirySource: 'PACKAGE_DATE' | 'USER_ENTERED' | 'PRESET_ESTIMATE'; freshnessPresetDays: number | null; purchaseDate: string | null; selection: ExpirySelection } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Choose an expiry date.');
  const fields = value as Record<string, unknown>;
  if (Object.keys(fields).some(key => !['packageDate', 'userDate', 'preset'].includes(key))) throw Error('Invalid expiry choice.');
  const packageDate = fields.packageDate === null ? null : date(fields.packageDate);
  const userDate = fields.userDate === null ? null : date(fields.userDate);
  let preset: ExpirySelection['preset'] = null;
  let estimate: string | null = null;
  if (fields.preset !== null) {
    if (!fields.preset || typeof fields.preset !== 'object' || Array.isArray(fields.preset)) throw Error('Invalid shelf-life estimate.');
    const input = fields.preset as Record<string, unknown>;
    if (Object.keys(input).some(key => !['baseDate', 'days'].includes(key)) || !Number.isInteger(input.days) || Number(input.days) < 1 || Number(input.days) > 365) throw Error('Shelf life must be 1–365 whole days.');
    preset = { baseDate: date(input.baseDate), days: Number(input.days) };
    const end = new Date(`${preset.baseDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + preset.days);
    if (end.getUTCFullYear() > 9999) throw Error('Estimated date is out of range.');
    estimate = end.toISOString().slice(0, 10);
  }
  const expiresOn = packageDate ?? userDate ?? estimate;
  if (!expiresOn) throw Error('Enter a package date, a manual date, or a shelf-life estimate.');
  const estimated = !packageDate && !userDate;
  return { expiresOn, expirySource: packageDate ? 'PACKAGE_DATE' : userDate ? 'USER_ENTERED' : 'PRESET_ESTIMATE',
    freshnessPresetDays: estimated ? preset!.days : null, purchaseDate: estimated ? preset!.baseDate : null,
    selection: { packageDate, userDate, preset } };
}
