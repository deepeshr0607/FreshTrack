import type { PantryItemDto, PantryListFilters, PantryInventoryCounts } from '../types/api';
// @ts-expect-error Explicit extension supports Node strip-types tests and Metro.
import { kolkataToday } from './pantryExpiry.ts';

export function cacheablePantryFailure(code: string): boolean {
  return ['NETWORK', 'PANTRY_NETWORK', 'PANTRY_HTTP_500', 'PANTRY_HTTP_502', 'PANTRY_HTTP_503', 'PANTRY_HTTP_504'].includes(code);
}
/** Session-only, identity/branch scoped, bounded cache. It never grants authentication. */
export function createPantryReadCache(owner: string) {
  const rows = new Map<string, PantryItemDto>();
  let savedAt: number | null = null;
  const current = (item: PantryItemDto, today: string): PantryItemDto => {
    const daysLeft = (Date.parse(`${item.expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
    return { ...item, daysLeft, freshness: daysLeft < 0 ? 'expired' : daysLeft <= 1 ? 'critical' : daysLeft <= 6 ? 'caution' : 'fresh' };
  };
  return {
    clear() { rows.clear(); savedAt = null; },
    remember(scope: string, items: PantryItemDto[], replace = false, now = new Date()) {
      if (scope !== owner) return;
      if (replace) rows.clear();
      for (const item of items) {
        if (item.status !== 'ACTIVE') { rows.delete(item.id); continue; }
        const previous = rows.get(item.id);
        if (previous && Date.parse(previous.updatedAt) > Date.parse(item.updatedAt)) continue;
        rows.delete(item.id); rows.set(item.id, { ...item });
      }
      while (rows.size > 200) rows.delete(rows.keys().next().value!);
      savedAt = now.getTime();
    },
    remove(scope: string, ids: string[]) { if (scope === owner) ids.forEach(id => rows.delete(id)); },
    find(scope: string, id: string, now = new Date()) {
      const item = scope === owner ? rows.get(id) : null;
      return item ? current(item, kolkataToday(now)) : null;
    },
    read(scope: string, filters: PantryListFilters, now = new Date()) {
      if (scope !== owner || savedAt === null) return null;
      const today = kolkataToday(now);
      const all = [...rows.values()].map(item => current(item, today));
      const q = filters.q?.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() || '';
      const items = all.filter(item => (!q || item.name.toLowerCase().includes(q)) &&
        (!filters.category || filters.category === item.category) &&
        (!filters.freshness || (filters.freshness === 'critical' ? item.daysLeft <= 1 : filters.freshness === 'caution' ? item.daysLeft >= 2 && item.daysLeft <= 6 : item.daysLeft >= 7)))
        .sort((a, b) => filters.sort === 'category' ? a.category.localeCompare(b.category) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id)
          : filters.sort === 'name' ? a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id) : a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id));
      const inventory: PantryInventoryCounts = { active: all.length, categories: {} };
      all.forEach(item => { inventory.categories[item.category] = (inventory.categories[item.category] || 0) + 1; });
      return { items, inventory, total: items.length, savedAt };
    },
  };
}
