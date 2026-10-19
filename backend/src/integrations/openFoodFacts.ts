import type { BarcodeLookup } from '../contracts/api';
import { packageBarcode } from '../contracts/barcode';
import { InvalidApiInput } from '../lib/api';

export class BarcodeProviderFailure extends Error {
  constructor(readonly code: 'BARCODE_NOT_CONFIGURED' | 'BARCODE_RATE_LIMITED' | 'BARCODE_TIMEOUT' | 'BARCODE_UNAVAILABLE') { super(code); }
}
export interface BarcodeProvider { lookup(barcode: string): Promise<BarcodeLookup> }
const unavailable = () => new BarcodeProviderFailure('BARCODE_UNAVAILABLE');
export function validLookupBarcode(value: unknown): string {
  if (typeof value !== 'string' || value !== value.trim() || !packageBarcode(value)) throw new InvalidApiInput('Invalid retail barcode.');
  return value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable();
  return value as Record<string, unknown>;
}
function optionalText(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u001f\u007f<>]/.test(value)) throw unavailable();
  return value.normalize('NFC').trim().replace(/\s+/g, ' ') || null;
}
function emptyResult(barcode: string, environment: 'staging' | 'production'): BarcodeLookup {
  return { barcode, status: 'NOT_FOUND', product: null, source: { provider: 'OPEN_FOOD_FACTS',
    url: `https://world.openfoodfacts.${environment === 'staging' ? 'net' : 'org'}/product/${barcode}`,
    license: 'ODbL-1.0', confidence: 'COMMUNITY_UNVERIFIED', environment } };
}
export function parseBarcodeProduct(value: unknown, barcode: string, environment: 'staging' | 'production'): BarcodeLookup {
  const row = object(value);
  // A provider error or schema change must not masquerade as an unknown product.
  if (row['status'] !== 'success' && row['status'] !== 'success_with_warnings') throw unavailable();
  const product = object(row['product']);
  const catalogCode = product['code'];
  if (typeof catalogCode !== 'string' || !packageBarcode(catalogCode) || catalogCode.padStart(14, '0') !== barcode.padStart(14, '0')) throw unavailable();
  const result = emptyResult(barcode, environment);
  const name = optionalText(product['product_name'], 160);
  if (!name) return { ...result, status: 'INCOMPLETE' };
  return { ...result, status: 'FOUND', product: { catalogBarcode: catalogCode, name,
    brand: optionalText(product['brands'], 240), packageSize: optionalText(product['quantity'], 120),
    categoryLabel: optionalText(product['categories'], 1000) } };
}

/** Fixed read-only hosts; no account, receipt or Pantry fields reach the provider. */
export function createOpenFoodFactsProvider(options: { userAgent?: () => string | undefined;
  environment?: () => string | undefined; fetch?: typeof fetch; now?: () => number; timeoutMs?: number } = {}): BarcodeProvider {
  const transport = options.fetch ?? fetch, now = options.now ?? Date.now;
  const agent = options.userAgent ?? (() => process.env['OPEN_FOOD_FACTS_USER_AGENT']);
  const environment = options.environment ?? (() => process.env['OPEN_FOOD_FACTS_ENV'] ?? 'staging');
  const cache = new Map<string, { result: BarcodeLookup; until: number }>();
  const pending = new Map<string, Promise<BarcodeLookup>>();
  let nextRequest = 0, activeConfig = '';
  return { async lookup(input) {
    const barcode = validLookupBarcode(input), userAgent = agent()?.trim() ?? '', env = environment();
    if (!/^FreshTrack\/[0-9.]+ \([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\)$/.test(userAgent) ||
        userAgent.length > 240 || /example\.(com|org|net)|\.test\)/i.test(userAgent) || !['staging', 'production'].includes(env ?? '')) {
      throw new BarcodeProviderFailure('BARCODE_NOT_CONFIGURED');
    }
    const selected = env as 'staging' | 'production', config = `${selected}:${userAgent}`;
    if (config !== activeConfig) { cache.clear(); pending.clear(); activeConfig = config; }
    const key = `${config}:${barcode}`, cached = cache.get(key);
    if (cached && cached.until > now()) return structuredClone(cached.result);
    cache.delete(key);
    const waiting = pending.get(key); if (waiting) return structuredClone(await waiting);
    // Twelve upstream calls/minute/process maximum; serverless processes do not share this guard.
    if (nextRequest > now()) throw new BarcodeProviderFailure('BARCODE_RATE_LIMITED');
    nextRequest = now() + 5000;
    const operation = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
      try {
        const url = new URL(`/api/v3/product/${barcode}`, `https://world.openfoodfacts.${selected === 'staging' ? 'net' : 'org'}`);
        url.search = new URLSearchParams({ fields: 'code,product_name,brands,quantity,categories', product_type: 'food', lc: 'en' }).toString();
        const response = await transport(url, { headers: { Accept: 'application/json', 'User-Agent': userAgent,
          ...(selected === 'staging' ? { Authorization: 'Basic b2ZmOm9mZg==' } : {}) }, signal: controller.signal, redirect: 'error' });
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') ?? '';
          const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : (Date.parse(retryAfter) - now()) / 1000;
          nextRequest = Math.max(nextRequest, now() + Math.min(86400, Math.max(60, Number.isFinite(seconds) ? seconds : 60)) * 1000);
          await response.body?.cancel(); throw new BarcodeProviderFailure('BARCODE_RATE_LIMITED');
        }
        if (!response.ok && response.status !== 404) { await response.body?.cancel(); throw unavailable(); }
        if (!response.headers.get('content-type')?.toLowerCase().includes('application/json') || Number(response.headers.get('content-length') || 0) > 64000) {
          await response.body?.cancel(); throw unavailable();
        }
        const reader = response.body?.getReader(); if (!reader) throw unavailable();
        const parts: Uint8Array[] = []; let size = 0;
        while (true) {
          const part = await reader.read(); if (part.done) break;
          size += part.value.byteLength;
          if (size > 64000) { await reader.cancel(); throw unavailable(); }
          parts.push(part.value);
        }
        const row: unknown = JSON.parse(Buffer.concat(parts).toString('utf8'));
        let result: BarcodeLookup;
        if (response.status === 404) {
          const error = object(row), reason = object(error['result']);
          if (error['status'] !== 'failure' || !['product_not_found', 'en:product-not-found'].includes(String(reason['id']))) throw unavailable();
          result = emptyResult(barcode, selected);
        } else result = parseBarcodeProduct(row, barcode, selected);
        if (activeConfig === config) {
          while (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(key, { result, until: now() + (result.status === 'FOUND' ? 300000 : 60000) });
        }
        return result;
      } catch (error) {
        if (error instanceof BarcodeProviderFailure) throw error;
        throw new BarcodeProviderFailure(controller.signal.aborted ? 'BARCODE_TIMEOUT' : 'BARCODE_UNAVAILABLE');
      } finally { clearTimeout(timeout); }
    })();
    pending.set(key, operation);
    try { return structuredClone(await operation); } finally { if (pending.get(key) === operation) pending.delete(key); }
  } };
}
