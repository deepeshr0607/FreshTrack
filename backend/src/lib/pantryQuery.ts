import type { PantryCategory, PantryListFilters } from '../contracts/api';
import { InvalidApiInput, parsePagination } from './api';
import { householdDate } from './inventoryRules';
import type { Prisma } from '@prisma/client';

export function pantryListQuery(query: URLSearchParams) {
  const keys = ['page', 'pageSize', 'q', 'category', 'freshness', 'sort'];
  for (const key of query.keys()) if (!keys.includes(key) || query.getAll(key).length !== 1) throw new InvalidApiInput('Invalid pantry query.');
  const pages = new URLSearchParams();
  for (const key of ['page', 'pageSize']) if (query.has(key)) pages.set(key, query.get(key)!);
  const filters: PantryListFilters = {};
  if (query.has('q')) {
    const raw = query.get('q')!;
    if (raw.length > 120 || /[\u0000-\u001f\u007f]/.test(raw)) throw new InvalidApiInput('Invalid search.');
    filters.q = raw.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  }
  if (query.has('category')) {
    const category = query.get('category')!;
    if (!['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'].includes(category)) throw new InvalidApiInput('Invalid category filter.');
    filters.category = category as PantryCategory;
  }
  if (query.has('freshness')) {
    const value = query.get('freshness')!;
    if (!['critical', 'caution', 'fresh'].includes(value)) throw new InvalidApiInput('Invalid freshness filter.');
    filters.freshness = value as PantryListFilters['freshness'];
  }
  if (query.has('sort')) {
    const value = query.get('sort')!;
    if (!['expiry', 'name', 'category'].includes(value)) throw new InvalidApiInput('Invalid sort.');
    filters.sort = value as PantryListFilters['sort'];
  }
  return { pagination: parsePagination(pages), filters };
}
export function pantryListWhere(filters: PantryListFilters, timezone: string, now: Date): Prisma.PantryItemWhereInput {
  const today = new Date(`${householdDate(now, timezone)}T00:00:00Z`);
  const day = (offset: number) => new Date(today.getTime() + offset * 86_400_000);
  return {
    // Prisma contains uses LIKE: escape metacharacters to search literal names, not patterns.
    ...(filters.q ? { normalizedName: { contains: filters.q.replace(/[\\%_]/g, '\\$&') } } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.freshness === 'critical' ? { expiresOn: { lte: day(1) } }
      : filters.freshness === 'caution' ? { expiresOn: { gte: day(2), lte: day(6) } }
      : filters.freshness === 'fresh' ? { expiresOn: { gte: day(7) } } : {}),
  };
}
export function pantryListOrder(sort: PantryListFilters['sort']): Prisma.PantryItemOrderByWithRelationInput[] {
  return sort === 'name' ? [{ normalizedName: 'asc' }, { id: 'asc' }]
    : sort === 'category' ? [{ category: 'asc' }, { normalizedName: 'asc' }, { id: 'asc' }]
    : [{ expiresOn: 'asc' }, { id: 'asc' }];
}
/** PostgreSQL enum order is not alphabetic. Page across at most seven category groups. */
export function categoryPageWindows(groups: { category: PantryCategory; count: number }[], skip: number, take: number) {
  const windows: { category: PantryCategory; skip: number; take: number }[] = [];
  for (const group of [...groups].sort((a, b) => a.category.localeCompare(b.category))) {
    if (skip >= group.count) { skip -= group.count; continue; }
    const size = Math.min(take, group.count - skip);
    if (size > 0) windows.push({ category: group.category, skip, take: size });
    take -= size; skip = 0;
    if (!take) break;
  }
  return windows;
}
