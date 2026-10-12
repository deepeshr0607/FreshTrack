import type { HouseholdResponse, PantryCreateInput, PantryEditInput, PantryOutcomeInput, PantryBatchInput, PantryBatchOutcomeInput, PantryBatchResponse, PantryItemDto, PantryItemResponse, PantryListFilters, PantryListResponse, PantryDuplicateResponse } from '../types/api';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { apiOrigin } from './backendIdentity.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { NeonAuthError } from './neonAuth.ts';
import type { PantryDraft } from './pantry.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { PANTRY_CATEGORIES } from './pantry.ts';
import type { PantryItem } from './mock';

/** Stable criteria identity for debounce, paging and stale-response protection. */
export function pantryFilterKey(filters: PantryListFilters): string {
  return JSON.stringify([filters.q?.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() || '',
    filters.category || '', filters.freshness || '', filters.sort || 'expiry']);
}
export function pantryRetryKey(): string { return `request-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
/** A replay returns current state; do not announce success if a subsequent action superseded it. */
export function requirePantryStatus(items: PantryItemDto[], expected: PantryItemDto['status']): void {
  if (!items.length || items.some(item => item.status !== expected)) throw new NeonAuthError('PANTRY_CHANGED', 'A newer action changed these groceries. Reload before trying again.');
}
/** Adapter only for existing card/confirmation visuals; wire quantities/costs remain exact. */
export function pantryCardItem(item: PantryItemDto): PantryItem {
  const category = PANTRY_CATEGORIES.find(entry => entry.name.toUpperCase() === item.category)!;
  return { ...item, category: category.name, quantity: Number(item.quantity), price: (item.totalCostMinor ?? 0) / 100, imageEmoji: category.emoji };
}

export function manualPantryInput(draft: PantryDraft): PantryCreateInput {
  const quantity = draft.quantity.trim().replace(',', '.');
  const price = draft.price.trim().replace(',', '.');
  if (!/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(quantity) || !/[1-9]/.test(quantity)) throw new NeonAuthError('INVALID_REQUEST', 'Use a positive quantity with up to three decimal places.');
  if (price && !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(price)) throw new NeonAuthError('INVALID_REQUEST', 'Use a rupee value with up to two decimal places.');
  const [whole, fraction = ''] = price.split('.');
  const minor = price ? Number(whole) * 100 + Number(fraction.padEnd(2, '0')) : null;
  if (minor !== null && minor > 2_147_483_647) throw new NeonAuthError('INVALID_REQUEST', 'Purchase value is too large.');
  return { name: draft.name.trim(), category: draft.category.toUpperCase() as PantryCreateInput['category'],
    quantity, unit: draft.unit.trim(), expiresOn: draft.expiresOn, totalCostMinor: minor };
}
export function rupeeValue(minor: number | null): string {
  return minor === null ? 'Unknown value' : `₹${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function createPantryApi(baseUrl: string | undefined, getToken: () => Promise<string>, allowLocalHttp = false, fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
    const origin = apiOrigin(baseUrl, allowLocalHttp);
    const token = await getToken();
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetcher(origin + path, { method, headers: { Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}), credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) {
        if (response.status === 409) {
          let code: unknown;
          try { code = (await response.json())?.error?.code; } catch { /* Keep malformed responses private. */ }
          if (code === 'PANTRY_DUPLICATE') throw new NeonAuthError('PANTRY_DUPLICATE', 'A matching purchase was found. Review it before adding separately.');
        }
        const message = response.status === 401 ? 'Your session was rejected. Sign in again.'
          : response.status === 400 ? 'Check the item fields: name, unit, quantity, date and purchase value.'
          : response.status === 404 ? 'This item is unavailable in your household.'
          : response.status === 409 ? 'This item or request changed. Reload the item before saving or confirming again.'
          : 'The pantry service is unavailable. Please retry.';
        throw new NeonAuthError(`PANTRY_HTTP_${response.status}`, message);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof NeonAuthError) throw error;
      throw new NeonAuthError('PANTRY_NETWORK', 'Unable to reach your pantry. Check your connection and retry.' + (key ? ' A save may have completed; retry the unchanged entry to avoid duplicates.' : ''));
    } finally { clearTimeout(timeout); }
  }
  return {
    setup: () => request<HouseholdResponse>('/api/v1/households/current', 'POST', {}),
    list: (page = 1, filters: PantryListFilters = {}) => {
      const query = new URLSearchParams({ page: String(page), pageSize: '50' });
      for (const key of ['q', 'category', 'freshness', 'sort'] as const) if (filters[key]) query.set(key, filters[key]!);
      return request<PantryListResponse>(`/api/v1/pantry?${query}`);
    },
    find: (id: string) => request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}`),
    duplicates: (input: PantryCreateInput) => request<PantryDuplicateResponse>('/api/v1/pantry/duplicate-check', 'POST', input),
    add: (input: PantryCreateInput, key: string) => request<PantryItemResponse>('/api/v1/pantry', 'POST', input, key),
    edit: (id: string, input: PantryEditInput, key: string) => request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}`, 'PATCH', input, key),
    outcome: (id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) =>
      request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}/${action}`, 'POST', input, key),
    undo: (id: string, input: PantryOutcomeInput, key: string) => request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}/undo-status`, 'POST', input, key),
    batchOutcome: (input: PantryBatchOutcomeInput, key: string) => request<PantryBatchResponse>('/api/v1/pantry/batch-outcome', 'POST', input, key),
    batchUndo: (input: PantryBatchInput, key: string) => request<PantryBatchResponse>('/api/v1/pantry/batch-undo', 'POST', input, key),
  };
}
