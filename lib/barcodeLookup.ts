import type { BarcodeLookup } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { packageBarcode } from './packageBarcode.ts';

export function barcodeLookupResult(value: unknown, code: string): BarcodeLookup {
  const data = value as BarcodeLookup;
  const text = (value: unknown, max: number, nullable = false) => nullable && value === null || typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f<>]/.test(value);
  if (!data || data.barcode !== code || !['FOUND', 'NOT_FOUND', 'INCOMPLETE'].includes(data.status) ||
      !data.source || data.source.provider !== 'OPEN_FOOD_FACTS' || data.source.license !== 'ODbL-1.0' || data.source.confidence !== 'COMMUNITY_UNVERIFIED' ||
      !['staging', 'production'].includes(data.source.environment) ||
      data.source.url !== `https://world.openfoodfacts.${data.source.environment === 'staging' ? 'net' : 'org'}/product/${code}`) throw Error('INVALID_BARCODE_RESPONSE');
  if (data.status === 'FOUND') {
    const row = data.product;
    if (!row || typeof row.catalogBarcode !== 'string' || !packageBarcode(row.catalogBarcode) || row.catalogBarcode.padStart(14, '0') !== code.padStart(14, '0') ||
        !text(row.name, 160) || !text(row.brand, 240, true) || !text(row.packageSize, 120, true) || !text(row.categoryLabel, 1000, true)) throw Error('INVALID_BARCODE_RESPONSE');
  } else if (data.product !== null) throw Error('INVALID_BARCODE_RESPONSE');
  return data;
}
