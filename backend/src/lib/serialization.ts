import type { EntryCost } from '../contracts/api';
import { InvalidApiInput } from './api';

const MAX_MINOR = 2_147_483_647;
export function minorAmount(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_MINOR) {
    throw new InvalidApiInput('Invalid monetary amount.');
  }
  return value;
}

/** Human INR text to paise, using integer arithmetic; null/unknown is handled separately. */
export function rupeesToPaise(value: string): number {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value)) {
    throw new InvalidApiInput('Use a nonnegative rupee amount with at most two decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  return minorAmount(Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) as number;
}

export function paiseToRupees(value: number): string {
  const amount = minorAmount(value);
  if (amount === null) throw new InvalidApiInput('Unknown cost has no numeric display.');
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}

export function serializeCost(value: EntryCost): EntryCost {
  const unitCostMinor = minorAmount(value.unitCostMinor), totalCostMinor = minorAmount(value.totalCostMinor);
  if (value.currencyCode !== 'INR' || !['UNKNOWN', 'PURCHASE', 'ESTIMATE'].includes(value.costSource) ||
      (value.costSource === 'UNKNOWN' ? unitCostMinor !== null || totalCostMinor !== null : totalCostMinor === null)) {
    throw new InvalidApiInput('Invalid cost provenance.');
  }
  return { currencyCode: 'INR', unitCostMinor, totalCostMinor, costSource: value.costSource };
}

/** Decimal(12,3) as canonical positive text; never convert quantities through JS numbers. */
export function quantityString(value: string): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(value)) throw new InvalidApiInput('Invalid quantity.');
  const normalized = value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
  if (normalized === '0') throw new InvalidApiInput('Quantity must be positive.');
  return normalized;
}
