import type { HouseholdResponse, PantryCreateInput, PantryEditInput, PantryOutcomeInput, PantryItemDto, PantryItemResponse, PaginatedResponse } from '../types/api';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { apiOrigin } from './backendIdentity.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { NeonAuthError } from './neonAuth.ts';
import type { PantryDraft } from './pantry.ts';
// @ts-expect-error Node strip-types tests require explicit extensions; Metro accepts them.
import { PANTRY_CATEGORIES } from './pantry.ts';
import type { PantryItem } from './mock';

export function pantryRetryKey(): string { return `request-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
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
      throw new NeonAuthError('PANTRY_NETWORK', 'Unable to reach your pantry. Check your connection and retry. A save may have completed; retry the unchanged entry to avoid duplicates.');
    } finally { clearTimeout(timeout); }
  }
  return {
    setup: () => request<HouseholdResponse>('/api/v1/households/current', 'POST', {}),
    list: (page = 1) => request<PaginatedResponse<PantryItemDto>>(`/api/v1/pantry?page=${page}&pageSize=50`),
    find: (id: string) => request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}`),
    add: (input: PantryCreateInput, key: string) => request<PantryItemResponse>('/api/v1/pantry', 'POST', input, key),
    edit: (id: string, input: PantryEditInput, key: string) => request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}`, 'PATCH', input, key),
    outcome: (id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) =>
      request<PantryItemResponse>(`/api/v1/pantry/${encodeURIComponent(id)}/${action}`, 'POST', input, key),
  };
}
