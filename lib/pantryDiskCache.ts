import type { PantryItemDto } from '../types/api';
// @ts-expect-error Explicit extension supports Node strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { packageBarcode } from './packageBarcode.ts';

export interface CacheStorage { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void> }
export interface PantryDiskSnapshot { version: 1; scope: string; savedAt: number; items: PantryItemDto[] }
const prefix = 'freshtrack.pantry.copy.v1';
const MAX_CHUNKS = 32;
const TTL = 24 * 60 * 60 * 1000;
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function cleanItem(value: unknown): PantryItemDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_CACHE');
  const row = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = row[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw Error('INVALID_CACHE');
    return value;
  };
  const id = text('id', 36); if (!uuid.test(id)) throw Error('INVALID_CACHE');
  const quantity = text('quantity', 13);
  if (!/^(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(quantity) || !/[1-9]/.test(quantity)) throw Error('INVALID_CACHE');
  const category = text('category', 8), source = text('source', 7), expirySource = text('expirySource', 15);
  if (!['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'].includes(category) ||
      !['MANUAL', 'BARCODE', 'RECEIPT'].includes(source) || !['PACKAGE_DATE', 'USER_ENTERED', 'PRESET_ESTIMATE'].includes(expirySource) ||
      row.status !== 'ACTIVE' || row.currencyCode !== 'INR') throw Error('INVALID_CACHE');
  const cost = row.totalCostMinor;
  if (cost !== null && (!Number.isInteger(cost) || Number(cost) < 0 || Number(cost) > 2_147_483_647)) throw Error('INVALID_CACHE');
  const date = (value: unknown) => resolveExpiry({ packageDate: null, userDate: value, preset: null }).expiresOn;
  const timestamp = (key: string) => {
    const value = text(key, 24);
    if (value.startsWith('0000') || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw Error('INVALID_CACHE');
    return value;
  };
  const days = row.freshnessPresetDays ?? null;
  if (days !== null && (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 365)) throw Error('INVALID_CACHE');
  // Whitelist fields: response extras, tokens, cookies and credentials cannot enter this snapshot.
  if (row.barcode !== undefined && (typeof row.barcode !== 'string' || !packageBarcode(row.barcode))) throw Error('INVALID_CACHE');
  return { id, name: text('name', 120), unit: text('unit', 32), quantity, ...(row.barcode ? { barcode: row.barcode as string } : {}),
    category: category as PantryItemDto['category'], source: source as PantryItemDto['source'],
    expirySource: expirySource as PantryItemDto['expirySource'], expiresOn: date(row.expiresOn),
    purchaseDate: row.purchaseDate == null ? null : date(row.purchaseDate), freshnessPresetDays: days as number | null,
    status: 'ACTIVE', currencyCode: 'INR', totalCostMinor: cost as number | null,
    createdAt: timestamp('createdAt'), updatedAt: timestamp('updatedAt'), daysLeft: 0, freshness: 'fresh' };
}
function snapshot(value: unknown, scope: string, now: number): PantryDiskSnapshot {
  if (!value || typeof value !== 'object') throw Error('INVALID_CACHE');
  const data = value as PantryDiskSnapshot;
  if (data.version !== 1 || data.scope !== scope || scope.length > 512 || !Number.isSafeInteger(data.savedAt) ||
      data.savedAt > now + 60_000 || data.savedAt < now - TTL || !Array.isArray(data.items) || data.items.length > 20) throw Error('INVALID_CACHE');
  const items = data.items.map(cleanItem);
  if (new Set(items.map(item => item.id)).size !== items.length) throw Error('INVALID_CACHE');
  return { version: 1, scope, savedAt: data.savedAt, items };
}
/** Serialized double-buffer commits; a failed write cannot publish partial or mixed chunks. */
export function createPantryDiskCache(storage: CacheStorage, now = Date.now) {
  let queue: Promise<unknown> = Promise.resolve(), revision = 0;
  const run = <T>(task: () => Promise<T>) => { const result = queue.then(task); queue = result.catch(() => undefined); return result; };
  const parse = (value: string | null) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
  const wipeBank = async (bank: number) => {
    // Never trust metadata during deletion: corrupted counts cannot leave private chunks behind.
    for (let index = 0; index < MAX_CHUNKS; index++) await storage.remove(`${prefix}.${bank}.${index}`);
    await storage.remove(`${prefix}.${bank}.meta`);
  };
  const wipe = async () => { await storage.remove(`${prefix}.active`); await wipeBank(0); await wipeBank(1); };
  return {
    clear() { revision++; return run(wipe); },
    save(scope: string, data: { savedAt: number; items: PantryItemDto[] }) {
      const version = revision;
      const safe = snapshot({ version: 1, scope, savedAt: data.savedAt, items: data.items.slice(0, 20) }, scope, now());
      let chunks: string[];
      do {
        const points = Array.from(JSON.stringify(safe)); chunks = [];
        for (let index = 0; index < points.length; index += 400) chunks.push(points.slice(index, index + 400).join(''));
        if (chunks.length <= MAX_CHUNKS) break;
        safe.items.pop();
      } while (safe.items.length);
      return run(async () => {
        if (version !== revision) return false;
        const previous = parse(await storage.get(`${prefix}.active`));
        const bank = previous?.bank === 0 ? 1 : 0;
        await wipeBank(bank);
        for (let index = 0; index < chunks.length; index++) {
          if (version !== revision) return false;
          await storage.set(`${prefix}.${bank}.${index}`, chunks[index]);
        }
        if (version !== revision) return false;
        await storage.set(`${prefix}.active`, JSON.stringify({ version: 1, bank, count: chunks.length }));
        return true;
      });
    },
    load(scope: string) {
      return run(async () => {
        const manifest = await storage.get(`${prefix}.active`);
        const active = parse(manifest);
        if (!active) { if (manifest !== null) await wipe(); return null; }
        try {
          if (active.version !== 1 || ![0, 1].includes(active.bank) || !Number.isInteger(active.count) || active.count < 1 || active.count > MAX_CHUNKS) throw Error('INVALID_CACHE');
          let body = '';
          for (let index = 0; index < active.count; index++) {
            const part = await storage.get(`${prefix}.${active.bank}.${index}`);
            if (part === null || Array.from(part).length > 400) throw Error('INVALID_CACHE');
            body += part;
          }
          return snapshot(parse(body), scope, now());
        } catch { await wipe(); return null; }
      });
    },
  };
}

/** Subscribe synchronously: sign-out invalidates queued writes before React can mount another user. */
export function bindPantryCacheCleanup(session: {
  getSnapshot(): { checking: boolean; status: string; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}, clear: () => Promise<void>) {
  let previous = session.getSnapshot().user?.id || null;
  return session.subscribe(() => {
    const state = session.getSnapshot(), next = state.user?.id || null;
    if (!state.checking && (state.status === 'anonymous' || (previous && next && previous !== next))) void clear().catch(() => undefined);
    if (!state.checking) previous = next;
  });
}
